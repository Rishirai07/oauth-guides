"use client";

import { useState } from "react";
import type { TestedCheck } from "@/lib/types";

export function ProbePanel({ slug, initial, canRun }: { slug: string; initial: TestedCheck[]; canRun: boolean }) {
  const [checks, setChecks] = useState<TestedCheck[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/probe/${slug}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Probe failed");
      setChecks(j.checks);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {checks.length === 0 ? (
        <p className="text-sm text-muted">
          No live checks saved with this guide yet.{canRun ? " Running them sends a few requests to the provider's real OAuth endpoints from our server." : ""}
        </p>
      ) : (
        <ul className="space-y-2">
          {checks.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className={`mt-0.5 shrink-0 inline-grid place-items-center size-5 rounded-full text-[11px] font-bold ${c.ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {c.ok ? "✓" : "!"}
              </span>
              <span>
                <span className="font-medium">{c.check}</span>
                <span className="block font-mono text-xs text-muted break-all">{c.result}</span>
                <span className="block text-[11px] text-muted">{new Date(c.at).toUTCString()}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {canRun && (
        <button onClick={run} disabled={busy} className="no-print mt-3 rounded-md bg-ink text-paper px-3 py-1.5 text-sm disabled:opacity-60">
          {busy ? "Checking…" : checks.length ? "Run the checks again" : "Run live checks"}
        </button>
      )}
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
