import { curatedBySlug } from "@/data/guides";
import probeResults from "@/data/probe-results.json";
import { loadGuide } from "./store";
import type { Guide, TestedCheck } from "./types";

const baked = probeResults as Record<string, TestedCheck[]>;

export async function getGuide(slug: string): Promise<Guide | null> {
  const curated = curatedBySlug[slug];
  if (curated) return baked[slug]?.length ? { ...curated, tested: baked[slug] } : curated;
  return loadGuide(slug);
}
