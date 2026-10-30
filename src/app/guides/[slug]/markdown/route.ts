import { getGuide } from "@/lib/guides";
import { guideToMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const g = await getGuide(slug);
  if (!g) return new Response("Not found", { status: 404 });
  return new Response(guideToMarkdown(g), {
    headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `inline; filename="${slug}-oauth-guide.md"` },
  });
}
