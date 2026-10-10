import { Database, LayoutDashboard, ShieldAlert, ShieldCheck } from "lucide-react";
import { dataset, projectId } from "@/sanity/env";

interface EditorUser { name?: string | null; email?: string | null }

function HeaderBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-xs"><LayoutDashboard className="h-5 w-5" aria-hidden="true" /></div>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-zinc-950">Content Workspace &amp; Overview</h1>
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-2xs font-mono font-medium text-zinc-700 border border-zinc-200">Sanity Studio</span>
        </div>
        <p className="text-xs text-zinc-500">Managed Control Plane · Project: <span className="font-mono font-semibold text-zinc-700">{projectId}</span> · Dataset: <span className="font-mono font-semibold text-zinc-700">{dataset}</span></p>
      </div>
    </div>
  );
}

function IdentityBadges({ user }: { user: EditorUser | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 font-medium text-blue-800">
        <Database className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" /><span>Content Lake Connected</span>
      </div>
      {user ? (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 font-medium text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /><span>Signed in as {user.name || user.email || "Sanity editor"}</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
          <ShieldAlert className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" /><span>Guest / Unauthenticated Session</span>
        </div>
      )}
    </div>
  );
}

export function DashboardHeader({ user }: { user: EditorUser | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white shadow-2xs">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><HeaderBrand /><IdentityBadges user={user} /></div>
      </div>
    </header>
  );
}

export function GuestBanner() {
  return (
    <div role="status" className="mb-8 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold text-sm text-blue-950">Viewing in Preview Mode</p>
          <p className="mt-1 text-blue-800">You are currently viewing the content workspace. Log in with your authorized Sanity project credentials to edit documents, stage drafts, and publish changes.</p>
        </div>
      </div>
    </div>
  );
}
