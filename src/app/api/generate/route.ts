import { runAgent } from "@/lib/agent/pipeline";
import { runMockAgent } from "@/lib/agent/mock";
import { saveGuide } from "@/lib/store";
import { curatedBySlug } from "@/data/guides";
import type { AgentEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Per-IP limit so a public link can't burn through the API key. It's in-memory,
// so on serverless it's per instance: a speed bump, not a guarantee.
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
function limited(ip: string) {
  const now = Date.now();
  const max = Number(process.env.GENERATE_LIMIT_PER_10MIN) || 6;
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { query?: unknown } | null;
  const q = (typeof body?.query === "string" ? body.query : "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (q.length < 2) return Response.json({ error: "Enter an app name or website." }, { status: 400 });
  if (!/[a-z0-9]/i.test(q)) return Response.json({ error: "That doesn't look like an app name or website." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "Rate limit: try again in a few minutes." }, { status: 429 });

  const mock = process.env.MOCK_AGENT === "1";
  if (!mock && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return Response.json({ error: "Live generation isn't configured on this server (GEMINI_API_KEY is missing)." }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          /* client went away */
        }
      };
      // Keep proxies from closing an idle stream during long model calls.
      const ping = setInterval(() => emit({ type: "log", message: "" }), 15000);
      try {
        const guide = mock
          ? await runMockAgent(q, emit)
          : await runAgent(q, emit, { reservedSlugs: new Set(Object.keys(curatedBySlug)) });
        const stored = await saveGuide(guide);
        emit({ type: "guide", guide, stored });
      } catch (e) {
        emit({ type: "error", message: friendlyError(e) });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}

// Raw SDK errors are long JSON blobs; turn the common ones into something a person can act on.
function friendlyError(e: unknown): string {
  const msg = String((e as Error)?.message || e || "");
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg)) return "The server's Gemini API key was rejected. Check GEMINI_API_KEY.";
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return "Gemini's rate limit or free-tier quota was hit. Wait a minute and try again.";
  if (/not found|404|unsupported model/i.test(msg)) return "None of the configured Gemini models are available to this key. Set GEMINI_MODEL to a model listed in AI Studio.";
  if (/fetch failed|ECONN|ETIMEDOUT|network/i.test(msg)) return "Couldn't reach the Gemini API. Try again in a moment.";
  if (msg.length > 0 && msg.length < 200 && !msg.trim().startsWith("{")) return msg;
  return "Something went wrong while generating the guide. Try again, or try the app's website instead of its name.";
}
