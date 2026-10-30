import type { Guide } from "@/lib/types";

export const slack: Guide = {
  slug: "slack",
  name: "Slack",
  website: "https://slack.com",
  category: "Communication",
  tagline: "OAuth is instant. Reading message history at a useful rate needs Marketplace approval.",
  origin: "curated",
  updatedAt: "2026-10-30",

  verdict: {
    difficulty: "moderate",
    headline: "Any workspace can install it today. Reading history, though, is capped at 1 request a minute until you're in the Marketplace.",
    why: "You can distribute an app to any workspace without review. Since May 29, 2025, commercially distributed apps not approved for the Slack Marketplace get conversations.history / conversations.replies cut to 1 request per minute and 15 messages per request. For an AI agent that reads channels, that pushes you to the Marketplace review.",
  },
  effort: {
    handsOn: "1–3 h",
    approvalWait: "None for unlisted distribution. Marketplace review: not published; plan for weeks.",
    timeToFirstConnection: "Same session",
    timeToProduction: "Same day if you only post/act · weeks if you need history at normal limits",
    cost: "Free",
  },
  modes: [
    { name: "Internal (single workspace)", whatYouGet: "Full rate limits (50+ req/min, up to 1,000 messages per call on history).", limits: "Only your own workspace.", reviewNeeded: "None" },
    { name: "Unlisted, publicly distributed", whatYouGet: "Any workspace can install via your OAuth link.", limits: "conversations.history/replies: 1 req/min, 15 objects. Slack's updated terms point commercial distribution to the Marketplace.", reviewNeeded: "None" },
    { name: "Slack Marketplace", whatYouGet: "Normal rate limits and a listing.", limits: "Must meet Marketplace guidelines.", reviewNeeded: "Yes, Slack reviews it" },
  ],
  prerequisites: [
    { item: "A Slack workspace for development", why: "Apps are created in and first installed to a dev workspace.", required: true },
    { item: "HTTPS redirect URL", why: "Required before you can activate public distribution.", required: true },
    { item: "Privacy policy, support page, landing page", why: "Required for a Marketplace submission.", required: false },
  ],
  phases: [
    {
      title: "Create the app",
      goal: "A Slack app with the right scopes, installed in your dev workspace.",
      steps: [
        {
          title: "Generate an app manifest",
          detail: "Describe the bot, scopes (bot scopes vs user scopes), redirect URLs and event subscriptions in a manifest. Paste it at api.slack.com/apps → Create New App → From a manifest.",
          owner: "agent",
          time: "10 min",
          links: ["https://api.slack.com/apps"],
          confidence: "documented",
          sourceIds: [1],
        },
        {
          title: "Install to your dev workspace and test",
          detail: "OAuth & Permissions → Install to Workspace. Confirm the bot token can call the methods you need.",
          owner: "you",
          confidence: "documented",
          sourceIds: [1],
        },
      ],
    },
    {
      title: "Distribute",
      goal: "Let other workspaces connect via OAuth.",
      steps: [
        {
          title: "Implement OAuth v2",
          detail: "Send users to https://slack.com/oauth/v2/authorize with client_id, scope (bot), user_scope (user), redirect_uri and state. Exchange the code at oauth.v2.access. Store the bot token per workspace (team.id) and user tokens per user.",
          owner: "agent",
          confidence: "documented",
          sourceIds: [2],
        },
        {
          title: "Activate public distribution",
          detail: "Manage Distribution → complete the checklist (remove hard-coded info, HTTPS redirect URL) → Activate. No review is required at this step.",
          owner: "you",
          confidence: "documented",
          sourceIds: [2],
        },
        {
          title: "Decide whether you need history reads",
          detail: "If your agent summarizes channels or threads, test at 1 request/min and 15 messages. Prefer the Events API (receive messages as they happen) over backfilling with history calls.",
          owner: "agent_assist",
          confidence: "documented",
          sourceIds: [3, 4],
        },
      ],
    },
    {
      title: "Marketplace (if you read history or sell commercially)",
      goal: "Lift the rate limits and comply with distribution terms.",
      steps: [
        {
          title: "Prepare and submit to the Slack Marketplace",
          detail: "Assemble listing, privacy policy, support/contact pages, and test instructions; submit from the app's Marketplace settings. Slack reviews functionality, security and guidelines.",
          owner: "agent_assist",
          confidence: "documented",
          sourceIds: [5],
        },
      ],
    },
  ],
  approval: {
    required: "conditional",
    trigger: "Marketplace approval is needed for normal conversations.history/replies rate limits on distributed apps, and Slack's 2025 terms update says the Marketplace is the appropriate channel for commercial distribution.",
    process: ["Activate public distribution (no review)", "Submit to Slack Marketplace", "Respond to reviewer feedback"],
    typicalWait: "Slack doesn't publish one. Plan for several weeks.",
    confidence: "documented",
  },
  gotchas: [
    { title: "1 req/min history limit for unlisted apps", detail: "Applies to apps created after May 29, 2025 and new installs; existing unlisted installs were moved over later. Internal (single-workspace) apps are not affected.", impact: "high", confidence: "documented", sourceIds: [3, 4] },
    { title: "Commercial distribution terms", detail: "Slack's updated terms say the Marketplace is the only appropriate channel for commercially distributing apps, listed or unlisted. Have someone read the terms before relying on an unlisted app.", impact: "high", confidence: "documented", sourceIds: [6] },
    { title: "Workspace admins may need to approve your app", detail: "Many paid workspaces require admin approval for app installs, so a user's 'Allow' click can turn into a pending request.", impact: "medium", confidence: "inferred" },
    { title: "Bot vs user scopes are separate parameters", detail: "`scope` is for the bot token, `user_scope` for user tokens. Mixing them up gives you a token without the permission you expected.", impact: "low", confidence: "documented", sourceIds: [2] },
  ],
  blockers: [
    { symptom: "ratelimited on conversations.history", cause: "Unlisted distributed app under the 2025 limits.", fix: "Use the Events API, cache, back off using Retry-After, or get Marketplace approval." },
    { symptom: "Can't activate public distribution", cause: "Checklist incomplete (non-HTTPS redirect, hard-coded info).", fix: "Complete every item under Manage Distribution." },
    { symptom: "User sees 'request to install'", cause: "Workspace requires admin approval.", fix: "Give users a short note to send their admin explaining your scopes." },
  ],
  handoff: {
    agentCan: [
      "Write the app manifest (scopes, events, redirect URLs)",
      "Implement OAuth v2 and per-workspace token storage",
      "Estimate whether your features survive the 1 req/min limit",
      "Draft the Marketplace listing and test instructions",
    ],
    youMust: [
      "Create the app from the manifest while signed in to Slack",
      "Click Activate Public Distribution",
      "Submit the Marketplace application and deal with the reviewer",
      "Decide, with legal input, whether you're 'commercially distributing'",
    ],
  },
  oauth: {
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    pkce: "Not confirmed in sources we checked",
    refreshTokens: "Only if you enable token rotation (then access tokens expire)",
    redirectUris: "Multiple redirect URLs allowed; HTTPS required for distribution",
    scopesNote: "Granular scopes; separate bot (`scope`) and user (`user_scope`) lists.",
    discovery: "https://slack.com/.well-known/openid-configuration (Sign in with Slack / OIDC)",
  },
  sources: [
    { id: 1, title: "Slack: Create an app / app manifests", url: "https://api.slack.com/reference/manifests", kind: "official" },
    { id: 2, title: "Slack: Installing with OAuth", url: "https://api.slack.com/authentication/oauth-v2", kind: "official" },
    { id: 3, title: "Slack changelog 2025-05-29: rate limit changes for non-Marketplace apps", url: "https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps", kind: "official" },
    { id: 4, title: "Slack: terms + rate limit update FAQ", url: "https://api.slack.com/changelog/2025-05-terms-rate-limit-update-and-faq", kind: "official" },
    { id: 5, title: "Slack Marketplace guidelines", url: "https://api.slack.com/slack-marketplace/guidelines", kind: "official" },
    { id: 6, title: "Slack developer changelog (commercial distribution clarification)", url: "https://api.slack.com/automation/changelog", kind: "official" },
  ],
  tested: [],
  uncertain: [
    "How long Marketplace review takes. Slack doesn't publish a figure.",
    "The date the limits applied to existing unlisted installs: the changelog says Sept 2, 2025; a third-party guide says Mar 3, 2026 (likely a later extension). We present it as 'later'.",
    "PKCE support for Slack OAuth v2 wasn't confirmed in the sources we checked.",
  ],
  reviewNotes: [
    "Added after research: the 2025 rate-limit change is the deciding factor for AI agents and isn't visible from the OAuth docs alone.",
  ],
};
