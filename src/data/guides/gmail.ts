import type { Guide } from "@/lib/types";

export const gmail: Guide = {
  slug: "gmail",
  name: "Gmail (Google)",
  website: "https://mail.google.com",
  category: "Email",
  tagline: "Testing works today. Reading mail in production needs verification plus an annual third-party security assessment.",
  origin: "curated",
  updatedAt: "2026-10-30",

  verdict: {
    difficulty: "very_hard",
    headline: "Hours to build, weeks to months to launch if you read email.",
    why: "Most Gmail scopes an agent wants (gmail.readonly, gmail.modify, gmail.compose, full mail.google.com) are restricted. Restricted scopes require Google's OAuth verification plus a CASA security assessment by an approved third-party lab, renewed every 12 months. Until then you're capped at 100 test users, whose tokens expire after 7 days.",
  },
  effort: {
    handsOn: "2–4 h to build · 1–3 days to prepare verification (policy, demo video, domain)",
    approvalWait: "Sensitive scopes only: often under a week · Restricted scopes: Google review + CASA, commonly several weeks or more",
    timeToFirstConnection: "Same day (Testing mode, ≤100 listed test users)",
    timeToProduction: "~1 week (gmail.send only) to 1–3+ months (reading mail)",
    cost: "Google charges nothing for verification. CASA assessment fees are paid to the lab and vary widely (one lab lists $3,000 for its no-rush tier).",
  },
  modes: [
    { name: "Testing", whatYouGet: "Any scope, up to 100 test users you list by email.", limits: "Authorizations (and refresh tokens) expire 7 days after consent; users see an unverified-app warning.", reviewNeeded: "None" },
    { name: "In production, unverified", whatYouGet: "Anyone can try to connect.", limits: "Unverified-app screen; a lifetime cap of 100 new users for unapproved sensitive/restricted scopes that can't be reset.", reviewNeeded: "None, but you can't really launch like this" },
    { name: "In production, verified", whatYouGet: "No warnings, no user cap for approved scopes.", limits: "Restricted scopes need an annual CASA re-assessment.", reviewNeeded: "Brand + scope verification (+ CASA for restricted)" },
    { name: "Internal (Workspace org only)", whatYouGet: "Users in your own Google Workspace org, no verification.", limits: "Only works inside your own org, so it's no use for customers.", reviewNeeded: "None" },
  ],
  prerequisites: [
    { item: "Google Cloud project", why: "Owns the OAuth client and consent configuration.", required: true },
    { item: "A domain you own, verified in Google Search Console", why: "Homepage, privacy policy and redirect domains must be on verified domains for verification.", required: true },
    { item: "Privacy policy that discloses Gmail data use (Limited Use)", why: "A generic policy is a common rejection reason.", required: true },
    { item: "Demo video of the OAuth flow and each scope in use", why: "Required for sensitive/restricted scope review.", required: true },
    { item: "Budget and time for a CASA assessment", why: "Required for restricted scopes.", required: false },
  ],
  phases: [
    {
      title: "Choose scopes first. They decide your timeline",
      goal: "Use the lowest tier that supports your feature.",
      steps: [
        {
          title: "Map features to scope tiers",
          detail: "Non-sensitive: gmail.labels. Sensitive (verification + video, no CASA): gmail.send. Restricted (verification + CASA): mail.google.com, gmail.readonly, gmail.metadata, gmail.modify, gmail.compose, gmail.insert, gmail.settings.*. Unlike Drive, there's no per-item scope that avoids 'restricted' for reading mail.",
          owner: "agent",
          confidence: "community",
          sourceIds: [1, 2],
        },
      ],
    },
    {
      title: "Set up the project (Testing)",
      goal: "A working connection for you and up to 100 testers.",
      steps: [
        { title: "Create a Cloud project and enable the Gmail API", detail: "console.cloud.google.com → new project → APIs & Services → enable Gmail API.", owner: "you", time: "5 min", links: ["https://console.cloud.google.com/apis/library/gmail.googleapis.com"], confidence: "documented", sourceIds: [3] },
        { title: "Configure Google Auth Platform", detail: "Branding (app name, support email, homepage, privacy policy, authorized domains) → Audience: External, Testing, add test users → Data access: add your scopes.", owner: "you", time: "20 min", links: ["https://console.cloud.google.com/auth/overview"], confidence: "documented", sourceIds: [3] },
        { title: "Create a Web OAuth client", detail: "Clients → Create → Web application → add exact redirect URIs. Request access_type=offline and prompt=consent to get a refresh token.", owner: "you", confidence: "documented", sourceIds: [4] },
        { title: "Implement the flow and token refresh", detail: "Authorization code + PKCE; store refresh tokens encrypted. Expect test-user refresh tokens to stop working after 7 days.", owner: "agent", confidence: "documented", sourceIds: [3, 4] },
      ],
    },
    {
      title: "Get verified",
      goal: "Remove the warning screen and the 100-user cap.",
      steps: [
        { title: "Verify your domain in Search Console", detail: "Every authorized domain on the consent screen must be verified by a project owner/editor.", owner: "you", confidence: "documented", sourceIds: [5] },
        { title: "Write scope justifications and record the demo video", detail: "For each sensitive/restricted scope: why you need it, why a narrower scope won't do, and a video showing the consent screen and the feature using the data.", owner: "agent_assist", time: "half a day", confidence: "documented", sourceIds: [5] },
        { title: "Publish to production and submit for verification", detail: "Audience → Publish app, then submit from Verification Center. Answer Trust & Safety emails quickly, because nothing moves while they're waiting on you.", owner: "you", confidence: "documented", sourceIds: [5] },
        { title: "Restricted scopes: complete CASA with an authorized lab", detail: "Google tells you when to start. Run a self-scan first to fix easy findings, pick an authorized assessor, remediate, and receive a Letter of Validation. Renew every 12 months.", owner: "you", time: "weeks", confidence: "community", sourceIds: [6, 7] },
      ],
    },
  ],
  approval: {
    required: "yes",
    trigger: "Any sensitive or restricted Gmail scope for users outside your own Workspace org.",
    process: ["Brand verification", "Sensitive/restricted scope review (justification + demo video)", "CASA security assessment (restricted only)", "Annual re-assessment (restricted only)"],
    typicalWait: "Sensitive: often < 1 week. Restricted: the CASA step is usually what takes longest, often weeks to months.",
    confidence: "community",
  },
  gotchas: [
    { title: "Test-mode tokens die after 7 days", detail: "Authorizations by test users expire seven days after consent, refresh tokens included. Don't mistake this for a bug in your refresh code.", impact: "high", confidence: "documented", sourceIds: [3] },
    { title: "The 100-user cap is lifetime and can't be reset", detail: "Users who saw the unverified-app screen count toward a project-lifetime cap.", impact: "high", confidence: "documented", sourceIds: [3] },
    { title: "Adding a restricted scope later means re-review", detail: "Plan the scope set before verifying; expanding later can trigger a new or expanded CASA assessment.", impact: "high", confidence: "community", sourceIds: [7] },
    { title: "Password change revokes Gmail refresh tokens", detail: "Refresh tokens with Gmail scopes are invalidated when the user changes their password. Build a reconnect prompt.", impact: "medium", confidence: "community", sourceIds: [1] },
    { title: "Workspace admins can block your app", detail: "Admins control which third-party apps can access Workspace data, and restricted Gmail/Drive scopes may need admin configuration.", impact: "medium", confidence: "documented", sourceIds: [3] },
  ],
  blockers: [
    { symptom: "'Google hasn't verified this app'", cause: "Unverified sensitive/restricted scopes.", fix: "Fine for testing; for production, complete verification." },
    { symptom: "invalid_grant after a week", cause: "Testing-mode 7-day expiry.", fix: "Re-consent, or move to production once verified." },
    { symptom: "Verification rejected: privacy policy", cause: "Policy doesn't describe Gmail data use and Limited Use compliance.", fix: "Add a section on what Gmail data you access, why, storage, deletion, and the Limited Use statement." },
    { symptom: "Asked for CASA Tier 3", cause: "Many restricted scopes or domain-wide delegation (anecdotal).", fix: "Drop scopes you don't need; Tier 3 costs much more." },
  ],
  handoff: {
    agentCan: [
      "Map your features to the lowest scope tier",
      "Write scope justifications and a demo-video script",
      "Draft the Gmail-specific privacy policy section",
      "Implement OAuth + PKCE + refresh, with 7-day test expiry handled",
      "Run an open-source security scan before CASA",
    ],
    youMust: [
      "Own and verify the domain in Search Console",
      "Click Publish and submit verification (you're the project owner)",
      "Record the demo video",
      "Contract and pay a CASA lab, and fix its findings",
      "Renew the assessment every year",
    ],
  },
  oauth: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    pkce: "Supported (S256)",
    refreshTokens: "Yes with access_type=offline; expire after 7 days in Testing",
    accessTokenLifetime: "~1 hour",
    redirectUris: "Exact match; must be on authorized domains for verification",
    scopesNote: "Tiered: non-sensitive / sensitive / restricted. Tier drives the review path.",
    discovery: "https://accounts.google.com/.well-known/openid-configuration",
  },
  sources: [
    { id: 1, title: "Unified.to: Gmail OAuth app (scope tiers, password-change revocation)", url: "https://docs.unified.to/skills/gmail-oauth-app/SKILL.md", kind: "third_party" },
    { id: 2, title: "Google: Restricted scope verification", url: "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification", kind: "official" },
    { id: 3, title: "Google Cloud Help: Manage App Audience (Testing, 100 users, 7-day expiry, user cap)", url: "https://support.google.com/cloud/answer/15549945", kind: "official" },
    { id: 4, title: "Google: Using OAuth 2.0 for Web Server Applications", url: "https://developers.google.com/identity/protocols/oauth2/web-server", kind: "official" },
    { id: 5, title: "Google: Sensitive scope verification", url: "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification", kind: "official" },
    { id: 6, title: "Nango: Google security review (timelines, CASA tiers)", url: "https://nango.dev/docs/api-integrations/google-shared/google-security-review", kind: "third_party" },
    { id: 7, title: "Leviathan Security: CASA (annual renewal, pricing example)", url: "https://www.leviathansecurity.com/programs/google-casa-cloud-application-security-assessment", kind: "third_party" },
  ],
  tested: [],
  uncertain: [
    "Review durations aren't published by Google; the times here come from integration platforms and assessors.",
    "CASA cost depends on the lab and tier; we cite one lab's published price as an example only.",
    "Whether a server-less (local client) design avoids CASA for restricted scopes is debated in Google's forums; we couldn't confirm a current case.",
  ],
  reviewNotes: [
    "Corrected a common simplification: not all Gmail scopes are restricted. gmail.send is sensitive (no CASA), which is a real lever for send-only agents.",
  ],
};
