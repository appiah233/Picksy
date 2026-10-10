"use client";

import React from "react";
import { AlertTriangle, ExternalLink, ArrowRight } from "lucide-react";
import type { DuplicateCheckResult } from "@/lib/importer-types";

interface DuplicateAlertProps {
  duplicate: DuplicateCheckResult;
  onLoadExistingDraft?: (draftId: string) => void;
  onProceedAnyway?: () => void;
}

export function DuplicateAlert({
  duplicate,
  onLoadExistingDraft,
  onProceedAnyway,
}: DuplicateAlertProps) {
  if (!duplicate.isDuplicate) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 text-amber-950 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-1 text-amber-800">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-900">
              Duplicate Record Detected
            </h3>
            {duplicate.matchField && (
              <span className="text-xs font-medium text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
                Matched on: {duplicate.matchField}
              </span>
            )}
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">
            {duplicate.message ||
              "A product with the same canonical destination or external identifier already exists in the system."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {duplicate.existingDraftId && onLoadExistingDraft && (
              <button
                type="button"
                onClick={() => onLoadExistingDraft(duplicate.existingDraftId!)}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-950 focus:ring-offset-2 transition-colors"
              >
                Load Existing Draft ({duplicate.existingDraftId})
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {duplicate.existingProductId && (
              <a
                href={`/products/${duplicate.existingProductId}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/50 focus:outline-none focus:ring-2 focus:ring-amber-950 transition-colors"
              >
                View Published Product
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {onProceedAnyway && (
              <button
                type="button"
                onClick={onProceedAnyway}
                className="text-xs font-medium text-amber-800 underline hover:text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-950 rounded px-1"
              >
                Continue editing with disambiguated slug
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
