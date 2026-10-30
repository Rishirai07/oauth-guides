// Fake Gemini endpoint for offline pipeline tests: `node scripts/fake-gemini.mjs`
// then run the app with GEMINI_BASE_URL=http://localhost:8787 GEMINI_API_KEY=x
import http from "node:http";
let n = 0;
const guide = {
  name: "Zoom", website: "https://zoom.us", category: "Video meetings",
  tagline: "Self-serve OAuth app; publishing to the Marketplace requires review.",
  verdict: { difficulty: "moderate", headline: "Build today; publish after review.", why: "Test." },
  effort: { handsOn: "1–2 h", approvalWait: "Not published", timeToFirstConnection: "Same day", timeToProduction: "1–3 weeks", cost: "Free" },
  modes: [{ name: "Development", whatYouGet: "Your account", limits: "Not for others", reviewNeeded: "None" }],
  prerequisites: [{ item: "Zoom account", why: "To create the app", required: true }],
  phases: [{ title: "Register", goal: "Get credentials", steps: [
    { title: "Create a general app", detail: "In the App Marketplace build flow.", owner: "you", confidence: "documented", sourceIds: [1] },
    { title: "Pick scopes", detail: "Granular scopes.", owner: "agent", confidence: "inferred", sourceIds: [] } ] }],
  approval: { required: "conditional", trigger: "Publishing", process: ["Submit", "Review"], typicalWait: "2 weeks", confidence: "inferred" },
  gotchas: [{ title: "Granular scopes", detail: "x", impact: "high", confidence: "community" }],
  blockers: [{ symptom: "invalid redirect", cause: "x", fix: "y" }],
  handoff: { agentCan: ["code"], youMust: ["click"] },
  oauth: { authorizeUrl: "https://zoom.us/oauth/authorize", tokenUrl: "https://zoom.us/oauth/token", pkce: "" },
  uncertain: ["Review time"],
};
http.createServer((req, res) => {
  let body = ""; req.on("data", c => body += c); req.on("end", () => {
    n++;
    const j = JSON.parse(body || "{}");
    const prompt = JSON.stringify(j.contents || "");
    const hasSearch = JSON.stringify(j.tools || j.config?.tools || "").includes("google");
    let text;
    // Scenarios for edge-case tests, picked by the query text.
    if (prompt.includes("ratelimitme")) { res.statusCode = 429; res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ error: { code: 429, message: "Resource has been exhausted (e.g. check quota).", status: "RESOURCE_EXHAUSTED" } })); }
    if (prompt.includes("The developer typed") && prompt.includes("qwzxv")) text = '{"name": "unknown", "website": ""}';
    else if (prompt.includes("The developer typed") && prompt.includes("ssrftest")) text = JSON.stringify({ name: "SsrfTest", website: "http://127.0.0.1:3100", category: "x", supportsOAuth: true, oauthSummary: "", developerPortalUrl: "http://169.254.169.254/latest/meta-data/", docUrls: ["http://localhost:3100/api/probe/github", "http://10.0.0.5/admin", "file:///etc/passwd"], issuerGuesses: ["http://127.0.0.1"], notes: "" });
    else if (prompt.includes("The developer typed") && prompt.includes("garbage")) text = "I could not find that app, sorry.";
    else if (prompt.includes("Write a setup guide") && prompt.includes("Brokenjson")) text = '{"name": "Brokenjson", "verdict": {"difficulty": "impossible"}, "phases": [{"title": "x", "steps": [{"title": "a", "owner": "robot", "confidence": "tested", "sourceIds": [1, 99, "z"]}, {"title": "a", "owner": "you", "confidence": "documented"}]}], "gotchas": "none", "oauth": {"authorizeUrl": 5}}';
    else if (prompt.includes("The developer typed") && prompt.includes("brokenjson")) text = JSON.stringify({ name: "Brokenjson", website: "brokenjson.dev", docUrls: "not-an-array", issuerGuesses: [3] });
    else if (prompt.includes("The developer typed")) text = "```json\n" + JSON.stringify({ name: "Zoom", website: "https://zoom.us", category: "Video", supportsOAuth: true, oauthSummary: "Create an OAuth app in the Zoom App Marketplace.", developerPortalUrl: "https://marketplace.zoom.us/develop/create", docUrls: ["https://developers.zoom.us/docs/integrations/create/"], issuerGuesses: [], notes: "" }) + "\n```";
    else if (prompt.includes("skeptical") || prompt.includes("Check this guide")) text = JSON.stringify({ corrections: [{ target: "effort.approvalWait", problem: "Notes say Zoom states a review timeline is not guaranteed", newConfidence: "unchanged", replacementText: "Not published; reports suggest 1–4 weeks" }, { target: "Pick scopes", problem: "Unsourced", newConfidence: "inferred", replacementText: "" }], uncertain: ["Exact review SLA"], summary: "2 corrections" });
    else if (prompt.includes("Write a setup guide")) text = JSON.stringify(guide);
    else text = "- Zoom apps are created in the App Marketplace [https://developers.zoom.us/docs/integrations/create/]\n- Review needed to publish [https://developers.zoom.us/docs/distribute/]";
    console.error(`#${n} search=${hasSearch} ${prompt.slice(0, 60)}`);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP",
      groundingMetadata: hasSearch ? { webSearchQueries: ["zoom oauth app"], groundingChunks: [{ web: { uri: "https://developers.zoom.us/docs/integrations/oauth/", title: "developers.zoom.us" } }] } : undefined }] }));
  });
}).listen(8787, () => console.error("fake gemini on :8787"));
