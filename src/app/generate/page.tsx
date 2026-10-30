"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AgentEvent, Guide, TestedCheck } from "@/lib/types";
import { GuideView } from "@/components/GuideView";
import { sourceLabel } from "@/lib/format";

const STAGES = [
  ["identify", "Find the app"],
  ["gather", "Read docs, check endpoints"],
  ["investigate", "Research (3 in parallel)"],
  ["write", "Write guide"],
  ["review", "Review"],
] as const;

type Log = { message: string; detail?: string; t: number };

function Runner() {
  const q = useSearchParams().get("q") || "";
  const [stage, setStage] = useState<string>("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [probes, setProbes] = useState<TestedCheck[]>([]);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [stored, setStored] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const started = useRef<string>("");
  const [running, setRunning] = useState(false);

  // Elapsed-time counter, kept separate from the fetch so React's dev-mode
  // double effect can't stop it.
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now() - elapsed * 1000;
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (!q || started.current === q) return;
    started.current = q;
    const t0 = Date.now();
    let finished = false;

    (async () => {
      setRunning(true);
      try {
        const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line) continue;
            let e: AgentEvent;
            try {
              e = JSON.parse(line) as AgentEvent;
            } catch {
              continue; // a garbled line shouldn't kill the run
            }
            if (e.type === "guide" || e.type === "error") finished = true;
            if (e.type === "stage") setStage(e.stage);
            else if (e.type === "log" && e.message) setLogs((l) => [...l, { message: e.message, detail: e.detail, t: Date.now() - t0 }]);
            else if (e.type === "source") setSources((s) => (s.some((x) => x.url === e.source.url) ? s : [...s, e.source]));
            else if (e.type === "probe") setProbes((p) => [...p, e.check]);
            else if (e.type === "guide") {
              setGuide(e.guide);
              setStored(e.stored);
              setStage("done");
            } else if (e.type === "error") setError(e.message);
          }
        }
        if (!finished) {
          setError("The connection closed before the guide was finished. The server may have hit its time limit; try again.");
        }
      } catch (err) {
        const m = (err as Error).message;
        setError(/Failed to fetch|NetworkError|network/i.test(m) ? "Lost the connection to the server. Check your network and try again." : m);
      } finally {
        setRunning(false);
      }
    })();
  }, [q]);

  if (!q) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <p>Nothing to look up. <Link href="/#generate" className="text-accent underline">Enter an app name.</Link></p>
      </div>
    );
  }

  const idx = stage === "done" ? STAGES.length : STAGES.findIndex(([k]) => k === stage);

  return (
    <div>
      <div className="no-print border-b border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Researching <span className="text-accent">{q}</span>
            </h1>
            <span className="font-mono text-sm text-muted">{elapsed}s</span>
          </div>

          <ol className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-2">
            {STAGES.map(([k, label], i) => {
              const state = error && i === idx ? "error" : i < idx ? "done" : i === idx ? "active" : "todo";
              return (
                <li key={k} className={`rounded-lg border px-3 py-2 text-sm ${state === "done" ? "border-emerald-300 bg-emerald-50" : state === "active" ? "border-accent bg-orange-50" : state === "error" ? "border-red-300 bg-red-50" : "border-line"}`}>
                  <span className="font-mono text-xs text-muted">{i + 1}</span>{" "}
                  {state === "active" && <span className="inline-block size-2 rounded-full bg-accent animate-pulse mr-1" />}
                  {label}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 grid md:grid-cols-3 gap-5 text-sm">
            <div className="md:col-span-2">
              <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">What the agent is doing</p>
              <ul className="space-y-1.5 max-h-72 overflow-auto pr-2">
                {logs.length === 0 && !error && <li className="text-muted">Starting up…</li>}
                {logs.map((l, i) => (
                  <li key={i}>
                    <span className="font-mono text-[11px] text-muted mr-2">{(l.t / 1000).toFixed(0)}s</span>
                    {l.message}
                    {l.detail && (
                      <details className="ml-8">
                        <summary className="text-xs text-muted cursor-pointer">details</summary>
                        <pre className="whitespace-pre-wrap text-xs text-ink/70 font-mono">{l.detail}</pre>
                      </details>
                    )}
                  </li>
                ))}
                {error && <li className="text-red-700 font-medium">Error: {error}</li>}
              </ul>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Endpoint checks ({probes.length})</p>
                <ul className="space-y-1">
                  {probes.map((p, i) => (
                    <li key={i} className="flex gap-2"><span>{p.ok ? "✅" : "⚠️"}</span><span className="text-xs">{p.check}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Sources ({sources.length})</p>
                <ul className="space-y-1 max-h-40 overflow-auto">
                  {sources.map((s) => (
                    <li key={s.url} className="text-xs truncate"><a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{sourceLabel(s)}</a></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {error && (
            <button onClick={() => window.location.reload()} className="mt-4 rounded-md bg-ink text-paper px-3 py-1.5 text-sm">Try again</button>
          )}
        </div>
      </div>

      {guide && (
        <>
          <div className="no-print mx-auto max-w-6xl px-5 pt-6">
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm">
              Done in {elapsed}s. {stored ? (
                <>Saved at <Link href={`/guides/${guide.slug}`} className="underline font-medium">/guides/{guide.slug}</Link>.</>
              ) : (
                <>This server doesn't keep generated guides, so use <b>Copy link</b> to share it (the link carries the whole guide).</>
              )} Nobody has reviewed this one by hand yet, so check the Evidence section.
            </div>
          </div>
          <GuideView guide={guide} shareUrl={stored ? `/guides/${guide.slug}` : undefined} />
        </>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="p-10 text-muted">Loading…</div>}>
      <Runner />
    </Suspense>
  );
}
