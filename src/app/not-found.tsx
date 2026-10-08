import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Page not found</h1>
      <p className="mt-4 text-zinc-600">This page is unavailable or has not been published yet.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-md bg-zinc-950 px-5 py-3 font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
      >
        Return to Picksy home
      </Link>
    </div>
  );
}
