import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="text-2xl font-semibold">Guide not found</h1>
      <p className="mt-2 text-muted">
        It may have been generated on a server instance that has since restarted. Guides made without permanent storage only last until then, but the "Copy link" button on the original page gives a link that still works.
      </p>
      <Link href="/#generate" className="mt-6 inline-block rounded-lg bg-accent text-white px-4 py-2">Generate it again</Link>
    </div>
  );
}
