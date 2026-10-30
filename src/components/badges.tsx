import { CONFIDENCE_LABEL, DIFFICULTY_LABEL, OWNER_LABEL, type Confidence, type Difficulty, type Owner } from "@/lib/types";

const DIFF_LEVEL: Record<Difficulty, number> = { easy: 1, moderate: 2, hard: 3, very_hard: 4 };
const DIFF_COLOR: Record<Difficulty, string> = {
  easy: "bg-emerald-600",
  moderate: "bg-amber-500",
  hard: "bg-orange-600",
  very_hard: "bg-red-700",
};
const DIFF_TEXT: Record<Difficulty, string> = {
  easy: "text-emerald-700",
  moderate: "text-amber-700",
  hard: "text-orange-700",
  very_hard: "text-red-700",
};

export function DifficultyMeter({ d, size = "sm" }: { d: Difficulty; size?: "sm" | "lg" }) {
  const n = DIFF_LEVEL[d];
  const h = size === "lg" ? "h-2.5 w-7" : "h-1.5 w-4";
  return (
    <span className="inline-flex items-center gap-2" title={`Difficulty: ${DIFFICULTY_LABEL[d]}`}>
      <span className="inline-flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`${h} rounded-full ${i <= n ? DIFF_COLOR[d] : "bg-line"}`} />
        ))}
      </span>
      <span className={`font-semibold ${size === "lg" ? "text-base" : "text-xs"} ${DIFF_TEXT[d]}`}>{DIFFICULTY_LABEL[d]}</span>
    </span>
  );
}

const CONF_STYLE: Record<Confidence, string> = {
  tested: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  documented: "bg-sky-50 text-sky-800 ring-sky-200",
  community: "bg-amber-50 text-amber-800 ring-amber-200",
  inferred: "bg-stone-100 text-stone-600 ring-stone-200",
};
const CONF_ICON: Record<Confidence, string> = { tested: "●", documented: "◆", community: "▲", inferred: "○" };

export function ConfidenceChip({ c }: { c: Confidence }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${CONF_STYLE[c]}`}>
      <span aria-hidden>{CONF_ICON[c]}</span>
      {CONFIDENCE_LABEL[c]}
    </span>
  );
}

const OWNER_STYLE: Record<Owner, string> = {
  agent: "bg-violet-50 text-violet-800 ring-violet-200",
  agent_assist: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  you: "bg-ink text-paper ring-ink",
};

export function OwnerChip({ o }: { o: Owner }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${OWNER_STYLE[o]}`}>{OWNER_LABEL[o]}</span>;
}
