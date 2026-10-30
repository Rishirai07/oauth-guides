import { curatedProbes, runProbes } from "@/lib/probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Re-runs the live endpoint checks for a curated guide, on demand, from the server.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const targets = curatedProbes[slug];
  if (!targets) return Response.json({ error: "No live checks defined for this guide" }, { status: 404 });
  const checks = await runProbes(targets);
  return Response.json({ checks });
}
