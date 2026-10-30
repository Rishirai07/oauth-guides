"use client";

import { useState } from "react";
import { compressToEncodedURIComponent } from "lz-string";
import type { Guide } from "@/lib/types";
import { guideToMarkdown } from "@/lib/markdown";

export function GuideActions({ guide, shareUrl }: { guide: Guide; shareUrl?: string }) {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2200);
  };

  const link = () => {
    if (shareUrl) return new URL(shareUrl, window.location.origin).toString();
    // Not stored on the server, so pack the whole guide into the URL hash instead.
    return `${window.location.origin}/shared#${compressToEncodedURIComponent(JSON.stringify(guide))}`;
  };

  const copy = async (text: string, m: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(m);
    } catch {
      flash("Couldn't copy. Your browser blocked clipboard access.");
    }
  };

  const download = () => {
    const blob = new Blob([guideToMarkdown(guide)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${guide.slug}-oauth-guide.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const btn = "rounded-md border border-line bg-card px-3 py-1.5 text-sm hover:border-ink transition-colors";
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button className={btn} onClick={() => copy(link(), "Share link copied")}>Copy link</button>
      <button className={btn} onClick={() => copy(guideToMarkdown(guide), "Copied. Paste it into your coding agent or a doc.")}>Copy as Markdown</button>
      <button className={btn} onClick={download}>Download .md</button>
      <button className={btn} onClick={() => window.print()}>Print / PDF</button>
      <span className="text-sm text-emerald-700" role="status">{msg}</span>
    </div>
  );
}
