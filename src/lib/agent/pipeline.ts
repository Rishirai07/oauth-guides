// The live research agent. Five stages, each streamed to the browser:
//
//  1. identify     work out which app the user means, and where its OAuth docs live
//  2. gather       fetch those docs ourselves and probe the provider's real endpoints
//  3. investigate  three narrower research passes in parallel: setup, approval, tokens/limits
//  4. write        turn the notes into a structured guide with sources and confidence labels
//  5. review       a second pass checks the guide against the evidence and fixes what it can't back up

import type { AgentEvent, Guide, Source, TestedCheck } from "../types";
import { candidateProbes, runProbe, type ProbeTarget } from "../probes";
import { generate, extractJson, runtimeState } from "./gemini";
import { fetchPage, fallbackSearch, hostOf, type FetchedPage } from "./web";
import { guideSchema, critiqueSchema, normalizeGuide } from "./schema";

type Emit = (e: AgentEvent) => void;

interface Identity {
  name: string;
  website: string;
  category: string;
  supportsOAuth: boolean;
  oauthSummary: string;
  developerPortalUrl: string;
  docUrls: string[];
  issuerGuesses: string[];
  notes: string;
}

const SYSTEM = `You are an integrations engineer researching how a developer registers an OAuth app with a third-party provider and gets it approved for production use by other people's accounts.
Be concrete and current. Prefer the provider's own documentation and changelogs. Never invent URLs, fees or timelines. If a fact isn't in your sources, say it is unknown.
Today's date is ${new Date().toISOString().slice(0, 10)}.`;

// The model's identity JSON is untrusted: coerce every field and reject junk.
function cleanIdentity(text: string): Identity | null {
  let raw: Record<string, unknown>;
  try {
    raw = extractJson<Record<string, unknown>>(text);
  } catch {
    return null;
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const urls = (v: unknown) => (Array.isArray(v) ? v : []).filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));
  let website = str(raw.website);
  if (website && !/^https?:\/\//.test(website)) website = `https://${website}`;
  const name = str(raw.name);
  if (!name || /^(unknown|n\/a|none)$/i.test(name)) return null;
  return {
    name: name.slice(0, 80),
    website: hostOf(website) ? website : "",
    category: str(raw.category) || "Other",
    supportsOAuth: raw.supportsOAuth !== false,
    oauthSummary: str(raw.oauthSummary),
    developerPortalUrl: urls([raw.developerPortalUrl])[0] || "",
    docUrls: urls(raw.docUrls).slice(0, 8),
    issuerGuesses: urls(raw.issuerGuesses).slice(0, 4),
    notes: str(raw.notes),
  };
}

// Probe results look like "authorize: URL · token: URL · PKCE: S256 · ...".
export function parseDiscovery(t: TestedCheck) {
  const get = (k: string) => t.result.match(new RegExp(`${k}: (\\S+)`))?.[1];
  const issuer = t.check.match(/at (https:\/\/\S+)/)?.[1] || "";
  const path = /OIDC/.test(t.check) ? "/.well-known/openid-configuration" : "/.well-known/oauth-authorization-server";
  return { url: issuer + path, authorize: get("authorize"), token: get("token"), pkce: t.result.match(/PKCE: ([^·]+)/)?.[1]?.trim() };
}

// "developers.example.co.uk" -> "example.co.uk", "api.slack.com" -> "slack.com"
function registrableDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return host;
  const twoLevel = parts.length >= 3 && parts.at(-1)!.length === 2 && /^(co|com|org|net|ac|gov|edu)$/.test(parts.at(-2)!);
  return parts.slice(twoLevel ? -3 : -2).join(".");
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\.(com|io|so|dev|app|ai|co|org|net)(\/.*)?$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "app";
}

export async function runAgent(query: string, emit: Emit, opts: { reservedSlugs?: Set<string> } = {}): Promise<Guide> {
  runtimeState.searchBroken = false;
  runtimeState.onNote = (message) => emit({ type: "log", message });
  const sourceMap = new Map<string, Source>();
  const addSource = (url: string, title: string, official: boolean) => {
    if (!url || !url.startsWith("http") || url.includes("grounding-api-redirect")) return;
    const key = url.replace(/#.*$/, "").replace(/\/$/, "");
    if (sourceMap.has(key)) return;
    const s: Source = { id: sourceMap.size + 1, url: key, title: title || hostOf(key), kind: official ? "official" : "third_party" };
    sourceMap.set(key, s);
    emit({ type: "source", source: { title: s.title, url: s.url } });
  };

  // ---------- 1. Identify ----------
  emit({ type: "stage", stage: "identify", label: "Identifying the app and its developer docs" });
  const idPrompt = `The developer typed: "${query}".
Identify the product they mean and find where its OAuth app registration is documented.
Return ONLY a JSON object:
{"name": str, "website": str (homepage URL), "category": str (2-3 words),
 "supportsOAuth": bool (does it let third-party apps connect user accounts via OAuth 2.0?),
 "oauthSummary": str (one sentence: what kind of app you register and where),
 "developerPortalUrl": str (where you create the OAuth app/client),
 "docUrls": [up to 6 official documentation URLs covering: creating an OAuth app, the authorization flow, scopes/permissions, app review / verification / marketplace / partner program],
 "issuerGuesses": [OAuth/OIDC issuer base URLs if known, e.g. https://accounts.example.com],
 "notes": str (anything surprising, e.g. partner-only access, OAuth deprecated, product renamed)}`;

  const id = await generate({ system: SYSTEM, prompt: idPrompt, search: true });
  emit({
    type: "log",
    message: id.searched ? `Searched the web (${id.queries.slice(0, 3).join(" · ") || "Google Search"})` : "Web search unavailable, falling back to model knowledge and keyless search",
    detail: `model: ${id.model}`,
  });
  const identity = cleanIdentity(id.text);
  if (!identity) {
    throw new Error(`Couldn't work out which app "${query}" refers to. Try its website, e.g. "asana.com".`);
  }
  emit({ type: "log", message: `Identified ${identity.name} (${identity.website || "no website found"})`, detail: identity.oauthSummary });
  if (identity.notes) emit({ type: "log", message: `Note: ${identity.notes}` });
  if (!identity.supportsOAuth) emit({ type: "log", message: "Looks like this app may not offer third-party OAuth. Checking anyway." });

  const officialHost = registrableDomain(hostOf(identity.website));
  const isOfficial = (u: string) => {
    const h = hostOf(u);
    return Boolean(officialHost) && (h === officialHost || h.endsWith("." + officialHost));
  };
  for (const s of id.sources) addSource(s.url, s.title, isOfficial(s.url));

  if (!id.searched) {
    const extra = await fallbackSearch(`${identity.name} OAuth app create client id developer documentation`);
    for (const r of extra) {
      if (isOfficial(r.url) && identity.docUrls.length < 6) identity.docUrls.push(r.url);
    }
  }

  // ---------- 2. Gather: read docs + probe endpoints (in parallel) ----------
  emit({ type: "stage", stage: "gather", label: "Reading official docs and probing live OAuth endpoints" });

  const docCandidates = [...new Set([...identity.docUrls, ...id.sources.filter((s) => isOfficial(s.url)).map((s) => s.url)])].slice(0, 7);
  const probeTargets: ProbeTarget[] = candidateProbes(identity.website, identity.issuerGuesses);
  if (identity.developerPortalUrl?.startsWith("http")) {
    probeTargets.push({ label: `Developer portal reachable (${hostOf(identity.developerPortalUrl)})`, url: identity.developerPortalUrl, kind: "reachable" });
  }

  const [pages, probeResults] = await Promise.all([
    Promise.all(docCandidates.map((u) => fetchPage(u))),
    Promise.all(probeTargets.map(runProbe)),
  ]);

  const docs = pages.filter((p): p is FetchedPage => Boolean(p));
  for (const p of docs) {
    addSource(p.url, p.title, isOfficial(p.url));
  }
  emit({
    type: "log",
    message: docCandidates.length ? `Read ${docs.length} of ${docCandidates.length} documentation pages` : "No documentation URLs to read; relying on search",
    detail: docs.map((d) => d.url).join("\n"),
  });

  const tested: TestedCheck[] = [];
  const discoveryHits = probeResults.filter((p) => p.ok && /discovery|metadata/i.test(p.check));
  const discoveryMisses = probeResults.filter((p) => !p.ok && /discovery|metadata/i.test(p.check));
  for (const p of probeResults.filter((p) => !p.result.startsWith("Skipped") && (!/discovery|metadata/i.test(p.check) || p.ok))) {
    tested.push(p);
    emit({ type: "probe", check: p });
  }
  if (!discoveryHits.length && discoveryMisses.length) {
    const miss: TestedCheck = {
      check: `Looked for OIDC/OAuth discovery documents at ${discoveryMisses.length} likely locations`,
      ok: false,
      at: new Date().toISOString(),
      result: "None found. Endpoint URLs have to come from the provider's docs.",
    };
    tested.push(miss);
    emit({ type: "probe", check: miss });
  }
  // If discovery revealed an authorize endpoint, prove it responds.
  const discovered = discoveryHits.map(parseDiscovery).sort((x, y) => Number(/mcp/i.test(x.authorize || "")) - Number(/mcp/i.test(y.authorize || "")));
  const authUrl = discovered.find((d) => d.authorize)?.authorize;
  if (authUrl) {
    const sep = authUrl.includes("?") ? "&" : "?";
    const p = await runProbe({ label: "Authorize endpoint responds to a bogus client_id", url: `${authUrl}${sep}client_id=probe-invalid-client&response_type=code&scope=openid&redirect_uri=https://example.com/cb`, kind: "authorize" });
    tested.push(p);
    emit({ type: "probe", check: p });
  }

  const docBlock = docs
    .map((d, i) => `### DOC ${i + 1}: ${d.title}\nURL: ${d.url}\n${d.text.slice(0, Math.floor(36000 / Math.max(docs.length, 1)))}`)
    .join("\n\n");
  const probeBlock = tested.map((t) => `- [${t.ok ? "OK" : "FAIL"}] ${t.check}: ${t.result}`).join("\n");

  // ---------- 3. Investigate (parallel) ----------
  emit({ type: "stage", stage: "investigate", label: "Three investigators digging into setup, approval and limits" });
  const topics = [
    {
      key: "setup",
      label: "Setup investigator",
      ask: `How does a developer register an OAuth app/client for ${identity.name}? Exact console path, required fields, account prerequisites (paid plan? company page? verified domain? partner account?), redirect URI rules, how credentials are issued, any dev/sandbox vs production distinction, and what can be automated (manifests, APIs, dynamic client registration).`,
    },
    {
      key: "approval",
      label: "Approval investigator",
      ask: `What review, verification, marketplace listing, security assessment or partner program does ${identity.name} require before an OAuth app can be used by OTHER people's accounts (not just the developer's)? What triggers it (specific scopes? user counts? commercial use?), what must be submitted (videos, policies, questionnaires), published or reported wait times, costs, and limits that apply until approved (user caps, rate limits, warning screens, test users).`,
    },
    {
      key: "tokens",
      label: "Tokens & gotchas investigator",
      ask: `For ${identity.name} OAuth: authorization and token endpoint URLs, PKCE support, refresh token behavior and access-token lifetime, scope model, rate limits that differ for unreviewed apps, admin-approval requirements in customer orgs, recent breaking changes (last 18 months), and the most common errors developers hit with their causes and fixes.`,
    },
  ];

  const notes = await Promise.all(
    topics.map(async (t) => {
      const r = await generate({
        system: SYSTEM,
        search: true,
        prompt: `${t.ask}

Use web search and the documentation excerpts below. Write concise research notes as bullet points. After every bullet, cite the URL it came from in square brackets, e.g. [https://...]. Mark anything you could not source as (unverified). Say explicitly when sources disagree.

LIVE PROBE RESULTS (observed by HTTP request today):
${probeBlock || "(none)"}

DOCUMENTATION EXCERPTS:
${docBlock || "(none could be fetched)"}`,
      });
      for (const s of r.sources) addSource(s.url, s.title, isOfficial(s.url));
      // Pick up URLs the model cited inline.
      for (const m of r.text.matchAll(/\[(https?:\/\/[^\]\s]+)\]/g)) addSource(m[1], "", isOfficial(m[1]));
      emit({ type: "log", message: `${t.label} finished`, detail: r.text.slice(0, 600) + (r.text.length > 600 ? "…" : "") });
      return `## ${t.label}\n${r.text}`;
    }),
  );

  // ---------- 4. Write the guide ----------
  emit({ type: "stage", stage: "write", label: "Writing the guide" });
  const sources = [...sourceMap.values()];
  const sourceList = sources.map((s) => `[${s.id}] (${s.kind}) ${s.title} — ${s.url}`).join("\n");

  const writePrompt = `Write a setup guide for a developer who needs an OAuth app with ${identity.name} so their AI agent's users can connect accounts.

Rules:
- Base every claim on the research notes or the probe results. If notes disagree, say so in "uncertain".
- confidence: "documented" = stated in an OFFICIAL source; "community" = only third-party sources; "inferred" = your reasoning. (Never use "tested"; live tests are attached separately.)
- sourceIds must reference the numbered SOURCES list below.
- difficulty: easy = self-serve, no review; moderate = self-serve but review/limits for some uses; hard = mandatory verification/partner step or customer-admin consent; very_hard = security assessment, vetting with possible rejection, or partnership-only.
- effort fields are short strings with ranges (e.g. "30–60 min", "Not published; plan for 2–4 weeks").
- owner: "agent" = an AI coding agent can do it entirely (code, config files, manifests, drafting); "agent_assist" = agent drafts, a human submits/clicks; "you" = requires a human (signing in, legal agreements, payment, identity verification, video recording).
- 2–4 phases, 2–4 steps each. 3–6 gotchas ordered by impact. 2–4 blockers. Modes must explain the different ways the app can exist (dev/test vs production vs listed) and what each allows.
- Write like an experienced engineer briefing a colleague: short plain sentences, concrete numbers, no marketing words (no "seamless", "robust", "crucial", "leverage"), no em dashes.
- If ${identity.name} does not support third-party OAuth, say so clearly in verdict and describe the alternative (API keys, partner program).

IDENTITY: ${JSON.stringify(identity)}

LIVE PROBE RESULTS:
${probeBlock || "(none)"}

SOURCES:
${sourceList}

RESEARCH NOTES:
${notes.join("\n\n")}`;

  const written = await generate({ system: SYSTEM, prompt: writePrompt, json: { schema: guideSchema }, temperature: 0.2 });
  let draft: unknown;
  try {
    draft = extractJson(written.text);
  } catch {
    throw new Error("The model returned an unreadable guide. Please try again.");
  }

  const reserved = opts.reservedSlugs || new Set<string>();
  let slug = slugify(identity.name || query);
  if (reserved.has(slug)) slug = `${slug}-live`;

  let guide = normalizeGuide(draft, {
    slug,
    origin: "agent",
    updatedAt: new Date().toISOString(),
    model: written.model,
    name: identity.name,
    website: identity.website,
    sources,
    tested,
    reviewNotes: [],
  });

  // ---------- 5. Fact-check ----------
  emit({ type: "stage", stage: "review", label: "Fact-checking the guide against the evidence" });
  try {
    const critique = await generate({
      system: "You are a skeptical reviewer. Your job is to catch claims in a setup guide that the evidence does not support.",
      json: { schema: critiqueSchema },
      prompt: `Check this guide against the research notes and probe results. For each claim that is unsupported, overstated, outdated or contradicted, add a correction. Pay special attention to: wait times, costs, whether review is required, token lifetimes, and endpoint URLs. Do not nitpick wording. Max 8 corrections.

GUIDE:
${JSON.stringify({ verdict: guide.verdict, effort: guide.effort, approval: guide.approval, phases: guide.phases, gotchas: guide.gotchas, oauth: guide.oauth })}

PROBE RESULTS:
${probeBlock}

RESEARCH NOTES:
${notes.join("\n\n").slice(0, 30000)}`,
    });
    const c = extractJson<{ corrections: { target: string; problem: string; newConfidence: string; replacementText: string }[]; uncertain: string[]; summary: string }>(critique.text);
    guide = applyCritique(guide, c);
    emit({ type: "log", message: `Reviewer: ${c.summary || "no summary"}`, detail: c.corrections.map((x) => `• ${x.target}: ${x.problem}`).join("\n") });
  } catch (e) {
    guide.reviewNotes = [...(guide.reviewNotes || []), `Fact-check step failed (${(e as Error).message}); claims are unreviewed.`];
    emit({ type: "log", message: "Fact-check step failed; publishing unreviewed guide" });
  }

  // What we observed beats what the model remembers: overwrite endpoint facts
  // with discovery-document values and say so.
  if (discovered.length) {
    const main = discovered[0];
    const fixes: string[] = [];
    const differs = (a?: string, b?: string) => Boolean(b) && (!a || !a.includes(b!.replace(/^https?:\/\//, "")));
    if (main.authorize && differs(guide.oauth.authorizeUrl, main.authorize)) {
      fixes.push(`authorize URL ${guide.oauth.authorizeUrl ? `"${guide.oauth.authorizeUrl}" ` : ""}→ ${main.authorize}`);
      guide.oauth.authorizeUrl = main.authorize;
    }
    if (main.token && differs(guide.oauth.tokenUrl, main.token)) {
      fixes.push(`token URL ${guide.oauth.tokenUrl ? `"${guide.oauth.tokenUrl}" ` : ""}→ ${main.token}`);
      guide.oauth.tokenUrl = main.token;
    }
    if (main.pkce && !/S256|supported|yes/i.test(guide.oauth.pkce || "")) {
      fixes.push(`PKCE "${guide.oauth.pkce || "not stated"}" → ${main.pkce} (advertised)`);
      guide.oauth.pkce = `Supported (${main.pkce}), advertised in the discovery document`;
    }
    guide.oauth.discovery = discovered.map((d) => d.url + (d.authorize && /mcp/i.test(d.authorize) ? " (MCP server endpoints)" : "")).join(" · ");
    if (fixes.length) {
      guide.reviewNotes = [...(guide.reviewNotes || []), `Replaced with values from the live discovery document: ${fixes.join("; ")}.`];
    }
  }

  // Drop citations that point at sources we don't have.
  const valid = new Set(guide.sources.map((s) => s.id));
  for (const ph of guide.phases) for (const st of ph.steps) st.sourceIds = st.sourceIds?.filter((n) => valid.has(n));
  for (const g of guide.gotchas) g.sourceIds = g.sourceIds?.filter((n) => valid.has(n));

  if (runtimeState.searchBroken) {
    guide.uncertain.unshift("Web search wasn't available during this run, so the guide leans on fetched docs and the model's own knowledge.");
  }
  if (!docs.length && !id.searched) {
    guide.uncertain.unshift("No documentation pages could be read. Treat everything here as unverified.");
  }
  return guide;
}

function applyCritique(
  guide: Guide,
  c: { corrections: { target: string; problem: string; newConfidence: string; replacementText: string }[]; uncertain: string[] },
): Guide {
  const notes: string[] = [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const corr of c.corrections || []) {
    const t = norm(corr.target);
    let hit = false;
    for (const ph of guide.phases)
      for (const st of ph.steps)
        if (t && (norm(st.title) === t || norm(st.title).includes(t) || t.includes(norm(st.title)))) {
          if (corr.newConfidence !== "unchanged") st.confidence = corr.newConfidence as Guide["gotchas"][0]["confidence"];
          if (corr.replacementText) st.detail = corr.replacementText;
          hit = true;
        }
    for (const g of guide.gotchas)
      if (t && (norm(g.title) === t || norm(g.title).includes(t) || t.includes(norm(g.title)))) {
        if (corr.newConfidence !== "unchanged") g.confidence = corr.newConfidence as Guide["gotchas"][0]["confidence"];
        if (corr.replacementText) g.detail = corr.replacementText;
        hit = true;
      }
    const [section, field] = corr.target.split(".");
    if (!hit && field && corr.replacementText) {
      const obj = (guide as unknown as Record<string, Record<string, unknown>>)[section];
      if (obj && typeof obj[field] === "string") {
        obj[field] = corr.replacementText;
        hit = true;
      }
    }
    notes.push(`${hit ? "Corrected" : "Flagged"} ${corr.target}: ${corr.problem}`);
  }
  guide.reviewNotes = [...(guide.reviewNotes || []), ...notes];
  guide.uncertain = [...new Set([...(guide.uncertain || []), ...(c.uncertain || [])])];
  return guide;
}
