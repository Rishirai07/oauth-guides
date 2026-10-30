// Plain HTTP helpers for the agent. We fetch documentation ourselves instead of
// trusting search snippets, so we know which page each claim came from and can
// cite the real URL rather than a search redirect.

import { isSafePublicUrl } from "../net";

const UA =
  "Mozilla/5.0 (compatible; OAuthGuideBot/1.0) AppleWebKit/537.36 (KHTML, like Gecko)";
const MAX_BYTES = 3_000_000;

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
}

async function get(url: string, ms = 10000, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": UA, "accept-language": "en", ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

// Reads at most MAX_BYTES so a huge or endless response can't stall the run.
async function readCapped(res: Response): Promise<string> {
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return "";
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'" };
const decode = (s: string) => s.replace(/&(nbsp|amp|lt|gt|quot|#39|#x27);/g, (m) => ENTITIES[m] ?? m);

export function htmlToText(html: string): { title: string; text: string } {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim());
  const body = decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|pre)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return { title, text: body };
}

export async function fetchPage(url: string, maxChars = 14000): Promise<FetchedPage | null> {
  if (!(await isSafePublicUrl(url))) return null;
  try {
    // Many docs sites (Mintlify and friends) serve clean markdown at <url>.md.
    if (!/\.(md|txt)$/.test(url) && !url.includes("?") && !url.includes("#")) {
      const md = await get(url.replace(/\/$/, "") + ".md", 6000).catch(() => null);
      if (md && md.ok && /markdown|text\/plain/.test(md.headers.get("content-type") || "")) {
        const text = (await readCapped(md)).slice(0, maxChars);
        if (text.length > 400) {
          const title = text.match(/^#\s+(.+)$/m)?.[1] || url;
          return { url, title, text };
        }
      }
    }
    const res = await get(url);
    if (!res.ok) return null;
    // Redirects are followed by fetch; make sure we didn't land somewhere private.
    if (res.url && res.url !== url && !(await isSafePublicUrl(res.url))) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/html|text|json|markdown/.test(ct)) return null;
    const raw = await readCapped(res);
    if (ct.includes("html")) {
      const { title, text } = htmlToText(raw);
      if (text.length < 300) return null; // client-rendered page with no real text
      return { url: res.url || url, title: title || url, text: text.slice(0, maxChars) };
    }
    return { url: res.url || url, title: url, text: raw.slice(0, maxChars) };
  } catch {
    return null;
  }
}

// Keyless search, only used when Gemini's Google Search grounding isn't available.
export async function fallbackSearch(query: string, limit = 6): Promise<{ title: string; url: string }[]> {
  try {
    const res = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 8000);
    if (!res.ok) return [];
    const html = await readCapped(res);
    const out: { title: string; url: string }[] = [];
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < limit) {
      let href = m[1];
      const uddg = href.match(/uddg=([^&]+)/);
      if (uddg) href = decodeURIComponent(uddg[1]);
      if (href.startsWith("//")) href = "https:" + href;
      if (!href.startsWith("http")) continue;
      out.push({ url: href, title: decode(m[2].replace(/<[^>]+>/g, "")).trim() });
    }
    return out;
  } catch {
    return [];
  }
}

// Grounding results point at Google redirect URLs. Follow one hop to get the real page.
export async function resolveRedirect(url: string): Promise<string> {
  if (!url.includes("grounding-api-redirect")) return url;
  try {
    const res = await get(url, 5000, { redirect: "manual" });
    return res.headers.get("location") || url;
  } catch {
    return url;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
