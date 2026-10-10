import type { ImporterSourceId } from "../../importer-types.ts";

export interface RawProductPayload {
  sourceId: ImporterSourceId;
  sourceUrl: string;
  canonicalUrl?: string;
  externalProductId?: string | null;
  name?: string;
  slug?: string;
  description?: string;
  price?: string | number | null;
  currency?: string | null;
  categoryId?: string | null;
  merchantName?: string;
  merchantDomain?: string;
  officialSource?: string;
  affiliateUrl?: string;
  destinationUrl?: string;
  imageUrl?: string | null;
  intendedUser?: string;
  intendedWorkflow?: string;
  rawAttributes?: Record<string, unknown>;
}

export interface AffiliateSourceAdapter {
  readonly sourceId: ImporterSourceId;
  readonly approvedHosts: readonly string[];
  fetchCandidate(
    url: string,
    options?: {
      credentials?: Record<string, string>;
      mockData?: Partial<RawProductPayload>;
    }
  ): Promise<RawProductPayload>;
}
