import type { Guide } from "@/lib/types";

export const github: Guide = {
  slug: "github",
  name: "GitHub",
  website: "https://github.com",
  category: "Developer tools",
  tagline: "Self-serve, no review. The main decision is OAuth App vs GitHub App.",
  origin: "curated",
  updatedAt: "2026-10-30",

  verdict: {
    difficulty: "easy",
    headline: "Live in under an hour. No approval step.",
    why: "Any GitHub account can register an OAuth App and any GitHub user can authorize it immediately. The friction is on your users' side: organizations that restrict third-party OAuth apps must approve yours before it can see their org repos.",
  },
  effort: {
    handsOn: "15–45 min",
    approvalWait: "None (Marketplace listing is optional and separately reviewed)",
    timeToFirstConnection: "Same session",
    timeToProduction: "Same day",
    cost: "Free",
  },
  modes: [
    {
      name: "OAuth App",
      whatYouGet: "Acts as the user, across everything the user can access, limited by coarse scopes (repo, read:org, …).",
      limits: "Org owners can block it via OAuth app access restrictions.",
      reviewNeeded: "None",
    },
    {
      name: "GitHub App (user-to-server)",
      whatYouGet: "Fine-grained permissions, installed per org/repo, plus app-level installation tokens for background jobs.",
      limits: "Users must install the app on the org/repos you need; more moving parts.",
      reviewNeeded: "None",
    },
    {
      name: "GitHub Marketplace listing",
      whatYouGet: "Discoverability and paid plans via GitHub billing.",
      limits: "Optional; not required for OAuth to work.",
      reviewNeeded: "Yes, GitHub reviews listings",
    },
  ],
  prerequisites: [
    { item: "A GitHub account, ideally an organization to own the app", why: "Apps owned by a personal account are stranded if that person leaves.", required: true },
    { item: "An HTTPS callback URL (localhost is fine for dev)", why: "GitHub redirects the authorization code here.", required: true },
    { item: "A homepage URL", why: "Shown on the consent screen.", required: true },
  ],
  phases: [
    {
      title: "Decide",
      goal: "Pick the app type before you register. Switching later means every user has to authorize again.",
      steps: [
        {
          title: "Choose OAuth App vs GitHub App",
          detail: "If your agent acts on repositories inside orgs, GitHub recommends a GitHub App (fine-grained permissions, short-lived tokens, survives user departure). Use an OAuth App for simple 'act as this user' access across everything they can see.",
          owner: "agent_assist",
          confidence: "documented",
          sourceIds: [1],
        },
        {
          title: "List the scopes your features need",
          detail: "OAuth App scopes are coarse: `repo` grants full read/write to private repos. Ask for `read:user user:email` for identity, add `repo` only if you truly write to private repos.",
          owner: "agent",
          confidence: "documented",
          sourceIds: [2],
        },
      ],
    },
    {
      title: "Register",
      goal: "Get a client ID and secret.",
      steps: [
        {
          title: "Create the OAuth App",
          detail: "Settings → Developer settings → OAuth Apps → New OAuth App (use the org's settings page for an org-owned app). Fill in name, homepage URL and callback URL.",
          owner: "you",
          time: "5 min",
          links: ["https://github.com/settings/applications/new"],
          confidence: "documented",
          sourceIds: [3],
        },
        {
          title: "Add every callback URL you need",
          detail: "Since the August 14, 2026 update an OAuth App can hold up to 10 callback URLs, so production, preview and localhost can share one app. Wildcard matching is now an opt-in per URL; leave it off unless you need it.",
          owner: "you",
          confidence: "documented",
          sourceIds: [4],
        },
        {
          title: "Generate a client secret and store it server-side",
          detail: "Generate a secret on the app page and store it in your secrets manager. It is shown once.",
          owner: "you",
          confidence: "documented",
          sourceIds: [3],
        },
      ],
    },
    {
      title: "Implement & test",
      goal: "Complete one real authorization end-to-end.",
      steps: [
        {
          title: "Build the authorize → callback → token exchange",
          detail: "Redirect to /login/oauth/authorize with client_id, redirect_uri, scope, state (and PKCE S256 code_challenge). POST the code to /login/oauth/access_token with `Accept: application/json`. Without that header the response comes back form-encoded.",
          owner: "agent",
          confidence: "community",
          sourceIds: [5],
        },
        {
          title: "Handle expiring tokens",
          detail: "New apps now get 8-hour access tokens plus 6-month refresh tokens by default. Store expires_at and refresh before calling the API, or explicitly disable expiring tokens in app settings if your token store can't refresh yet.",
          owner: "agent",
          confidence: "documented",
          sourceIds: [4],
        },
        {
          title: "Test with an account that belongs to a restricted org",
          detail: "Authorize with a user in an org that has OAuth app access restrictions enabled and confirm your UI explains how to request org approval when org repos come back empty.",
          owner: "you",
          confidence: "documented",
          sourceIds: [6],
        },
      ],
    },
  ],
  approval: {
    required: "no",
    trigger: "Nothing. OAuth works for any GitHub user right after registration. Only a Marketplace listing is reviewed.",
    process: ["Optional: submit a Marketplace listing for review if you want to sell through GitHub."],
    typicalWait: "None",
    confidence: "documented",
  },
  gotchas: [
    {
      title: "Org restrictions silently hide repos",
      detail: "When an org has OAuth app access restrictions, your token works but returns no org-private data until an org owner approves your app. Users see 'it connected but nothing shows up'.",
      impact: "high",
      confidence: "documented",
      sourceIds: [6],
    },
    {
      title: "Tokens now expire by default for new apps",
      detail: "Apps created after the Aug 2026 change get 8h access tokens. Code copied from older tutorials that assumes non-expiring tokens will break after 8 hours.",
      impact: "high",
      confidence: "documented",
      sourceIds: [4],
    },
    {
      title: "`repo` scope is all-or-nothing",
      detail: "There is no read-only private repo scope for OAuth Apps. If that is too broad for your users' security teams, use a GitHub App.",
      impact: "medium",
      confidence: "documented",
      sourceIds: [2],
    },
    {
      title: "User email can be null",
      detail: "GET /user returns email: null when the user has no public email. Request `user:email` and read /user/emails.",
      impact: "low",
      confidence: "community",
      sourceIds: [5],
    },
  ],
  blockers: [
    { symptom: "redirect_uri_mismatch", cause: "Callback URL in the request doesn't match a registered callback URL.", fix: "Add the exact URL (scheme, host, port, path) to the app's callback URLs. You can have up to 10." },
    { symptom: "User connected but org repos are missing", cause: "Org has OAuth app access restrictions.", fix: "Ask the user to request approval (Settings → Applications → Authorized OAuth Apps → your app → Request), or have an org owner grant it." },
    { symptom: "401 Bad credentials after ~8 hours", cause: "Expiring tokens are on and you aren't refreshing.", fix: "Use the refresh_token grant against /login/oauth/access_token and store the new pair." },
  ],
  handoff: {
    agentCan: [
      "Recommend OAuth App vs GitHub App from your feature list",
      "Pick minimal scopes and explain each to your users",
      "Write the callback handler, PKCE and refresh-token logic",
      "Probe the authorize endpoint to confirm the flow responds",
      "Generate a GitHub App manifest so app creation is one click",
    ],
    youMust: [
      "Create the app while signed in to GitHub (OAuth Apps can't be created via API)",
      "Copy the client secret into your secrets manager",
      "Decide which org owns the app",
    ],
  },
  oauth: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    pkce: "Supported (S256)",
    refreshTokens: "On by default for apps created since Aug 2026 (8h access, 6-month refresh). You can opt out.",
    accessTokenLifetime: "8 hours when expiring tokens are enabled; otherwise until revoked",
    redirectUris: "Up to 10 callback URLs per OAuth App; optional wildcard matching per URL",
    scopesNote: "Coarse scopes (repo, read:org, user:email, …). Fine-grained permissions require a GitHub App.",
    discovery: "No OIDC discovery document for user OAuth",
  },
  sources: [
    { id: 1, title: "Differences between GitHub Apps and OAuth apps", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps", kind: "official" },
    { id: 2, title: "Scopes for OAuth apps", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps", kind: "official" },
    { id: 3, title: "Creating an OAuth app", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app", kind: "official" },
    { id: 4, title: "Changelog 2026-08-14: multiple redirect URIs and token refresh for OAuth apps", url: "https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps", kind: "official" },
    { id: 5, title: "OpenReplay: How to add GitHub login (PKCE, Accept header, email)", url: "https://blog.openreplay.com/pt/adicionar-login-github/", kind: "third_party" },
    { id: 6, title: "About OAuth app access restrictions", url: "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions", kind: "official" },
  ],
  tested: [],
  uncertain: [
    "How long a GitHub Marketplace review takes. GitHub doesn't publish it.",
    "Whether apps created before Aug 2026 will eventually be forced onto expiring tokens.",
  ],
  reviewNotes: [
    "Corrected: my starting assumption was 'one callback URL per OAuth App, tokens never expire'. The Aug 14, 2026 changelog changed both.",
  ],
};
