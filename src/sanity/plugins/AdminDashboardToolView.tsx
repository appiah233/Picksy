"use client";

import { useCurrentUser } from "sanity";
import { DashboardHeader, GuestBanner } from "./dashboard/DashboardHeader";
import { CollectionsSection, GuardrailNotice, WorkflowsSection } from "./dashboard/DashboardSections";

export function AdminDashboardToolView() {
  const user = useCurrentUser();
  return (
    <div className="min-h-screen bg-zinc-50/50 pb-16 text-zinc-900 font-sans">
      <DashboardHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        {!user && <GuestBanner />}
        <WorkflowsSection />
        <CollectionsSection />
        <GuardrailNotice />
      </main>
    </div>
  );
}
