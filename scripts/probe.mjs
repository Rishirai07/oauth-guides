// Runs the live endpoint checks for every curated guide through a running
// instance of the app and saves them to src/data/probe-results.json, so the
// curated guides ship with dated "tested" evidence.
//
//   npm run dev            (in another terminal)
//   npm run probe          # defaults to http://localhost:3000
//   npm run probe -- https://your-deployment.vercel.app

import { writeFileSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const slugs = ["github", "notion", "slack", "outlook", "gmail", "linkedin"];
const out = {};

for (const slug of slugs) {
  const r = await fetch(`${base}/api/probe/${slug}`);
  const j = await r.json();
  out[slug] = j.checks || [];
  for (const c of out[slug]) console.log(`${c.ok ? "OK  " : "FAIL"} ${slug.padEnd(9)} ${c.check}\n          ${c.result}`);
}

writeFileSync(new URL("../src/data/probe-results.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log("\nSaved src/data/probe-results.json");
