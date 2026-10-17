import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="picksy-page-shell flex items-center justify-center px-4 py-24 sm:px-6">
      <div className="picksy-surface-card max-w-xl p-8 text-center sm:p-12">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300">
          <Compass aria-hidden="true" size={24} />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-indigo-300">
          404 · Editorial Directory
        </p>
        <h1 className="picksy-editorial-heading mt-2 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          This page is unavailable or has not been published yet.
        </p>
        <Link
          href="/"
          className="picksy-button picksy-button-primary mt-8 inline-flex items-center gap-2"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          <span>Return to Picksy home</span>
        </Link>
      </div>
    </div>
  );
}
