"use client";

import React from "react";
import type { Tool } from "sanity";
import { ProductImporter } from "@/features/admin/product-importer/product-importer";
import { ShieldCheck, Database, Layers } from "lucide-react";

interface ProductImporterToolViewProps {
  tool?: Tool;
}

export function ProductImporterToolView({ tool }: ProductImporterToolViewProps = {}) {
  const toolTitle = tool?.title || "Product Importer";

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-16 text-zinc-900 font-sans">
      {/* Studio Header Context Bar */}
      <div className="border-b border-zinc-200 bg-white shadow-2xs">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-xs">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-zinc-950">
                    Sanity Studio Tool: {toolTitle}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-2xs font-mono font-medium text-zinc-700 border border-zinc-200">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Managed Content Plane Integration · Project: <span className="font-mono font-semibold text-zinc-700">0tozsrrx</span> · Dataset: <span className="font-mono font-semibold text-zinc-700">production</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 font-medium text-blue-800">
                <Database className="h-3.5 w-3.5 text-blue-600" />
                <span>Target: importDraft Schema</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 font-medium text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Zero Browser Tokens</span>
              </div>
            </div>
          </div>

          {/* Operational Invariant Notice */}
          <div className="mt-3 rounded-lg border border-amber-200/70 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="font-semibold shrink-0">Content Invariant:</span>
            <span>
              Ingesting a product generates a draft record in the Content Lake. Product data is <strong>never published automatically</strong> to the public catalogue without deliberate human editorial review and Gate 3 compliance verification.
            </span>
          </div>
        </div>
      </div>

      {/* Main Importer Surface */}
      <main className="pt-6">
        <ProductImporter />
      </main>
    </div>
  );
}
