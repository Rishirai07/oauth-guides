# OAuth Launch Guides

If you're building an agent and want your users to connect Gmail, Slack or HubSpot, you first need your own OAuth app with each of those providers. Sometimes that takes ten minutes. Sometimes it takes two months and a paid security audit. This project tells you which one you're in for before you start building.

There are two parts:

- A small library of guides I researched by hand. I picked six providers that cover the whole range from easy to painful: GitHub, Notion, Slack, Microsoft Outlook, Gmail and LinkedIn.
- A research agent that writes a guide for any other app while you watch. Type a name or a URL and you get a guide in one to two minutes.

Live demo: https://oauth-guides-lime.vercel.app
To try it, open [the Gmail guide](https://oauth-guides-lime.vercel.app/guides/gmail), or type something that isn't in the library (HubSpot, zoom.us, Spotify) into the search box on the home page.

## What I found when I looked into the problem

Registering the OAuth app is almost never the hard part. On every provider I looked at, you can get a client ID and secret on day one. What developers don't see coming is the gate between "this works on my account" and "my customers can use this", and that gate looks completely different from one provider to the next:

| Provider | What actually decides your launch date |
|---|---|
| GitHub | Nothing on GitHub's side. Your customers' org admins can still block unapproved OAuth apps. |
| Notion | No review, but one setting (installation scope) that can't be changed after you create the app. |
| Slack | Marketplace review. Without it, a distributed app can only read message history at 1 request per minute. |
| Microsoft | Publisher verification through Partner Center, then each customer tenant's consent policy. |
| Gmail | Reading email needs "restricted" scopes, which means Google's review plus a yearly third-party security assessment (CASA). |
| LinkedIn | Most of the API is only open to vetted partners, and a rejection means starting over with a new app. |

So a useful guide can't just be a list of console clicks. It needs to answer: what is the gate, what triggers it, how long does it take, and can I design around it? There often is a way around it. A Gmail agent that only sends mail can use `gmail.send`, which is "sensitive" rather than "restricted" and skips the audit entirely. That one fact can move a launch from months to about a week.

## Decisions I made

The top of each guide shows the difficulty and two separate time estimates: how much work you'll do, and how long you'll wait on the provider. The wait is what you end up planning a launch around, and folding both into one number hides it.

Each guide has a section called "Ways your app can exist". Testing mode, unlisted and reviewed apps behave very differently (Google's 100 test users whose tokens expire after 7 days, Slack's rate limits for unlisted apps), and choosing between them is usually the real decision.

Every step says who does it. Some an agent can do outright (write the Slack manifest, implement token refresh), some an agent can draft for you to submit (scope justifications, a demo-video script), and some only a person can do (sign in, accept terms, verify a company, pay an assessor). That's how the guide answers "what can an agent do for me?" without hand-waving.

Every claim also says where it comes from: a live test, the provider's docs, a third-party write-up, or inference. I was strict about "tested". It only means our server actually sent a request to that provider and recorded the response. Sources are numbered and linked, and each guide ends with what was corrected during research and what's still unverified. I'd rather show a gap than paper over it.

Guides are easy to pass around. Each one has its own URL, a Markdown export you can paste into Cursor or Claude Code, and a print stylesheet. If the server isn't configured with storage, the share link carries the whole guide in the URL, so links still work.

On scope: I went for six guides done properly rather than thirty thin ones, and put the rest of the effort into the live generator, since that's what has to handle the long tail.

## How the agent works

The code is in `src/lib/agent/pipeline.ts`. It uses Gemini through `@google/genai` and streams progress to the browser as newline-delimited JSON.

1. Gemini, with Google Search grounding, works out which product the user means, where its developer portal is, and which docs pages cover OAuth.
2. The server fetches those pages itself (it tries the `.md` version first, since a lot of docs sites serve one) and, at the same time, probes the provider. It looks for OpenID/OAuth discovery documents in the usual places, checks the developer portal responds, and if it finds an authorize endpoint, calls it with a client ID that can't exist to confirm it's live. These probes are the only source of "tested" claims.
3. Three research passes run in parallel: one on setup, one on approval and review, one on tokens, limits and gotchas. They have to cite a URL for every point and call out disagreements between sources.
4. A writing pass turns the notes into a guide that matches a JSON schema (`src/lib/agent/schema.ts`). The output is normalized afterwards, so a missing or malformed field can't break the page.
5. A review pass compares the guide against the notes and probe results. Claims it can't support get downgraded or rewritten, and each change is recorded in the guide.

It's built to keep going when parts fail. If a model ID isn't available it tries the next one (`GEMINI_MODEL`, then `gemini-flash-latest`, `gemini-3.5-flash`, `gemini-2.5-flash`). It retries on rate limits, falls back to a keyless search if grounding isn't available, and sends keep-alive lines so proxies don't drop the stream. It also refuses to fetch anything that resolves to a private or local address, since the URLs it fetches come from model output.

## Running it locally

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

You can get a free Gemini key at https://aistudio.google.com/apikey. The other settings are optional:

| Variable | What it does |
|---|---|
| `GEMINI_API_KEY` | Needed for live generation. The library works without it. |
| `GEMINI_MODEL` | Model IDs to try first, comma-separated. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Storage for generated guides, so they get permanent links. Vercel's `KV_REST_API_*` names work too. |
| `GENERATE_LIMIT_PER_10MIN` | Generations allowed per IP per 10 minutes. Defaults to 6. |
| `MOCK_AGENT` | Set to `1` to play back a fake run without calling Gemini. |

If live generation fails, run `npm run check-gemini` first. It tests which Gemini models your key can use, with and without Google Search, and tells you what to put in `GEMINI_MODEL`. Free keys often can't use Search; the agent copes with that by reading the provider's docs directly.

Two more scripts are worth knowing about. `npm run probe -- <url>` runs the live checks for every curated guide against a running copy of the app and saves the results in `src/data/probe-results.json`, which ships with the guides. `npm run fake-gemini` starts a stand-in for the Gemini API on port 8787; point the app at it with `GEMINI_BASE_URL=http://localhost:8787 GEMINI_API_KEY=x` and you can run the whole pipeline offline.

## Deploying to Vercel

Import the GitHub repo into Vercel (it detects Next.js on its own) and add `GEMINI_API_KEY` under Settings → Environment Variables. I'd also add Upstash for Redis from the Storage tab so generated guides survive restarts. After it's deployed, run `npm run probe -- https://<your-app>.vercel.app` and commit the results file.

`/api/generate` is allowed to run for up to 300 seconds. A normal run takes 60 to 120.

## Where things are

```
src/data/guides/          the six curated guides
src/lib/types.ts          the guide schema (shared by curated and generated guides)
src/lib/agent/            pipeline, Gemini client, page fetching, schema, mock run
src/lib/probes.ts         live endpoint checks
src/lib/net.ts            blocks private/internal URLs before fetching
src/lib/store.ts          Redis storage, with an in-memory fallback
src/app/api/generate/     the streaming agent endpoint
src/app/guides/[slug]/    guide pages and the Markdown export
src/app/generate/         the live generation screen
VERIFICATION.md           what I checked, what I corrected, what I couldn't confirm
```

## Known limitations

I didn't complete any provider approvals while building this, so approval wait times come from what providers say publicly or from third-party reports, and the guides label them that way.

The live checks prove an endpoint exists and show how it reacts to an unknown client. They don't prove that a full sign-in works, because that needs an app registered with each provider.

Generated guides aren't reviewed by a person. The review pass catches unsupported claims, but it works from the same evidence as the writer, so anything marked "inferred" should be treated as something to check.

Docs sites that only render with JavaScript give the fetcher very little text. When that happens the agent leans on search results, and the guide says so.

Without Redis, generated guides live in memory and disappear when the server instance restarts. Share links keep working because they carry the guide with them. The per-IP rate limit is also in memory, so on serverless it's per instance. It slows abuse down but won't stop a determined attempt.

## What I'd do next

Re-run the probes on a schedule and watch provider changelogs, so a guide gets flagged when something it relies on changes. Use a browser agent with test accounts to go through the real setup flows and turn more "docs" claims into "tested" ones. Add a mode where you paste the scopes you plan to request and get back your exact review path. And grow the library toward 100 guides by letting the agent write first drafts and having a person check the inferred parts.
