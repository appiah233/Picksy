"use client";

import React from "react";
import { ShieldCheck, Info } from "lucide-react";
import type { ProvenanceRecord } from "@/lib/importer-types";

interface ProvenanceBadgeProps {
  field: string;
  provenance?: ProvenanceRecord;
}

export function ProvenanceBadge({ field, provenance }: ProvenanceBadgeProps) {
  if (!provenance) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 rounded-full px-2 py-0.5">
        <Info className="h-3 w-3" />
        Manual / Unverified source
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 bg-zinc-100 border border-zinc-200 rounded-full px-2.5 py-0.5"
      title={`Extracted for ${field} from ${provenance.sourceUrl} at ${provenance.retrievedAt}`}
    >
      <ShieldCheck className="h-3 w-3 text-emerald-600" />
      <span>Extracted: {new URL(provenance.sourceUrl).hostname}</span>
      <span className="text-zinc-400">•</span>
      <span className="text-zinc-500">{new Date(provenance.retrievedAt).toLocaleDateString()}</span>
    </span>
  );
}
