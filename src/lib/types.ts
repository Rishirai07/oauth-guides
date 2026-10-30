// One schema for every guide, whether it was written by hand or by the agent.
// Every claim that matters carries a confidence label so a reader can tell
// "we hit this endpoint" apart from "a blog post said so".

export type Confidence =
  | "tested" // observed directly by a live probe (HTTP request we made)
  | "documented" // stated in the provider's own docs / changelog
  | "community" // third-party source (vendor blog, forum, integration platform docs)
  | "inferred"; // reasoned from other facts, not directly sourced

export type Difficulty = "easy" | "moderate" | "hard" | "very_hard";

export type Owner = "agent" | "you" | "agent_assist";

export interface Step {
  title: string;
  detail: string;
  owner: Owner;
  time?: string;
  links?: string[];
  confidence: Confidence;
  sourceIds?: number[];
}

export interface Phase {
  title: string;
  goal: string;
  steps: Step[];
}

export interface Mode {
  name: string;
  whatYouGet: string;
  limits: string;
  reviewNeeded: string;
}

export interface Gotcha {
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  confidence: Confidence;
  sourceIds?: number[];
}

export interface Source {
  id: number;
  title: string;
  url: string;
  kind: "official" | "third_party";
  note?: string;
}

export interface TestedCheck {
  check: string;
  result: string;
  ok: boolean;
  at: string;
}

export interface Guide {
  slug: string;
  name: string;
  website: string;
  category: string;
  tagline: string;
  origin: "curated" | "agent";
  updatedAt: string;
  model?: string;

  verdict: {
    difficulty: Difficulty;
    headline: string;
    why: string;
  };
  effort: {
    handsOn: string;
    approvalWait: string;
    timeToFirstConnection: string;
    timeToProduction: string;
    cost: string;
  };
  modes: Mode[];
  prerequisites: { item: string; why: string; required: boolean }[];
  phases: Phase[];
  approval: {
    required: "no" | "conditional" | "yes";
    trigger: string;
    process: string[];
    typicalWait: string;
    confidence: Confidence;
  };
  gotchas: Gotcha[];
  blockers: { symptom: string; cause: string; fix: string }[];
  handoff: { agentCan: string[]; youMust: string[] };
  oauth: {
    authorizeUrl?: string;
    tokenUrl?: string;
    pkce?: string;
    refreshTokens?: string;
    accessTokenLifetime?: string;
    redirectUris?: string;
    scopesNote?: string;
    discovery?: string;
  };
  sources: Source[];
  tested: TestedCheck[];
  uncertain: string[];
  reviewNotes?: string[];
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  very_hard: "Very hard",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  tested: "Tested live",
  documented: "Provider docs",
  community: "Third-party source",
  inferred: "Inferred",
};

export const OWNER_LABEL: Record<Owner, string> = {
  agent: "Agent can do",
  agent_assist: "Agent drafts, you submit",
  you: "You must do",
};

// Events streamed from /api/generate to the browser.
export type AgentEvent =
  | { type: "stage"; stage: string; label: string }
  | { type: "log"; message: string; detail?: string }
  | { type: "probe"; check: TestedCheck }
  | { type: "source"; source: { title: string; url: string } }
  | { type: "guide"; guide: Guide; stored: boolean }
  | { type: "error"; message: string };
