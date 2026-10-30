import { GoogleGenAI } from "@google/genai";
import { resolveRedirect } from "./web";

// Gemini model IDs get renamed and retired often, so try the configured one
// first and fall back to a few known names.
const DEFAULT_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"];

export function modelChain(): string[] {
  const env = (process.env.GEMINI_MODEL || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...env, ...DEFAULT_MODELS])];
}

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  // GEMINI_BASE_URL is only for tests (points the SDK at a local fake server).
  const baseUrl = process.env.GEMINI_BASE_URL;
  return (client ??= new GoogleGenAI({ apiKey: key, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) }));
}

export interface GenResult {
  text: string;
  model: string;
  sources: { title: string; url: string }[];
  queries: string[];
  searched: boolean;
}

export interface GenOptions {
  system?: string;
  prompt: string;
  search?: boolean;
  json?: { schema: unknown };
  temperature?: number;
}

// Shared across calls in a run, so we don't keep retrying a model or tool that already failed.
export const runtimeState = { searchBroken: false, workingModel: "" as string };

function isModelMissing(e: unknown) {
  const s = String((e as Error)?.message || e);
  return /not found|404|is not supported for|unsupported model|no longer available|deprecated/i.test(s);
}
function isToolProblem(e: unknown) {
  const s = String((e as Error)?.message || e);
  return /google_search|googleSearch|tool|grounding/i.test(s) && /not supported|not available|invalid|permission|quota/i.test(s);
}
// Free keys get "limit: 0" for models that aren't on the free tier.
function isZeroQuota(e: unknown) {
  return /limit:\s*0\b/i.test(String((e as Error)?.message || e));
}
function shortError(e: unknown) {
  const s = String((e as Error)?.message || e);
  const m = s.match(/"message"\s*:\s*"([^"]{0,300})/);
  return (m ? m[1] : s).replace(/\s+/g, " ").slice(0, 300);
}
function isRateLimit(e: unknown) {
  const s = String((e as Error)?.message || e);
  return /429|RESOURCE_EXHAUSTED|rate limit|quota/i.test(s);
}

export async function generate(opts: GenOptions): Promise<GenResult> {
  const models = runtimeState.workingModel ? [runtimeState.workingModel, ...modelChain()] : modelChain();
  let lastErr: unknown;
  let useSearch = Boolean(opts.search) && !runtimeState.searchBroken;

  for (const model of [...new Set(models)]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await ai().models.generateContent({
          model,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.system,
            temperature: opts.temperature ?? 0.2,
            tools: useSearch ? [{ googleSearch: {} }] : undefined,
            ...(opts.json ? { responseMimeType: "application/json", responseJsonSchema: opts.json.schema } : {}),
          },
        });
        runtimeState.workingModel = model;
        const cand = res.candidates?.[0];
        const gm = cand?.groundingMetadata;
        const raw = (gm?.groundingChunks || [])
          .map((c) => c.web)
          .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri));
        const sources = await Promise.all(
          raw.slice(0, 12).map(async (w) => ({ title: w.title || "", url: await resolveRedirect(w.uri) })),
        );
        return {
          text: res.text || "",
          model,
          sources,
          queries: gm?.webSearchQueries || [],
          searched: useSearch,
        };
      } catch (e) {
        lastErr = e;
        if (useSearch && (isToolProblem(e) || isRateLimit(e))) {
          if (!runtimeState.searchBroken) console.log("[gemini] Google Search isn't available on this key; continuing without it.");
          // Search grounding has its own (often zero) quota on free keys.
          // Retry the same model without it; the agent falls back to fetching docs itself.
          runtimeState.searchBroken = true;
          useSearch = false;
          continue;
        }
        console.error(`[gemini] ${model} failed: ${shortError(e)}`);
        if (isModelMissing(e) || isZeroQuota(e)) break; // this model isn't usable with this key
        if (isRateLimit(e) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        break; // try the next model
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function extractJson<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON object in model output");
  return JSON.parse(body.slice(start, end + 1)) as T;
}
