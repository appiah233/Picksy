"use client";

import React from "react";
import { useCurrentUser } from "sanity";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  FileCheck2,
  FileClock,
  FolderOpen,
  Layers,
  LayoutDashboard,
  PackageSearch,
  Percent,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { dataset, projectId } from "@/sanity/env";

interface SectionItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  badge: string;
}

const structureSections: SectionItem[] = [
  {
    title: "Products",
    description: "Curate software products, official source links, target workflows, and review status.",
    href: "/studio/structure/product",
    icon: PackageSearch,
    badge: "Schema: product",
  },
  {
    title: "Categories",
    description: "Organize software categories, descriptions, audience targeting, and display orders.",
    href: "/studio/structure/category",
    icon: FolderOpen,
    badge: "Schema: category",
  },
  {
    title: "Merchants & Destinations",
    description: "Maintain authorized merchants, verified host allowlists, and affiliate tracking destinations.",
    href: "/studio/structure/merchant",
    icon: Building2,
    badge: "Schema: merchant",
  },
  {
    title: "Editorial Reviews",
    description: "Curate hands-on evaluations, methodology, dates, strengths, limitations, and conclusions.",
    href: "/studio/structure/review",
    icon: FileCheck2,
    badge: "Schema: review",
  },
  {
    title: "Affiliate Offers",
    description: "Manage active affiliate offers, disclosures, rates, and merchant tracking parameters.",
    href: "/studio/structure/affiliateOffer",
    icon: Percent,
    badge: "Schema: affiliateOffer",
  },
  {
    title: "Import Drafts (Staging)",
    description: "Inspect staged candidate records awaiting editorial validation before publication.",
    href: "/studio/structure/importDraft",
    icon: FileClock,
    badge: "Schema: importDraft",
  },
];

export function AdminDashboardToolView() {
  const user = useCurrentUser();

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-16 text-zinc-900 font-sans">
      {/* Studio Header Context Bar */}
      <header className="border-b border-zinc-200 bg-white shadow-2xs">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-xs">
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-zinc-950">
                    Content Workspace & Overview
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-2xs font-mono font-medium text-zinc-700 border border-zinc-200">
                    Sanity Studio
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Managed Control Plane · Project:{" "}
                  <span className="font-mono font-semibold text-zinc-700">{projectId}</span> · Dataset:{" "}
                  <span className="font-mono font-semibold text-zinc-700">{dataset}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 font-medium text-blue-800">
                <Database className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Content Lake Connected</span>
              </div>
              {user ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 font-medium text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Signed in as {user.name || user.email || "Sanity editor"}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                  <ShieldAlert className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                  <span>Guest / Unauthenticated Session</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Unauthenticated / Guest Advisory Banner */}
        {!user && (
          <div
            role="status"
            className="mb-8 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm text-blue-950">Viewing in Preview Mode</p>
                <p className="mt-1 text-blue-800">
                  You are currently viewing the content workspace. Log in with your authorized Sanity project credentials to edit documents, stage drafts, and publish changes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Primary Action Hero Cards */}
        <section aria-labelledby="primary-workflows-heading" className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-zinc-500">Core Workflows</p>
              <h2 id="primary-workflows-heading" className="text-xl font-bold tracking-tight text-zinc-950">
                Editorial & Importer Actions
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Importer Action Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs hover:border-zinc-300 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Layers className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-2xs font-medium text-blue-700 border border-blue-200/60">
                    Interactive Tool
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-zinc-950">Affiliate Product Importer</h3>
                <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
                  Ingest affiliate software candidates via approved network feeds. Features SSRF-protected URL validation, automatic metadata extraction, duplicate detection, and candidate staging.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100">
                <Link
                  href="/studio/product-importer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 transition-colors"
                >
                  Launch Product Importer <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Staging / Review Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs hover:border-zinc-300 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                    <FileClock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-2xs font-medium text-amber-800 border border-amber-200/60">
                    Gate 3 Staging
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-zinc-950">Review Staged Drafts</h3>
                <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
                  Inspect staged candidate documents in the Content Lake. Review provenance data, verify merchant destination authorization, and execute deliberate publication through the editorial checklist.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100">
                <Link
                  href="/studio/structure/importDraft"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-2xs hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 transition-colors"
                >
                  Inspect Pending Drafts <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Content Structure Section */}
        <section aria-labelledby="content-structure-heading" className="mb-10">
          <div className="mb-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-zinc-500">Document Architecture</p>
            <h2 id="content-structure-heading" className="text-xl font-bold tracking-tight text-zinc-950">
              Content Lake Collections
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {structureSections.map(({ title, description, href, icon: Icon, badge }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs hover:border-zinc-400 hover:shadow-xs transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-3xs font-medium text-zinc-500 bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 rounded">
                      {badge}
                    </span>
                  </div>
                  <h3 className="mt-3.5 text-base font-bold text-zinc-950 group-hover:text-blue-600 transition-colors">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                    {description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-medium text-zinc-600 group-hover:text-zinc-950">
                  <span>Open Collection</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Architectural Guardrail Notice */}
        <aside
          aria-labelledby="guardrail-heading"
          className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-6 text-amber-950"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 id="guardrail-heading" className="text-sm font-bold text-amber-950">
                Content Invariant & Publication Safeguard (Gate 3)
              </h2>
              <p className="mt-1.5 text-xs text-amber-900 leading-relaxed">
                Picksy enforces a strict separation between imported candidate data and public presentation. All ingested products enter the Content Lake as staging drafts. Software records are <strong>never published automatically</strong> without human editorial review. The public storefront only renders validated records from the published perspective via the Picksy Catalogue Adapter.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
