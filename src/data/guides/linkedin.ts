import type { Guide } from "@/lib/types";

export const linkedin: Guide = {
  slug: "linkedin",
  name: "LinkedIn",
  website: "https://www.linkedin.com",
  category: "Social & marketing",
  tagline: "Sign-in and sharing are self-serve. Almost everything else is a vetted program you may not qualify for.",
  origin: "curated",
  updatedAt: "2026-10-30",

  verdict: {
    difficulty: "very_hard",
    headline: "Sign-in today; Page/ads data needs vetting, a 12-month dev tier, and a screencast review.",
    why: "Any app can add 'Sign In with LinkedIn using OpenID Connect' and 'Share on LinkedIn'. Reading or managing organization pages needs the Community Management API: a vetted application (registered legal organization, business email, verified domain/Page), a restricted Development tier, then a separate Standard tier review with a screen recording. If you're rejected, you lose that app and have to apply again with a new one.",
  },
  effort: {
    handsOn: "30 min (sign-in/share) · days of integration + paperwork (Community Management)",
    approvalWait: "None for self-serve products · Vetting for Development tier, then a separate Standard tier review (durations not published)",
    timeToFirstConnection: "Same day for sign-in/share",
    timeToProduction: "Same day (sign-in/share) · weeks to months (Community Management Standard tier)",
    cost: "Free, but eligibility is restricted to registered organizations with commercial use cases",
  },
  modes: [
    { name: "Self-serve products", whatYouGet: "OIDC sign-in (openid, profile, email) and posting on the member's behalf (w_member_social).", limits: "No connections, no broad profile data.", reviewNeeded: "None" },
    { name: "Community Management, Development tier", whatYouGet: "Organization page APIs with call restrictions, for building and testing.", limits: "Must finish integrating within 12 months.", reviewNeeded: "Yes: access request and vetting" },
    { name: "Community Management, Standard tier", whatYouGet: "Full production access.", limits: "Approved use cases only.", reviewNeeded: "Yes: a form plus a screencast of each use case" },
    { name: "Other partner programs (Sales, Talent, etc.)", whatYouGet: "Specialized data.", limits: "Partnership-only.", reviewNeeded: "Partnership agreement" },
  ],
  prerequisites: [
    { item: "A LinkedIn Company Page, with an admin who can verify your app", why: "Every developer app must be associated with a Page.", required: true },
    { item: "Privacy policy URL and app logo", why: "Required at app creation.", required: true },
    { item: "Registered legal organization, business email, verified website/domain", why: "Required to pass Community Management vetting.", required: false },
  ],
  phases: [
    {
      title: "Self-serve setup",
      goal: "Sign-in or posting working today.",
      steps: [
        { title: "Create the developer app", detail: "linkedin.com/developers/apps → Create app → name, Company Page, privacy policy URL, logo.", owner: "you", time: "10 min", links: ["https://www.linkedin.com/developers/apps/new"], confidence: "documented", sourceIds: [1] },
        { title: "Have a Page admin verify the app", detail: "Settings → Verify → send the link to a Page admin. Unverified apps can't request most products.", owner: "you", confidence: "documented", sourceIds: [1] },
        { title: "Add self-serve products and redirect URLs", detail: "Products → add 'Sign In with LinkedIn using OpenID Connect' and/or 'Share on LinkedIn'. Auth tab → authorized redirect URLs; copy client ID and secret.", owner: "you", confidence: "documented", sourceIds: [1] },
        { title: "Implement the 3-legged flow", detail: "Authorize at /oauth/v2/authorization, exchange at /oauth/v2/accessToken. Plan for users to reconnect when tokens expire. Programmatic refresh tokens are only given to approved partners.", owner: "agent", confidence: "documented", sourceIds: [2] },
      ],
    },
    {
      title: "Community Management API (only if you need Page data)",
      goal: "Vetted access to organization pages.",
      steps: [
        { title: "Create a dedicated new app", detail: "Community Management must be the only product on its app, so its request button is greyed out if the app has other products or pending requests.", owner: "you", confidence: "documented", sourceIds: [3] },
        { title: "Submit the Development tier access form", detail: "Business identity, company and product overview, use case, test credentials. A rejection means creating a new app to reapply.", owner: "agent_assist", confidence: "documented", sourceIds: [4] },
        { title: "Build fully within the Development tier", detail: "You get restricted call volumes and must complete the integration within 12 months.", owner: "agent", confidence: "documented", sourceIds: [5] },
        { title: "Apply for Standard tier with a screencast", detail: "Record each use case exactly as described in your form. A rejected Standard request also means starting again with a new app at Development tier.", owner: "you", confidence: "documented", sourceIds: [4] },
      ],
    },
  ],
  approval: {
    required: "conditional",
    trigger: "Anything beyond OIDC sign-in and member sharing (Page management, analytics, ads, profile data).",
    process: ["Development tier access request + identity vetting", "Build and test (≤12 months)", "Standard tier request + screencast"],
    typicalWait: "Not published. Plan for weeks per stage, and possible outright rejection.",
    confidence: "documented",
  },
  gotchas: [
    { title: "A rejection costs you the app", detail: "You can't reapply for Development or Standard tier with the same app after a rejection.", impact: "high", confidence: "documented", sourceIds: [4] },
    { title: "Community Management must be alone on its app", detail: "If your app already has Share or Ads products, create a separate app.", impact: "high", confidence: "documented", sourceIds: [3] },
    { title: "Personal emails and non-commercial use fail vetting", detail: "Access is for registered legal organizations with commercial use cases, and business email must be verified.", impact: "high", confidence: "community", sourceIds: [6] },
    { title: "No refresh tokens for most apps", detail: "Users must reconnect when the access token expires unless you're an approved partner.", impact: "medium", confidence: "documented", sourceIds: [2] },
  ],
  blockers: [
    { symptom: "Request access button greyed out", cause: "App has other products or pending requests.", fix: "Create a new app used only for Community Management." },
    { symptom: "Access request denied (identity vetting)", cause: "Unverified business, personal email, or mismatched domain/Page.", fix: "Fix the identity details, then submit a vetting appeal or reapply with a new app." },
    { symptom: "Can't get a member's connections or full profile", cause: "Those permissions are partner-only.", fix: "Redesign the feature around what OIDC/self-serve products allow." },
  ],
  handoff: {
    agentCan: [
      "Tell you whether your feature fits self-serve products or needs vetting",
      "Implement OIDC sign-in and member posting",
      "Draft the Development tier form and a screencast script per use case",
    ],
    youMust: [
      "Own or administer a LinkedIn Company Page and verify the app",
      "Submit access requests as a registered business",
      "Record the Standard tier screencast",
      "Accept the risk that LinkedIn may simply say no",
    ],
  },
  oauth: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    pkce: "Not available for standard web apps in sources we checked",
    refreshTokens: "Only for approved partners",
    scopesNote: "Self-serve: openid, profile, email, w_member_social. Others come with vetted products.",
    discovery: "https://www.linkedin.com/oauth/.well-known/openid-configuration",
  },
  sources: [
    { id: 1, title: "LinkedIn: Getting access / creating an app", url: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access", kind: "official" },
    { id: 2, title: "LinkedIn: Authorization code flow (3-legged OAuth)", url: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow", kind: "official" },
    { id: 3, title: "LinkedIn API partner support guide (CM API greyed out)", url: "https://learn.microsoft.com/en-us/linkedin/shared/linkedin-api-partner-support-guide", kind: "official" },
    { id: 4, title: "Community Management app review", url: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review", kind: "official" },
    { id: 5, title: "Increasing access (tiers, 12-month window)", url: "https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access", kind: "official" },
    { id: 6, title: "Third-party guide: LinkedIn API access & approval", url: "https://singhamandeep.com/?p=1387", kind: "third_party" },
  ],
  tested: [],
  uncertain: [
    "Review durations for each tier aren't published.",
    "Exact access-token lifetime for self-serve apps should be confirmed against the current authorization-code-flow docs (commonly reported as 60 days).",
  ],
};
