"use client";

import React from "react";
import { Loader2, Shield, Network, FileCheck } from "lucide-react";

interface ImporterProgressProps {
  message?: string;
  step?: "validating" | "fetching" | "normalizing";
}

export function ImporterProgress({
  message = "Ingesting product from affiliate source...",
  step = "fetching",
}: ImporterProgressProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 text-center shadow-xs"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 mb-4 animate-pulse">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-zinc-950">
        Processing Affiliate Data
      </h3>
      <p className="mt-1 text-sm text-zinc-500 max-w-md mx-auto">
        {message}
      </p>

      {/* Visual step badges */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-zinc-500">
        <div className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
          <Shield className="h-3.5 w-3.5" />
          <span>SSRF & Host Validation</span>
        </div>
        <div className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full border ${
          step === "fetching" || step === "normalizing"
            ? "text-zinc-900 bg-zinc-100 border-zinc-300"
            : "text-zinc-400 bg-zinc-50 border-zinc-200"
        }`}>
          <Network className="h-3.5 w-3.5" />
          <span>Affiliate Feed Retrieval</span>
        </div>
        <div className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full border ${
          step === "normalizing"
            ? "text-zinc-900 bg-zinc-100 border-zinc-300"
            : "text-zinc-400 bg-zinc-50 border-zinc-200"
        }`}>
          <FileCheck className="h-3.5 w-3.5" />
          <span>Normalization & Provenance</span>
        </div>
      </div>
      <span className="sr-only">Please wait, product data is being retrieved securely.</span>
    </div>
  );
}
