# Verification notes

This is a record of how I checked the guides, what turned out to be wrong, and what I still couldn't confirm. Research was done on 30 October 2026.

## How I checked things

Wherever I could, I used the provider's own docs and changelogs. I only fell back on other sources (integration platforms like Nango and Unified.to, security assessors, forum threads) when the provider says nothing, and those claims are labelled as third-party in the guides.

For live evidence, `src/lib/probes.ts` sends real GET requests to each provider's discovery document and authorize endpoint, using a client ID that doesn't exist. `npm run probe` saves the results with timestamps in `src/data/probe-results.json`, and anyone reading a guide can re-run them with the button in its Evidence section.

To test the agent without spending API calls, I ran the whole pipeline against a fake Gemini server (`scripts/fake-gemini.mjs`). That confirmed the stages run in order, sources get numbered properly, citations to sources that don't exist are dropped, and the review pass's corrections actually land in the final guide.

## Claims I confirmed

| Guide | Claim | Where it's confirmed |
|---|---|---|
| Slack | Distributed apps that aren't in the Marketplace get 1 request/minute and 15 objects on `conversations.history` and `conversations.replies`. Internal apps aren't affected. | Slack changelog, 29 May 2025, and its rate-limit FAQ |
| Gmail | In testing mode you get at most 100 test users, and their authorizations (refresh tokens included) expire 7 days after consent. | Google Cloud Help, "Manage App Audience" |
| Gmail | The cap on users who see the unverified-app screen lasts for the life of the project and can't be reset. | Same page |
| Outlook | Since June 2024 every app registration has to live in a directory (tenant). | Microsoft identity platform, breaking changes page |
| Outlook | Users can't consent to multitenant apps registered after November 2020 from unverified publishers, beyond basic sign-in. Verification is free but needs a Partner Center account and MFA. | Publisher verification overview, Entra blog |
| Notion | A Marketplace listing is optional, and Notion says to expect a reply within 5 to 10 business days. | Notion's Marketplace listing guide |
| LinkedIn | The Community Management API has to be the only product on its app. A rejection means reapplying with a new app. The development tier gives you 12 months. | LinkedIn docs on Microsoft Learn |

## Things I had wrong, or sources had wrong

GitHub. I started out assuming OAuth Apps get one callback URL and tokens that never expire. Both changed on 14 August 2026: an app can now have up to 10 callback URLs, and new apps get 8-hour access tokens with 6-month refresh tokens by default. Source: GitHub's changelog.

Notion and refresh tokens. Nango's setup docs say Notion never returns a refresh token and tokens don't expire. Notion's current API reference says otherwise: the token endpoint returns a `refresh_token` (which can be null) and supports a refresh grant, and the refresh token rotates every time it's used. The guide follows Notion's reference and tells you to handle both cases.

Notion's terminology. Integrations are now called "public connections" and live in a new Developer portal. More importantly, the installation scope you pick when you create one is permanent, and it decides whether you can ever list on the Marketplace. Most tutorials don't mention this.

Gmail scopes. Several blog posts say every Gmail scope needs the CASA audit. That's only true for restricted scopes. `gmail.send` is sensitive, so it needs Google's review and a demo video but no audit. My evidence for this is third-party (Unified.to and Nango), so the guide labels it that way and links Google's restricted-scope page.

Slack dates. Slack's changelog says the new limits reached existing unlisted installs on 2 September 2025. A third-party guide says 3 March 2026. I couldn't settle it, so the guide just says "later" and lists the conflict under things that aren't verified.

## What I couldn't verify

How long reviews take. Slack Marketplace, Google verification, LinkedIn's tiers and Microsoft's Partner Center company check have no published timelines. The numbers in the guides come from third-party reports and are labelled that way.

What CASA costs. It depends on the lab and the tier. I quote one lab's published price as an example and nothing more.

Whether Slack, Notion and LinkedIn support PKCE for web apps. None of the pages I read say.

A line in Notion's authorization guide says the authorization URL shows up "after a public connection is submitted for review", which doesn't match the public-connections page. Creating a connection would settle it.

Live probes from my build environment. The sandbox I built this in could only reach package registries, so the probe code was tested against the fake server. The real results come from running `npm run probe` against the deployed app (below).

## Live probe results

Run on 30 October 2026 from my laptop with `npm run probe`, against a local copy of the app. Every check returned a response from the provider.

```

OK   github    GitHub authorize endpoint, called with a fake client_id
          HTTP 302, redirects to github.com/login. Endpoint is live.
OK   github    GitHub 'new OAuth App' page (expect a login redirect)
          HTTP 302, redirects to github.com/login
OK   notion    Notion authorize endpoint, called with a fake client_id
          HTTP 302, redirects to app.notion.com/install-integration. Endpoint is live.
OK   notion    Notion Developer portal
          HTTP 200
OK   slack     Slack OIDC discovery document
          authorize: https://slack.com/openid/connect/authorize · token: https://slack.com/api/openid.connect.token · 3 scopes advertised
OK   slack     Slack OAuth v2 authorize, called with a fake client_id
          HTTP 200; page mentions "client_id=probe-invalid-client&scope=chat:write". Endpoint is live.
OK   outlook   Microsoft identity platform discovery (/common)
          authorize: https://login.microsoftonline.com/common/oauth2/v2.0/authorize · token: https://login.microsoftonline.com/common/oauth2/v2.0/token · 4 scopes advertised
OK   outlook   Microsoft authorize, called with an all-zero client_id
          HTTP 200; page mentions "Error". Endpoint is live.
OK   gmail     Google OIDC discovery document
          authorize: https://accounts.google.com/o/oauth2/v2/auth · token: https://oauth2.googleapis.com/token · PKCE: plain, S256 · 3 scopes advertised
OK   gmail     Google authorize, called with a fake client_id
          HTTP 302, redirects to accounts.google.com/signin/oauth/error. Endpoint is live.
OK   linkedin  LinkedIn OIDC discovery document
          authorize: https://www.linkedin.com/oauth/v2/authorization · token: https://www.linkedin.com/oauth/v2/accessToken · 3 scopes advertised
OK   linkedin  LinkedIn authorize, called with a fake client_id
          HTTP 200; page mentions "error". Endpoint is live.

Saved src/data/probe-results.json
```

Note: Slack's discovery document only covers "Sign in with Slack" (openid/connect endpoints). The OAuth v2 flow used for bot installs (slack.com/oauth/v2/authorize) isn't listed in it, so that endpoint was checked separately.


## Setup attempts

These take about 45 minutes with free accounts. Each one turns a "provider docs" claim into a tested one.

- [ ] GitHub: create an OAuth App with two callback URLs. Check the 10-URL limit, and that a new app issues an expiring token plus a refresh token.
- [ ] Notion: create a public connection. Note whether the authorization URL is available before any review, and whether the token response includes `refresh_token`.
- [ ] Slack: create an app from a manifest and turn on public distribution. Confirm nothing asks for a review.
- [ ] Google: create a project, leave the consent screen in Testing, add `gmail.readonly`. Confirm it's labelled restricted and that the unverified-app warning appears.

## Spot checks on generated guides

Generate guides for two or three apps that aren't in the library (HubSpot, Zoom and Spotify are good ones). For each, check three claims against the sources the guide cites and note whether each was right, wrong or unsupported.

| App | Claim | Result | Notes |
|---|---|---|---|
| | | | |
