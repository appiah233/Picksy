"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Send,
} from "lucide-react";
import type { EditorialReviewInput, ProductImportCandidate } from "@/lib/importer-types";

interface PublicationModalProps {
  isOpen: boolean;
  isPublishing: boolean;
  candidate: ProductImportCandidate;
  onClose: () => void;
  onConfirmPublish: (reviewData: EditorialReviewInput) => void;
}

export function PublicationModal({
  isOpen,
  isPublishing,
  candidate,
  onClose,
  onConfirmPublish,
}: PublicationModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<EditorialReviewInput>({
    author: "Picksy Editorial Team",
    evaluatedOn: today,
    publishedOn: today,
    reviewedOn: today,
    methodology: "Direct hands-on functional testing and architectural evaluation.",
    sources: [candidate.officialSource || candidate.canonicalUrl],
    strengths: ["Comprehensive workflow automation", "Extensive third-party integrations"],
    limitations: ["Learning curve for non-technical users", "Premium pricing tiers"],
    suitableFor: candidate.intendedUser || "Growing B2B agencies and operations teams",
    notSuitableFor: "Single-person microbusinesses with simple, static requirements",
    conclusion: "Recommended implementation for businesses needing scalable workflow infrastructure.",
    authorizationReference: "AGREEMENT-REF-2026-ACTIVE",
    offerLabel: candidate.merchantName ? `Visit ${candidate.merchantName}` : "Visit Official Partner",
    disclosure:
      "Picksy may earn a commission when you register or purchase through our verified partner links at no extra cost to you.",
  });

  const [checklist, setChecklist] = useState({
    verifiedSources: true,
    verifiedDestination: true,
    verifiedAuthorization: true,
    verifiedDisclosure: true,
  });

  if (!isOpen) return null;

  const allChecked =
    checklist.verifiedSources &&
    checklist.verifiedDestination &&
    checklist.verifiedAuthorization &&
    checklist.verifiedDisclosure &&
    !!form.author.trim() &&
    !!form.authorizationReference.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allChecked) {
      onConfirmPublish(form);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-800">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="publish-modal-title" className="text-base font-semibold text-zinc-950">
                Gate 3 Publication Checklist
              </h2>
              <p className="text-xs text-zinc-500">
                Publication requires editorial verification, destination authorization, and disclosure compliance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close modal</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Checklist boxes */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Mandatory Editorial Verification Checks
            </h3>

            <label className="flex items-start gap-2.5 text-xs text-zinc-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.verifiedSources}
                onChange={(e) => setChecklist((prev) => ({ ...prev, verifiedSources: e.target.checked }))}
                className="mt-0.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              />
              <span>Factual claims and features have been verified against primary documentation.</span>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-zinc-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.verifiedDestination}
                onChange={(e) => setChecklist((prev) => ({ ...prev, verifiedDestination: e.target.checked }))}
                className="mt-0.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              />
              <span>Merchant destination URL uses HTTPS and matches approved merchant domains.</span>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-zinc-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.verifiedAuthorization}
                onChange={(e) => setChecklist((prev) => ({ ...prev, verifiedAuthorization: e.target.checked }))}
                className="mt-0.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              />
              <span>Affiliate program authorization reference is on file and active.</span>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-zinc-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.verifiedDisclosure}
                onChange={(e) => setChecklist((prev) => ({ ...prev, verifiedDisclosure: e.target.checked }))}
                className="mt-0.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              />
              <span>Mandatory FTC/editorial disclosure statement is attached.</span>
            </label>
          </div>

          {/* Editorial Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pub-author" className="block text-xs font-medium text-zinc-700 mb-1">
                Author / Lead Reviewer *
              </label>
              <input
                type="text"
                id="pub-author"
                value={form.author}
                onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label htmlFor="pub-authRef" className="block text-xs font-medium text-zinc-700 mb-1">
                Authorization Reference *
              </label>
              <input
                type="text"
                id="pub-authRef"
                value={form.authorizationReference}
                onChange={(e) => setForm((prev) => ({ ...prev, authorizationReference: e.target.value }))}
                required
                placeholder="e.g. IMPACT-AGREEMENT-2026"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 font-mono focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label htmlFor="pub-evalDate" className="block text-xs font-medium text-zinc-700 mb-1">
                Evaluation Date (UTC YYYY-MM-DD) *
              </label>
              <input
                type="date"
                id="pub-evalDate"
                value={form.evaluatedOn}
                onChange={(e) => setForm((prev) => ({ ...prev, evaluatedOn: e.target.value }))}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label htmlFor="pub-revDate" className="block text-xs font-medium text-zinc-700 mb-1">
                Reviewed Date (UTC YYYY-MM-DD) *
              </label>
              <input
                type="date"
                id="pub-revDate"
                value={form.reviewedOn}
                onChange={(e) => setForm((prev) => ({ ...prev, reviewedOn: e.target.value }))}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing || !allChecked}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isPublishing ? "Authorizing Publication..." : "Confirm & Authorize Publication"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
