import type { ImporterSourceId } from "../../importer-types.ts";
import type { AffiliateSourceAdapter } from "./types.ts";

const knownSources = new Set<ImporterSourceId>(["impact", "partnerstack", "direct-feed"]);

// These sources are recognized by the UI, but none has a permitted retrieval
// implementation or authorization evidence yet. Enable only after an adapter
// uses a documented provider API/feed and passes the security test plan.
const permittedAdapters = new Map<ImporterSourceId, AffiliateSourceAdapter>();

export function getSourceAdapter(sourceId: string): AffiliateSourceAdapter | null {
  return permittedAdapters.get(sourceId as ImporterSourceId) ?? null;
}

export function isSupportedSource(sourceId: string): sourceId is ImporterSourceId {
  return knownSources.has(sourceId as ImporterSourceId);
}

export function getApprovedHostsForSource(sourceId: string): readonly string[] {
  const adapter = getSourceAdapter(sourceId);
  return adapter ? adapter.approvedHosts : [];
}

export function getAllApprovedHosts(): string[] {
  return [...permittedAdapters.values()].flatMap((adapter) => [...adapter.approvedHosts]);
}
