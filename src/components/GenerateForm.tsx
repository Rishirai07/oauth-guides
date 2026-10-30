"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const EXAMPLES = ["HubSpot", "Zoom", "figma.com", "Salesforce", "Spotify", "Calendly"];

export function GenerateForm({ curated }: { curated: { slug: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const norm = q.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  const match = norm.length > 1 ? curated.find((c) => c.slug === norm.split(".")[0] || c.name.toLowerCase().startsWith(norm)) : undefined;

  const go = (v: string) => {
    const s = v.trim();
    if (s.length < 2) return;
    router.push(`/generate?q=${encodeURIComponent(s)}`);
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="App name or website, e.g. Asana or asana.com"
          className="flex-1 rounded-lg border border-line bg-card px-4 py-3 text-base outline-none focus:border-ink"
          maxLength={120}
          aria-label="App name or website"
        />
        <button className="rounded-lg bg-accent text-white px-5 py-3 font-semibold hover:brightness-110">Research it</button>
      </form>
      {match && (
        <p className="mt-2 text-sm">
          There's already a reviewed guide for <Link href={`/guides/${match.slug}`} className="text-accent underline">{match.name}</Link>. You can still run the agent if you want to compare.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>Try:</span>
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => go(e)} className="rounded-full border border-line px-3 py-1 hover:border-ink hover:text-ink">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
