// Checks which Gemini models your API key can use, with and without Google
// Search, and suggests a GEMINI_MODEL value.
//
//   node scripts/check-gemini.mjs

import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

function readEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {}
  }
  return env;
}

const env = { ...readEnv(), ...process.env };
const key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
if (!key) {
  console.log("No GEMINI_API_KEY found in .env.local. Add it, save the file, and run this again.");
  process.exit(1);
}
console.log(`Using key ${key.slice(0, 6)}…${key.slice(-4)} (${key.length} characters)\n`);

const ai = new GoogleGenAI({ apiKey: key });
const short = (e) => {
  const s = String(e?.message || e);
  const m = s.match(/"message"\s*:\s*"([^"]{0,160})/);
  return (m ? m[1] : s).replace(/\s+/g, " ").slice(0, 160);
};

// 1. Which models does this key see?
let listed = [];
try {
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  for await (const m of pager) {
    const name = (m.name || "").replace(/^models\//, "");
    if (/gemini/.test(name) && /flash|pro/.test(name) && !/image|tts|audio|live|embedding|vision|thinking-exp/.test(name)) listed.push(name);
  }
} catch (e) {
  console.log(`Couldn't list models: ${short(e)}`);
  if (/API key not valid|API_KEY_INVALID/i.test(String(e))) {
    console.log("\nThe key itself is being rejected. Copy it again from https://aistudio.google.com/apikey");
    process.exit(1);
  }
}

const preferred = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const candidates = [...new Set([...(env.GEMINI_MODEL || "").split(",").map((s) => s.trim()).filter(Boolean), ...preferred.filter((p) => !listed.length || listed.includes(p)), ...listed.filter((n) => /flash/.test(n) && !/preview|exp/.test(n))])].slice(0, 8);

console.log(`Testing ${candidates.length} models (this takes ~30 seconds)…\n`);
const results = [];
for (const model of candidates) {
  const row = { model, plain: "", search: "" };
  try {
    const r = await ai.models.generateContent({ model, contents: "Reply with the single word OK." });
    row.plain = (r.text || "").trim() ? "works" : "empty reply";
  } catch (e) {
    row.plain = "FAIL: " + short(e);
  }
  if (row.plain === "works") {
    try {
      const r = await ai.models.generateContent({ model, contents: "What is today's date? One line.", config: { tools: [{ googleSearch: {} }] } });
      row.search = (r.text || "").trim() ? "works" : "empty reply";
    } catch (e) {
      row.search = "FAIL: " + short(e);
    }
  } else {
    row.search = "-";
  }
  results.push(row);
  console.log(`${model}\n   plain:  ${row.plain}\n   search: ${row.search}\n`);
}

const best = results.find((r) => r.plain === "works" && r.search === "works") || results.find((r) => r.plain === "works");
if (!best) {
  console.log("No model worked with this key. Wait a minute (free-tier limits are per minute) and run this again.");
  console.log("If it still fails, paste this output to whoever is helping you.");
} else {
  console.log("Recommended: add this line to .env.local, save, and restart `npm run dev`:\n");
  console.log(`   GEMINI_MODEL=${best.model}\n`);
  if (best.search !== "works") {
    console.log("Note: Google Search isn't available on this key. The agent will still work by reading");
    console.log("the provider's docs directly, but guides may cite fewer sources.");
  }
}
