// Live checks against a provider's real endpoints. Nothing else in a guide is
// allowed to be labelled "tested": each check here is an actual HTTP request
// with a timestamp. All requests are plain GETs, and anything that needs a
// client uses a client_id that can't exist.

import type { TestedCheck } from "./types";
import { isSafePublicUrl } from "./net";

export type ProbeKind = "discovery" | "authorize" | "reachable";

export interface ProbeTarget {
  label: string;
  url: string;
  kind: ProbeKind;
}

const UA = "OAuthGuideBot/1.0 (setup-guide research)";

async function timedFetch(url: string, init: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      redirect: "manual",
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "*/*", ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

function where(loc: string, base: string) {
  try {
    const u = new URL(loc, base);
    return `${u.host}${u.pathname}`;
  } catch {
    return loc.slice(0, 80);
  }
}

export async function runProbe(p: ProbeTarget): Promise<TestedCheck> {
  const at = new Date().toISOString();
  if (!(await isSafePublicUrl(p.url))) {
    return { check: p.label, ok: false, at, result: "Skipped: not a public http(s) URL" };
  }
  try {
    if (p.kind === "discovery") {
      const res = await timedFetch(p.url, { headers: { accept: "application/json" } });
      if (res.status >= 300 && res.status < 400) {
        return { check: p.label, ok: false, at, result: `HTTP ${res.status}, redirects to ${where(res.headers.get("location") || "", p.url)} (no document here)` };
      }
      if (!res.ok) return { check: p.label, ok: false, at, result: `HTTP ${res.status}, no discovery document` };
      let j: Record<string, unknown>;
      try {
        j = JSON.parse((await res.text()).slice(0, 200_000));
      } catch {
        return { check: p.label, ok: false, at, result: `HTTP ${res.status}, but the response isn't JSON` };
      }
      const parts: string[] = [];
      if (j.authorization_endpoint) parts.push(`authorize: ${j.authorization_endpoint}`);
      if (j.token_endpoint) parts.push(`token: ${j.token_endpoint}`);
      const pkce = j.code_challenge_methods_supported as string[] | undefined;
      if (Array.isArray(pkce) && pkce.length) parts.push(`PKCE: ${pkce.join(", ")}`);
      if (j.registration_endpoint) parts.push(`dynamic client registration: ${j.registration_endpoint}`);
      const scopes = j.scopes_supported as string[] | undefined;
      if (Array.isArray(scopes) && scopes.length) parts.push(`${scopes.length} scopes advertised`);
      return {
        check: p.label,
        ok: Boolean(j.authorization_endpoint),
        at,
        result: parts.join(" · ") || "Document returned, but it has no authorization_endpoint",
      };
    }

    if (p.kind === "authorize") {
      // An unknown client_id should get an error page or a redirect. Either
      // proves the endpoint is live and shows how the provider reports it.
      const res = await timedFetch(p.url);
      const loc = res.headers.get("location");
      let note = `HTTP ${res.status}`;
      if (loc) note += `, redirects to ${where(loc, p.url)}`;
      if (!loc && res.status < 500) {
        const text = (await res.text()).slice(0, 4000);
        const m = text.match(/(invalid[_ ]client[^<"]{0,80}|client[_ ]id[^<"]{0,80}|not found[^<"]{0,40}|error[^<"]{0,80})/i);
        if (m) note += `; page mentions "${m[1].trim().slice(0, 90)}"`;
      }
      return { check: p.label, ok: res.status < 500, at, result: `${note}. Endpoint is live.` };
    }

    const res = await timedFetch(p.url);
    const loc = res.headers.get("location");
    return {
      check: p.label,
      ok: res.status < 400,
      at,
      result: `HTTP ${res.status}${loc ? `, redirects to ${where(loc, p.url)}` : ""}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "timed out after 8s" : e.message) : String(e);
    return { check: p.label, ok: false, at, result: `Request failed: ${msg}` };
  }
}

export async function runProbes(targets: ProbeTarget[]): Promise<TestedCheck[]> {
  return Promise.all(targets.map(runProbe));
}

// Checks for the curated guides. URLs are fixed, so they can be re-run any time.
export const curatedProbes: Record<string, ProbeTarget[]> = {
  github: [
    { label: "GitHub authorize endpoint, called with a fake client_id", url: "https://github.com/login/oauth/authorize?client_id=probe-invalid-client&scope=read:user", kind: "authorize" },
    { label: "GitHub 'new OAuth App' page (expect a login redirect)", url: "https://github.com/settings/applications/new", kind: "reachable" },
  ],
  notion: [
    { label: "Notion authorize endpoint, called with a fake client_id", url: "https://api.notion.com/v1/oauth/authorize?client_id=probe-invalid-client&response_type=code&owner=user", kind: "authorize" },
    { label: "Notion Developer portal", url: "https://www.notion.so/developers/connections", kind: "reachable" },
  ],
  slack: [
    { label: "Slack OIDC discovery document", url: "https://slack.com/.well-known/openid-configuration", kind: "discovery" },
    { label: "Slack OAuth v2 authorize, called with a fake client_id", url: "https://slack.com/oauth/v2/authorize?client_id=probe-invalid-client&scope=chat:write", kind: "authorize" },
  ],
  outlook: [
    { label: "Microsoft identity platform discovery (/common)", url: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration", kind: "discovery" },
    { label: "Microsoft authorize, called with an all-zero client_id", url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=00000000-0000-0000-0000-000000000000&response_type=code&scope=openid", kind: "authorize" },
  ],
  gmail: [
    { label: "Google OIDC discovery document", url: "https://accounts.google.com/.well-known/openid-configuration", kind: "discovery" },
    { label: "Google authorize, called with a fake client_id", url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=probe-invalid-client&response_type=code&scope=openid&redirect_uri=https://example.com", kind: "authorize" },
  ],
  linkedin: [
    { label: "LinkedIn OIDC discovery document", url: "https://www.linkedin.com/oauth/.well-known/openid-configuration", kind: "discovery" },
    { label: "LinkedIn authorize, called with a fake client_id", url: "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=probe-invalid-client&redirect_uri=https://example.com&scope=openid", kind: "authorize" },
  ],
};

// For an app we know nothing about, guess where its discovery documents live.
export function candidateProbes(website: string, extraIssuers: string[] = []): ProbeTarget[] {
  let host: string;
  try {
    host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
  } catch {
    return [];
  }
  if (!host.includes(".")) return [];
  const issuers = new Set<string>([
    ...extraIssuers.filter((i) => typeof i === "string" && i.startsWith("https://")).map((i) => i.replace(/\/$/, "")),
    `https://${host}`,
    `https://auth.${host}`,
    `https://login.${host}`,
    `https://accounts.${host}`,
    `https://api.${host}`,
  ]);
  const out: ProbeTarget[] = [];
  for (const iss of issuers) {
    out.push({ label: `OIDC discovery at ${iss}`, url: `${iss}/.well-known/openid-configuration`, kind: "discovery" });
    out.push({ label: `OAuth server metadata at ${iss}`, url: `${iss}/.well-known/oauth-authorization-server`, kind: "discovery" });
  }
  return out.slice(0, 12);
}
