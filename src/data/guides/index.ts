import type { Guide } from "@/lib/types";
import { github } from "./github";
import { notion } from "./notion";
import { slack } from "./slack";
import { outlook } from "./outlook";
import { gmail } from "./gmail";
import { linkedin } from "./linkedin";

// Ordered easy → very hard so the library reads as a spectrum.
export const curatedGuides: Guide[] = [github, notion, slack, outlook, gmail, linkedin];

export const curatedBySlug: Record<string, Guide> = Object.fromEntries(
  curatedGuides.map((g) => [g.slug, g]),
);
