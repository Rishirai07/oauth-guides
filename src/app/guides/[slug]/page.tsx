import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide } from "@/lib/guides";
import { GuideView } from "@/components/GuideView";
import { curatedProbes } from "@/lib/probes";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGuide(slug);
  return g ? { title: `${g.name} OAuth setup & approval guide`, description: g.verdict.headline } : { title: "Guide not found" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await getGuide(slug);
  if (!g) notFound();
  return <GuideView guide={g} shareUrl={`/guides/${g.slug}`} canProbe={Boolean(curatedProbes[g.slug])} />;
}
