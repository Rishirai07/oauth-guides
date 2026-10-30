// Storage for agent-generated guides so they get a shareable /guides/<slug> URL.
// Uses Upstash Redis when configured (works on Vercel), otherwise an in-process
// map (fine for local dev). If neither persists, the UI also offers a
// self-contained share link with the guide compressed into the URL hash.

import { Redis } from "@upstash/redis";
import type { Guide } from "./types";

const g = globalThis as unknown as { __guideMem?: Map<string, Guide> };
const mem = (g.__guideMem ??= new Map<string, Guide>());

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function storeIsDurable(): boolean {
  return redis() !== null;
}

export async function saveGuide(guide: Guide): Promise<boolean> {
  mem.set(guide.slug, guide);
  const r = redis();
  if (!r) return false;
  try {
    await r.set(`guide:${guide.slug}`, JSON.stringify(guide));
    await r.zadd("guides:recent", { score: Date.now(), member: guide.slug });
    return true;
  } catch {
    return false;
  }
}

export async function loadGuide(slug: string): Promise<Guide | null> {
  const r = redis();
  if (r) {
    try {
      const v = await r.get<string | Guide>(`guide:${slug}`);
      if (v) return typeof v === "string" ? (JSON.parse(v) as Guide) : v;
    } catch {
      /* fall through to memory */
    }
  }
  return mem.get(slug) ?? null;
}

export async function recentGuides(limit = 12): Promise<Guide[]> {
  const r = redis();
  if (r) {
    try {
      const slugs = await r.zrange<string[]>("guides:recent", 0, limit - 1, { rev: true });
      const out = await Promise.all(slugs.map((s) => loadGuide(s)));
      return out.filter((x): x is Guide => Boolean(x));
    } catch {
      /* ignore */
    }
  }
  return [...mem.values()].slice(-limit).reverse();
}
