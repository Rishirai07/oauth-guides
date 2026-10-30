// JSON Schema handed to Gemini for structured output, and a normalizer that makes
// whatever comes back safe to render (fills defaults, clamps enums).

import type { Confidence, Guide, Owner } from "../types";

const confidence = { type: "string", enum: ["documented", "community", "inferred"] };
const str = { type: "string" };
const strArr = { type: "array", items: str };
const ids = { type: "array", items: { type: "integer" } };

export const guideSchema = {
  type: "object",
  properties: {
    name: str,
    website: str,
    category: str,
    tagline: str,
    verdict: {
      type: "object",
      properties: {
        difficulty: { type: "string", enum: ["easy", "moderate", "hard", "very_hard"] },
        headline: str,
        why: str,
      },
      required: ["difficulty", "headline", "why"],
    },
    effort: {
      type: "object",
      properties: { handsOn: str, approvalWait: str, timeToFirstConnection: str, timeToProduction: str, cost: str },
      required: ["handsOn", "approvalWait", "timeToFirstConnection", "timeToProduction", "cost"],
    },
    modes: {
      type: "array",
      items: {
        type: "object",
        properties: { name: str, whatYouGet: str, limits: str, reviewNeeded: str },
        required: ["name", "whatYouGet", "limits", "reviewNeeded"],
      },
    },
    prerequisites: {
      type: "array",
      items: { type: "object", properties: { item: str, why: str, required: { type: "boolean" } }, required: ["item", "why", "required"] },
    },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: str,
          goal: str,
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: str,
                detail: str,
                owner: { type: "string", enum: ["agent", "you", "agent_assist"] },
                time: str,
                links: strArr,
                confidence,
                sourceIds: ids,
              },
              required: ["title", "detail", "owner", "confidence"],
            },
          },
        },
        required: ["title", "goal", "steps"],
      },
    },
    approval: {
      type: "object",
      properties: {
        required: { type: "string", enum: ["no", "conditional", "yes"] },
        trigger: str,
        process: strArr,
        typicalWait: str,
        confidence,
      },
      required: ["required", "trigger", "process", "typicalWait", "confidence"],
    },
    gotchas: {
      type: "array",
      items: {
        type: "object",
        properties: { title: str, detail: str, impact: { type: "string", enum: ["high", "medium", "low"] }, confidence, sourceIds: ids },
        required: ["title", "detail", "impact", "confidence"],
      },
    },
    blockers: {
      type: "array",
      items: { type: "object", properties: { symptom: str, cause: str, fix: str }, required: ["symptom", "cause", "fix"] },
    },
    handoff: { type: "object", properties: { agentCan: strArr, youMust: strArr }, required: ["agentCan", "youMust"] },
    oauth: {
      type: "object",
      properties: {
        authorizeUrl: str,
        tokenUrl: str,
        pkce: str,
        refreshTokens: str,
        accessTokenLifetime: str,
        redirectUris: str,
        scopesNote: str,
        discovery: str,
      },
    },
    uncertain: strArr,
  },
  required: ["name", "website", "category", "tagline", "verdict", "effort", "modes", "prerequisites", "phases", "approval", "gotchas", "blockers", "handoff", "oauth", "uncertain"],
};

export const critiqueSchema = {
  type: "object",
  properties: {
    corrections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          target: { type: "string", description: "Exact title of the step or gotcha, or a field path like effort.approvalWait" },
          problem: str,
          newConfidence: { type: "string", enum: ["documented", "community", "inferred", "unchanged"] },
          replacementText: { type: "string", description: "Corrected text for that field/detail, or empty to keep" },
        },
        required: ["target", "problem", "newConfidence", "replacementText"],
      },
    },
    uncertain: strArr,
    summary: str,
  },
  required: ["corrections", "uncertain", "summary"],
};

const DIFF = ["easy", "moderate", "hard", "very_hard"] as const;
const OWN: Owner[] = ["agent", "you", "agent_assist"];
const CONF: Confidence[] = ["tested", "documented", "community", "inferred"];

const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const confAny = (v: unknown): Confidence => (CONF.includes(v as Confidence) ? (v as Confidence) : "inferred");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeGuide(raw: any, base: Pick<Guide, "slug" | "origin" | "updatedAt"> & Partial<Guide>): Guide {
  const r = raw && typeof raw === "object" ? raw : {};
  // Only real HTTP probes may be "tested". A model claiming it tested something gets downgraded.
  const conf = (v: unknown): Confidence => {
    const c = confAny(v);
    return c === "tested" && base.origin === "agent" ? "inferred" : c;
  };
  return {
    slug: base.slug,
    origin: base.origin,
    updatedAt: base.updatedAt,
    model: base.model,
    name: s(r.name, base.name || base.slug),
    website: s(r.website, base.website || ""),
    category: s(r.category, "Other"),
    tagline: s(r.tagline),
    verdict: {
      difficulty: DIFF.includes(r.verdict?.difficulty) ? r.verdict.difficulty : "moderate",
      headline: s(r.verdict?.headline),
      why: s(r.verdict?.why),
    },
    effort: {
      handsOn: s(r.effort?.handsOn, "Unknown"),
      approvalWait: s(r.effort?.approvalWait, "Unknown"),
      timeToFirstConnection: s(r.effort?.timeToFirstConnection, "Unknown"),
      timeToProduction: s(r.effort?.timeToProduction, "Unknown"),
      cost: s(r.effort?.cost, "Unknown"),
    },
    modes: arr<Record<string, unknown>>(r.modes).map((m) => ({
      name: s(m.name),
      whatYouGet: s(m.whatYouGet),
      limits: s(m.limits),
      reviewNeeded: s(m.reviewNeeded),
    })),
    prerequisites: arr<Record<string, unknown>>(r.prerequisites).map((p) => ({ item: s(p.item), why: s(p.why), required: Boolean(p.required) })),
    phases: arr<Record<string, unknown>>(r.phases).map((p) => ({
      title: s(p.title),
      goal: s(p.goal),
      steps: arr<Record<string, unknown>>(p.steps).map((st) => ({
        title: s(st.title),
        detail: s(st.detail),
        owner: OWN.includes(st.owner as Owner) ? (st.owner as Owner) : "you",
        time: s(st.time) || undefined,
        links: arr<string>(st.links).filter((l) => typeof l === "string" && l.startsWith("http")),
        confidence: conf(st.confidence),
        sourceIds: arr<number>(st.sourceIds).filter((n) => typeof n === "number"),
      })),
    })),
    approval: {
      required: ["no", "conditional", "yes"].includes(r.approval?.required) ? r.approval.required : "conditional",
      trigger: s(r.approval?.trigger),
      process: arr<string>(r.approval?.process).filter((x) => typeof x === "string"),
      typicalWait: s(r.approval?.typicalWait, "Unknown"),
      confidence: conf(r.approval?.confidence),
    },
    gotchas: arr<Record<string, unknown>>(r.gotchas).map((g) => ({
      title: s(g.title),
      detail: s(g.detail),
      impact: (["high", "medium", "low"].includes(g.impact as string) ? g.impact : "medium") as "high" | "medium" | "low",
      confidence: conf(g.confidence),
      sourceIds: arr<number>(g.sourceIds).filter((n) => typeof n === "number"),
    })),
    blockers: arr<Record<string, unknown>>(r.blockers).map((b) => ({ symptom: s(b.symptom), cause: s(b.cause), fix: s(b.fix) })),
    handoff: {
      agentCan: arr<string>(r.handoff?.agentCan).filter((x) => typeof x === "string"),
      youMust: arr<string>(r.handoff?.youMust).filter((x) => typeof x === "string"),
    },
    oauth: Object.fromEntries(
      Object.entries(r.oauth || {}).filter(([, v]) => typeof v === "string" && v.trim()),
    ) as Guide["oauth"],
    sources: base.sources || [],
    tested: base.tested || [],
    uncertain: arr<string>(r.uncertain).filter((x) => typeof x === "string"),
    reviewNotes: base.reviewNotes,
  };
}
