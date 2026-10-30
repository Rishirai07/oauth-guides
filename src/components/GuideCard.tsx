import Link from "next/link";
import type { Guide } from "@/lib/types";
import { DifficultyMeter } from "./badges";

export function GuideCard({ g }: { g: Guide }) {
  return (
    <Link href={`/guides/${g.slug}`} className="group flex flex-col rounded-xl border border-line bg-card p-5 hover:border-ink transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">{g.category}</p>
          <h3 className="text-lg font-semibold tracking-tight group-hover:text-accent">{g.name}</h3>
        </div>
        {g.origin === "agent" && <span className="rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 text-[10px] font-semibold">Agent</span>}
      </div>
      <p className="mt-2 text-sm text-ink/75 flex-1">{g.tagline}</p>
      <div className="mt-4 pt-4 border-t border-line space-y-1.5 text-sm">
        <DifficultyMeter d={g.verdict.difficulty} />
        <p><span className="text-muted">Work:</span> {g.effort.handsOn}</p>
        <p className="line-clamp-2"><span className="text-muted">Production:</span> {g.effort.timeToProduction}</p>
      </div>
    </Link>
  );
}
