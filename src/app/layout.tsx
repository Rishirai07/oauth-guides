import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAuth Launch Guides",
  description:
    "How long it takes to get an OAuth app approved with Gmail, Slack, Microsoft and others, what blocks you, and which steps an agent can do.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="no-print border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap">
              <span className="inline-grid place-items-center size-7 rounded-md bg-ink text-paper font-mono text-xs">OA</span>
              OAuth Launch Guides
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href="/#library" className="hidden sm:inline hover:text-ink">Library</Link>
              <Link href="/#generate" className="hover:text-ink">Look up an app</Link>
              <Link href="/about" className="hidden sm:inline hover:text-ink">How it works</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-line text-xs text-muted">
          <div className="mx-auto max-w-6xl px-5 py-6 flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span>Every claim is marked as tested, from provider docs, from a third party, or inferred.</span>
            <span>Provider rules change often. Check the linked sources before you commit to a plan.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
