import Link from "next/link";

export const metadata = { title: "How it works · OAuth Launch Guides" };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 space-y-8 text-[15px] leading-relaxed">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
      </div>

      <section>
        <h2 className="text-xl font-semibold">The problem</h2>
        <p className="mt-2">
          Every user who connects Gmail or Slack to your agent does it through your OAuth app with that provider. Registering that app is usually quick. The part nobody warns you about is what stands between "it works on my account" and "customers can use it": Google's restricted-scope review and its yearly security assessment, Slack's Marketplace review (which now also decides how fast you can read message history), Microsoft's publisher verification, LinkedIn's partner vetting.
        </p>
        <p className="mt-2">
          People tend to find these out late, after the integration is already built. A guide here tries to surface them on day one.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">What a guide covers</h2>
        <p className="mt-2">
          It opens with a verdict and two separate estimates: how much hands-on work there is, and how long you'll wait on the provider. Then the different modes your app can live in (testing, unlisted, reviewed) and what each allows, because that's where most of the real decisions are. After that come the steps, each marked with who does it, then the gotchas, a short troubleshooting list, and the evidence behind all of it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">The research agent</h2>
        <p className="mt-2">When you look up an app that isn't in the library, the agent runs in five stages:</p>
        <ol className="mt-2 list-decimal pl-5 space-y-1.5">
          <li>Gemini, with Google Search turned on, works out which product you mean and where its OAuth docs are.</li>
          <li>The server downloads those docs itself and sends a few harmless requests to the provider: it looks for OpenID discovery documents and calls the authorize endpoint with a client ID that can't exist. These requests are the only things a guide labels as tested.</li>
          <li>Three research passes run side by side, one each on setup, approval and token behaviour. Every bullet in their notes has to name its source.</li>
          <li>The notes become a structured guide, with each claim tied to numbered sources and marked by how sure we are.</li>
          <li>A separate review pass reads the guide against the evidence. Anything it can't back up gets downgraded or rewritten, and the change is listed in the guide.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Where an agent helps and where it can't</h2>
        <p className="mt-2">
          An agent is good at picking the narrowest scopes, writing app manifests and OAuth code, drafting scope justifications and listing copy, scripting a demo video, and checking that endpoints respond. It can't sign up for accounts, accept legal terms, prove your company exists, record the demo, or pay an assessor. Each step in a guide says which side of that line it's on.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Limits</h2>
        <p className="mt-2">
          No provider approvals were actually completed while building this, so wait times come from what providers say publicly or from third-party reports, and they're labelled that way. The live checks prove an endpoint exists and how it reacts to a bad client. They don't prove a full sign-in works, because that needs a registered app. Generated guides haven't been reviewed by a person, so read anything marked "inferred" as a lead to check, not a fact.
        </p>
      </section>

      <Link href="/#generate" className="inline-block rounded-lg bg-accent text-white px-4 py-2">Look up an app</Link>
    </div>
  );
}
