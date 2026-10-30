"use client";

import { useMemo, useSyncExternalStore } from "react";
import { decompressFromEncodedURIComponent } from "lz-string";
import type { Guide } from "@/lib/types";
import { GuideView } from "@/components/GuideView";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

// Shows a guide that travels inside the URL hash, so sharing works without server storage.
export default function SharedGuide() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => null);
  const guide = useMemo<Guide | null | "bad">(() => {
    if (hash === null) return null;
    try {
      const raw = decompressFromEncodedURIComponent(hash);
      return raw ? (JSON.parse(raw) as Guide) : "bad";
    } catch {
      return "bad";
    }
  }, [hash]);

  if (guide === "bad") return <p className="mx-auto max-w-xl px-5 py-20 text-center text-muted">This link looks incomplete. It may have been cut off when it was pasted.</p>;
  if (!guide) return <p className="mx-auto max-w-xl px-5 py-20 text-center text-muted">Loading guide…</p>;
  return <GuideView guide={guide} />;
}
