import type { Guide } from "@/lib/types";

export const notion: Guide = {
  slug: "notion",
  name: "Notion",
  website: "https://www.notion.com",
  category: "Docs & knowledge",
  tagline: "Self-serve public connection. One irreversible setting to get right.",
  origin: "curated",
  updatedAt: "2026-10-30",

  verdict: {
    difficulty: "easy",
    headline: "Working OAuth the same day; Marketplace listing is optional.",
    why: "Public connections work for other workspaces without a review. The traps are product-level: the installation scope can't be changed after creation, and your agent only sees the pages each user explicitly picks.",
  },
  effort: {
    handsOn: "30–60 min",
    approvalWait: "None to use OAuth. Marketplace listing: Notion says 5–10 business days for a response.",
    timeToFirstConnection: "Same session",
    timeToProduction: "Same day (unlisted) · ~1–2 weeks if you want a Marketplace listing",
    cost: "Free",
  },
  modes: [
    { name: "Internal connection", whatYouGet: "A single token for one workspace, no OAuth.", limits: "Only your workspace; not for your customers.", reviewNeeded: "None" },
    { name: "Public connection, selected workspaces only", whatYouGet: "OAuth limited to workspaces you choose at creation.", limits: "Never Marketplace-eligible; scope can't be changed later.", reviewNeeded: "None" },
    { name: "Public connection, any workspace", whatYouGet: "OAuth for any Notion user.", limits: "Users choose which pages you can see.", reviewNeeded: "None to work; review only if listed" },
    { name: "Marketplace listing", whatYouGet: "Discoverability in Notion's Marketplace.", limits: "Requires 'Any workspace' scope.", reviewNeeded: "Yes, by the Notion team" },
  ],
  prerequisites: [
    { item: "A Notion workspace you can use for development", why: "Public connections are created against a development workspace.", required: true },
    { item: "HTTPS redirect URI(s)", why: "Where Notion sends the authorization code.", required: true },
    { item: "Listing assets (logo, description, images)", why: "Only needed for a Marketplace listing.", required: false },
  ],
  phases: [
    {
      title: "Create the public connection",
      goal: "Get an OAuth client ID and secret.",
      steps: [
        {
          title: "Decide the installation scope first. You can't change it later",
          detail: "Choose 'Any workspace' unless you are sure you'll never list on the Marketplace. Picking 'Selected workspaces only' and changing your mind later means creating a new connection and re-authorizing users.",
          owner: "you",
          confidence: "documented",
          sourceIds: [1],
        },
        {
          title: "Create it in the Developer portal",
          detail: "Developer portal → Build → Public connections → Create new connection. Set name, development workspace, redirect URI(s) and capabilities (read / update / insert content, user info).",
          owner: "you",
          time: "10 min",
          links: ["https://www.notion.so/developers/connections"],
          confidence: "documented",
          sourceIds: [1],
        },
        {
          title: "Copy client ID, secret and the authorization URL",
          detail: "All three are on the connection's Configuration tab. Keep the secret on your server. Notion has no secretless public-client option.",
          owner: "you",
          confidence: "documented",
          sourceIds: [2],
        },
      ],
    },
    {
      title: "Implement & test",
      goal: "One real user connects and your agent can read a page.",
      steps: [
        {
          title: "Exchange the code",
          detail: "POST https://api.notion.com/v1/oauth/token with HTTP Basic auth (client_id:client_secret), grant_type=authorization_code, code and redirect_uri. Send a Notion-Version header on every API call.",
          owner: "agent",
          confidence: "documented",
          sourceIds: [3],
        },
        {
          title: "Store access and refresh tokens; handle rotation",
          detail: "The current token endpoint returns a refresh_token (nullable) and supports grant_type=refresh_token. Each refresh also replaces the refresh token, so save the new one atomically. Also handle a null refresh_token.",
          owner: "agent",
          confidence: "documented",
          sourceIds: [3, 4],
        },
        {
          title: "Design for the page picker",
          detail: "During consent the user picks which pages/databases to share. Show users how to share more pages later, and handle 'object not found' as 'not shared', not as a bug.",
          owner: "agent_assist",
          confidence: "documented",
          sourceIds: [5],
        },
      ],
    },
    {
      title: "Optional: list on the Marketplace",
      goal: "Be discoverable inside Notion.",
      steps: [
        {
          title: "Create a listing and submit for review",
          detail: "Marketplace listing dashboard → Start a new connection listing → fill in description, category, images, and link the public connection → Submit. Expect a reply in 5–10 business days; you can resubmit after feedback.",
          owner: "agent_assist",
          confidence: "documented",
          sourceIds: [6],
        },
      ],
    },
  ],
  approval: {
    required: "conditional",
    trigger: "Only if you want a Marketplace listing. OAuth works without it.",
    process: ["Draft listing", "Submit for Notion review", "Address feedback and resubmit if needed"],
    typicalWait: "5–10 business days for a response (Notion's stated estimate)",
    confidence: "documented",
  },
  gotchas: [
    { title: "Installation scope is irreversible", detail: "Set at creation; a new connection is the only way to change it.", impact: "high", confidence: "documented", sourceIds: [1] },
    { title: "Your agent only sees pages the user picked", detail: "There are no broad 'read the whole workspace' scopes. Empty search results usually mean the user didn't share that page.", impact: "high", confidence: "documented", sourceIds: [5] },
    { title: "Every user authorizes individually", detail: "One person connecting doesn't grant access for the rest of their workspace; each member does their own OAuth flow.", impact: "medium", confidence: "documented", sourceIds: [1] },
    { title: "Refresh-token guidance online is outdated", detail: "Some integration-platform docs still say Notion never returns refresh tokens. The current API reference returns one and rotates it on every refresh. Code for both.", impact: "medium", confidence: "documented", sourceIds: [3, 7] },
  ],
  blockers: [
    { symptom: "Can't list on Marketplace", cause: "Connection was created with 'Selected workspaces only'.", fix: "Create a new 'Any workspace' connection and migrate users." },
    { symptom: "invalid_grant on refresh", cause: "Used an old refresh token after rotation, or the user removed the connection.", fix: "Store the latest refresh token on every refresh; single-flight refreshes; re-authorize if revoked." },
    { symptom: "API returns object_not_found", cause: "Page not shared with your connection.", fix: "Ask the user to add the connection to that page (••• → Connections)." },
  ],
  handoff: {
    agentCan: [
      "Write the OAuth handler, Basic-auth token exchange and rotation-safe refresh",
      "Draft the Marketplace listing copy",
      "Generate user-facing 'how to share a page' instructions",
    ],
    youMust: [
      "Create the connection in the Developer portal and pick the installation scope",
      "Store the client secret",
      "Submit the Marketplace listing, if you want one",
    ],
  },
  oauth: {
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    pkce: "Not documented. Use the client secret plus state.",
    refreshTokens: "Yes in current API reference (rotating); nullable",
    redirectUris: "Configured on the connection; redirect_uri required if more than one is registered",
    scopesNote: "No OAuth scopes. Capabilities are set on the connection and each user picks which pages to share.",
  },
  sources: [
    { id: 1, title: "Notion: Public connections (installation scope)", url: "https://developers.notion.com/guides/get-started/public-connections", kind: "official" },
    { id: 2, title: "Notion: Authorization guide", url: "https://developers.notion.com/guides/get-started/authorization", kind: "official" },
    { id: 3, title: "Notion API: Create a token (POST /v1/oauth/token)", url: "https://developers.notion.com/reference/create-a-token", kind: "official" },
    { id: 4, title: "Nango: Notion refresh token invalid_grant (rotation)", url: "https://nango.dev/blog/notion-oauth-refresh-token-invalid-grant", kind: "third_party" },
    { id: 5, title: "Notion developer guides overview (page picker)", url: "https://developers.notion.com/guides", kind: "official" },
    { id: 6, title: "Notion: List on the Marketplace", url: "https://developers.notion.com/guides/get-started/marketplace-listing", kind: "official" },
    { id: 7, title: "Nango: Register your own Notion OAuth app (says there are no refresh tokens; out of date)", url: "https://nango.dev/docs/api-integrations/notion/how-to-register-your-own-notion-api-oauth-app", kind: "third_party" },
  ],
  tested: [],
  uncertain: [
    "Notion's authorization guide says the authorization URL field populates 'after a public connection is submitted for review'. It's unclear whether this is old wording; the public-connections page describes no review before others can install. Test by creating a connection.",
    "Access token lifetime when a refresh token is returned isn't stated in the pages we read.",
    "PKCE support isn't documented.",
  ],
  reviewNotes: [
    "Corrected: one third-party guide says Notion returns no refresh token and tokens never expire. Notion's current API reference returns refresh_token and has a refresh grant, so the guide follows the official reference.",
    "Updated terminology: Notion now calls integrations 'connections' and uses a new Developer portal.",
  ],
};
