import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { structureSections, workflows, type DashboardItem } from "./dashboard-data";

function WorkflowCard({ item, index }: { item: DashboardItem; index: number }) {
  const Icon = item.icon;
  const isImporter = index === 0;
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs hover:border-zinc-300 transition-colors">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${isImporter ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-medium border ${isImporter ? "bg-blue-50 text-blue-700 border-blue-200/60" : "bg-amber-50 text-amber-800 border-amber-200/60"}`}>{item.badge}</span>
        </div>
        <h3 className="mt-4 text-lg font-bold text-zinc-950">{item.title}</h3>
        <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">{item.description}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-100">
        <Link href={item.href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 transition-colors ${isImporter ? "bg-zinc-950 text-white shadow-xs hover:bg-zinc-800" : "border border-zinc-300 bg-white text-zinc-900 shadow-2xs hover:bg-zinc-50"}`}>
          {isImporter ? "Launch Product Importer" : "Inspect Pending Drafts"}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function WorkflowsSection() {
  return (
    <section aria-labelledby="primary-workflows-heading" className="mb-10">
      <div className="flex items-center justify-between gap-4 mb-4"><div>
        <p className="text-2xs font-semibold uppercase tracking-wider text-zinc-500">Core Workflows</p>
        <h2 id="primary-workflows-heading" className="text-xl font-bold tracking-tight text-zinc-950">Editorial &amp; Importer Actions</h2>
      </div></div>
      <div className="grid gap-4 md:grid-cols-2">{workflows.map((item, index) => <WorkflowCard key={item.href} item={item} index={index} />)}</div>
    </section>
  );
}

function CollectionCard({ item }: { item: DashboardItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs hover:border-zinc-400 hover:shadow-xs transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 group-hover:bg-zinc-950 group-hover:text-white transition-colors"><Icon className="h-4.5 w-4.5" aria-hidden="true" /></div>
          <span className="font-mono text-3xs font-medium text-zinc-500 bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 rounded">{item.badge}</span>
        </div>
        <h3 className="mt-3.5 text-base font-bold text-zinc-950 group-hover:text-blue-600 transition-colors">{item.title}</h3>
        <p className="mt-1 text-xs text-zinc-600 leading-relaxed">{item.description}</p>
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-medium text-zinc-600 group-hover:text-zinc-950">
        <span>Open Collection</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </Link>
  );
}

export function CollectionsSection() {
  return (
    <section aria-labelledby="content-structure-heading" className="mb-10">
      <div className="mb-4">
        <p className="text-2xs font-semibold uppercase tracking-wider text-zinc-500">Document Architecture</p>
        <h2 id="content-structure-heading" className="text-xl font-bold tracking-tight text-zinc-950">Content Lake Collections</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{structureSections.map(item => <CollectionCard key={item.href} item={item} />)}</div>
    </section>
  );
}

export function GuardrailNotice() {
  return (
    <aside aria-labelledby="guardrail-heading" className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-6 text-amber-950">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h2 id="guardrail-heading" className="text-sm font-bold text-amber-950">Content Invariant &amp; Publication Safeguard (Gate 3)</h2>
          <p className="mt-1.5 text-xs text-amber-900 leading-relaxed">Picksy enforces a strict separation between imported candidate data and public presentation. All ingested products enter the Content Lake as staging drafts. Software records are <strong>never published automatically</strong> without human editorial review. The public storefront only renders validated records from the published perspective via the Picksy Catalogue Adapter.</p>
        </div>
      </div>
    </aside>
  );
}
