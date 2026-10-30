import type { Guide } from "@/lib/types";

export const outlook: Guide = {
  slug: "outlook",
  name: "Microsoft Outlook (Graph)",
  website: "https://outlook.com",
  category: "Email & calendar",
  tagline: "No app review, but you'll need publisher verification, and your customers' admins get the final say.",
  origin: "curated",
  updatedAt: "2026-10-30",

  verdict: {
    difficulty: "hard",
    headline: "An hour to register; the real gates are publisher verification and each customer's consent policy.",
    why: "Microsoft doesn't review Graph apps. But multitenant apps registered after Nov 2020 that aren't publisher-verified are shown as 'unverified', and users in other tenants generally can't consent to anything beyond basic sign-in. Verification needs a Microsoft AI Cloud Partner Program (Partner Center) account and a verified domain. Even then, many enterprise tenants require admin consent.",
  },
  effort: {
    handsOn: "1–2 h registration + code · 1–2 h for publisher verification",
    approvalWait: "Publisher verification: minutes if your Partner Center account is already set up; partner enrollment and its company verification can take days. Customer admin consent: unpredictable.",
    timeToFirstConnection: "Same day (your own tenant / personal accounts)",
    timeToProduction: "Days (verification) + per-customer admin consent",
    cost: "Free. Microsoft doesn't charge for publisher verification.",
  },
  modes: [
    { name: "Single tenant", whatYouGet: "Users in your own Entra tenant.", limits: "Not for customers.", reviewNeeded: "None" },
    { name: "Multitenant, unverified", whatYouGet: "Basic sign-in works for other tenants.", limits: "Shown as 'unverified'; users can't consent to most permissions beyond sign-in/profile.", reviewNeeded: "None, but blocked in practice" },
    { name: "Multitenant, publisher verified", whatYouGet: "Blue verified badge; eligible for 'verified publisher' user-consent policies.", limits: "Tenant admins can still require admin consent.", reviewNeeded: "Publisher verification (self-serve)" },
    { name: "+ Personal Microsoft accounts", whatYouGet: "Outlook.com / Hotmail users.", limits: "Choose the right 'supported account types' at registration.", reviewNeeded: "None" },
  ],
  prerequisites: [
    { item: "A Microsoft Entra tenant (directory)", why: "Since June 2024, apps can't be registered under a bare personal account; a free Azure sign-up creates a tenant.", required: true },
    { item: "Microsoft AI Cloud Partner Program (Partner Center) account", why: "Required for publisher verification; can't be a 'location' Partner One ID.", required: true },
    { item: "A custom domain verified in your tenant", why: "The publisher domain must match a verified domain.", required: true },
    { item: "MFA on the account doing verification", why: "Verification requires Entra multifactor sign-in.", required: true },
  ],
  phases: [
    {
      title: "Register the app",
      goal: "Client ID, secret, and delegated Graph permissions.",
      steps: [
        { title: "Create the registration in the right tenant", detail: "Entra admin center → App registrations → New. Pick 'Accounts in any organizational directory and personal Microsoft accounts' if you serve both. Choose carefully, because this is hard to change later.", owner: "you", time: "10 min", links: ["https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"], confidence: "documented", sourceIds: [1, 2] },
        { title: "Add a Web redirect URI and a client secret", detail: "Authentication → Add platform → Web. Certificates & secrets → new client secret. Secrets expire, so put the date in your calendar.", owner: "you", confidence: "documented", sourceIds: [2] },
        { title: "Add delegated Graph permissions", detail: "offline_access (refresh tokens), User.Read, plus mail/calendar permissions such as Mail.Read, Mail.Send, Calendars.ReadWrite. Request the minimum.", owner: "agent_assist", confidence: "documented", sourceIds: [3] },
        { title: "Implement auth code + PKCE against /common", detail: "Use MSAL or a standard OAuth client against login.microsoftonline.com/common/oauth2/v2.0 endpoints.", owner: "agent", confidence: "documented", sourceIds: [3] },
      ],
    },
    {
      title: "Become a verified publisher",
      goal: "Remove 'unverified' so users in other tenants can consent.",
      steps: [
        { title: "Enroll in the Microsoft AI Cloud Partner Program", detail: "Create a Partner Center account and complete company verification. Use the program account ID (not a location ID).", owner: "you", time: "days (company verification)", links: ["https://partner.microsoft.com/"], confidence: "documented", sourceIds: [4] },
        { title: "Set the publisher domain", detail: "Branding & properties → Publisher domain → choose a verified domain from your tenant.", owner: "you", confidence: "documented", sourceIds: [5] },
        { title: "Add the partner ID and verify", detail: "Branding & properties → Publisher verification → enter the ID → Verify and save. Must be done by a user with the right roles in both Entra and Partner Center, signed in with MFA.", owner: "you", time: "minutes", confidence: "documented", sourceIds: [4] },
      ],
    },
    {
      title: "Prepare for customer tenants",
      goal: "Make admin consent painless.",
      steps: [
        { title: "Publish an admin-consent link and a permissions explainer", detail: "Give customers https://login.microsoftonline.com/{tenant}/adminconsent?client_id=… and a one-page list of permissions and why you need each.", owner: "agent", confidence: "documented", sourceIds: [6] },
      ],
    },
  ],
  approval: {
    required: "conditional",
    trigger: "No Microsoft app review. Publisher verification is effectively required for multitenant apps that request more than sign-in. Customer tenants may require admin consent regardless.",
    process: ["Partner Center enrollment", "Publisher verification (self-serve)", "Per-tenant admin consent where policy requires it"],
    typicalWait: "Minutes to days for verification; per-customer admin consent varies",
    confidence: "documented",
  },
  gotchas: [
    { title: "Unverified multitenant apps can't get user consent", detail: "For apps registered after Nov 8, 2020 that request more than basic sign-in/profile, users in other tenants generally can't consent unless you're publisher verified.", impact: "high", confidence: "documented", sourceIds: [4, 7] },
    { title: "Admin consent is your customer's decision", detail: "Tenants can disable user consent or allow it only for verified publishers and low-risk permissions. Enterprise customers will often need an admin to approve.", impact: "high", confidence: "documented", sourceIds: [6] },
    { title: "Personal-account app registration is gone", detail: "Apps registered under a personal Microsoft account can't be moved into a tenant later. Register inside a tenant from the start.", impact: "medium", confidence: "documented", sourceIds: [1] },
    { title: "Client secrets expire", detail: "Rotate before expiry or every connection breaks at once.", impact: "medium", confidence: "documented", sourceIds: [2] },
  ],
  blockers: [
    { symptom: "'Need admin approval' on consent", cause: "Tenant policy or high-privilege permission.", fix: "Send the customer's admin your admin-consent URL and permissions explainer." },
    { symptom: "Consent screen says 'unverified'", cause: "Publisher verification not done.", fix: "Complete Partner Center enrollment and verify the publisher." },
    { symptom: "AADSTS50020 / personal accounts rejected", cause: "Supported account types don't include personal accounts, or you're using a tenant-specific endpoint.", fix: "Use /common and the right signInAudience (may need a new registration)." },
    { symptom: "Can't register app: 'outside of a directory deprecated'", cause: "Signed in with a personal account and no tenant.", fix: "Create a free Azure account / tenant first." },
  ],
  handoff: {
    agentCan: [
      "Choose the minimal Graph permissions for your features",
      "Implement MSAL / OAuth code with refresh handling",
      "Generate the admin-consent URL and a permissions explainer for customers",
      "Check the OIDC discovery document and authorize endpoint respond",
    ],
    youMust: [
      "Create the tenant and app registration",
      "Enroll in Partner Center and complete company verification",
      "Verify your domain and run publisher verification with MFA",
      "Chase admin consent with each enterprise customer",
    ],
  },
  oauth: {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    pkce: "Supported (required for SPAs)",
    refreshTokens: "Yes with the offline_access scope",
    redirectUris: "Registered per platform (Web/SPA/mobile); exact match",
    scopesNote: "Delegated Graph permissions; some need admin consent, and tenant policy can require it for all.",
    discovery: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
  },
  sources: [
    { id: 1, title: "Microsoft identity platform: breaking changes (apps must be in a directory from June 2024)", url: "https://learn.microsoft.com/en-us/entra/identity-platform/reference-breaking-changes", kind: "official" },
    { id: 2, title: "Quickstart: Register an application", url: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app", kind: "official" },
    { id: 3, title: "Microsoft Graph permissions reference", url: "https://learn.microsoft.com/en-us/graph/permissions-reference", kind: "official" },
    { id: 4, title: "Publisher verification overview", url: "https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview", kind: "official" },
    { id: 5, title: "Configure an app's publisher domain", url: "https://learn.microsoft.com/en-us/entra/identity-platform/howto-configure-publisher-domain", kind: "official" },
    { id: 6, title: "Consent framework", url: "https://learn.microsoft.com/en-us/entra/identity-platform/consent-framework", kind: "official" },
    { id: 7, title: "Entra blog: Publisher verification and app consent policies GA", url: "https://techcommunity.microsoft.com/t5/microsoft-entra-blog/publisher-verification-and-app-consent-policies-are-now/ba-p/1257374", kind: "official" },
  ],
  tested: [],
  uncertain: [
    "How long Partner Center company verification takes varies; Microsoft doesn't give a fixed time, and forum reports range from hours to weeks.",
    "Whether Microsoft 365 Certification is expected by your target customers. It's optional and separate from publisher verification.",
  ],
};
