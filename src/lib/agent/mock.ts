// MOCK_AGENT=1 plays back a fake agent run without calling Gemini. Handy for
// UI work, or for demoing when there's no API key.

import type { AgentEvent, Guide } from "../types";
import { notion } from "@/data/guides/notion";
import { slugify } from "./pipeline";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runMockAgent(query: string, emit: (e: AgentEvent) => void): Promise<Guide> {
  const name = query.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[./]/)[0];
  const pretty = name.charAt(0).toUpperCase() + name.slice(1);
  emit({ type: "stage", stage: "identify", label: "Identifying the app and its developer docs" });
  await wait(700);
  emit({ type: "log", message: `Identified: ${pretty} (mock)`, detail: "MOCK_AGENT=1, so no model calls are made" });
  emit({ type: "stage", stage: "gather", label: "Reading official docs and probing live OAuth endpoints" });
  await wait(700);
  emit({ type: "source", source: { title: `${pretty} developer docs (mock)`, url: `https://developers.${name}.com/` } });
  emit({ type: "probe", check: { check: `OIDC discovery at https://${name}.com`, ok: false, at: new Date().toISOString(), result: "HTTP 404 (mock)" } });
  emit({ type: "stage", stage: "investigate", label: "Three investigators digging into setup, approval and limits" });
  await wait(900);
  for (const t of ["Setup", "Approval", "Tokens & gotchas"]) {
    emit({ type: "log", message: `${t} investigator finished` });
    await wait(300);
  }
  emit({ type: "stage", stage: "write", label: "Writing the guide" });
  await wait(700);
  emit({ type: "stage", stage: "review", label: "Fact-checking the guide against the evidence" });
  await wait(500);
  return {
    ...structuredClone(notion),
    slug: `${slugify(pretty)}-mock`,
    name: `${pretty} (mock data)`,
    origin: "agent",
    updatedAt: new Date().toISOString(),
    model: "mock",
    tagline: "Mock output. The content is copied from the Notion guide so the UI has something to show.",
  };
}
