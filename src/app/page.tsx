import { curatedGuides } from "@/data/guides";
import { recentGuides } from "@/lib/store";
import { GuideCard } from "@/components/GuideCard";
import { GenerateForm } from "@/components/GenerateForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recent = (await recentGuides(9)).filter((g) => g.origin === "agent");
  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-20 grid md:grid-cols-[1.3fr_1fr] gap-10 items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-accent font-semibold">For people building agents</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Will it take an hour, or six weeks?
            </h1>
            <p className="mt-4 text-lg text-ink/75 max-w-xl">
              Before your users can connect Gmail, Slack or anything else to your agent, you need your own OAuth app with that provider. Some providers hand you credentials in five minutes. Others want a security audit first.
            </p>
            <p className="mt-3 text-lg text-ink/75 max-w-xl">
              These guides tell you which kind you're dealing with, how long it really takes, what tends to go wrong, and which steps you can hand to an agent.
            </p>
          </div>
          <div id="generate" className="scroll-mt-24 rounded-xl border border-line bg-card p-5 shadow-sm">
            <p className="font-semibold">Look up any app</p>
            <p className="text-sm text-muted mb-3">
              Not in the library? The research agent reads the provider's docs, pings its OAuth endpoints and writes a guide while you watch. Usually one to two minutes.
            </p>
            <GenerateForm curated={curatedGuides.map((g) => ({ slug: g.slug, name: g.name }))} />
          </div>
        </div>
      </section>

      <section id="library" className="scroll-mt-16 mx-auto max-w-6xl px-5 py-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Library</h2>
            <p className="text-sm text-muted">Researched by hand against each provider's own docs. Sorted from easiest to hardest.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {curatedGuides.map((g) => <GuideCard key={g.slug} g={g} />)}
        </div>

        {recent.length > 0 && (
          <div className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">Recently generated</h2>
            <p className="text-sm text-muted mb-6">Written by the agent and not reviewed by a person. Check the Evidence section before relying on one.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map((g) => <GuideCard key={g.slug} g={g} />)}
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-12 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-semibold">What's a provider OAuth app?</p>
            <p className="mt-1 text-ink/75">
              It's your product's registration with Google, Slack and so on: a client ID and secret, your redirect URLs, and the scopes you're allowed to ask for. Every one of your users connects through it, so if it isn't approved, strangers can't connect at all.
            </p>
          </div>
          <div>
            <p className="font-semibold">Why the timelines differ so much</p>
            <p className="mt-1 text-ink/75">
              GitHub and Notion are self-serve. Slack and Google let you start right away but gate the data-heavy permissions behind a review. LinkedIn only opens most of its API to partners it has vetted.
            </p>
          </div>
          <div>
            <p className="font-semibold">Reading the labels</p>
            <p className="mt-1 text-ink/75">
              Each step says who does it (you, or an agent) and where the claim comes from: a live test, the provider's docs, a third-party write-up, or our own inference.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
