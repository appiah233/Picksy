import type { DuplicateCheckResult, ImportDraft, ProductImportCandidate } from "../importer-types.ts";
import type { CatalogRecords } from "../catalog-types.ts";

export interface DuplicateCheckOptions {
  currentDraftId?: string;
  catalogRecords?: CatalogRecords;
}

/**
 * Checks a product candidate for conflicts on canonical URL, external product ID,
 * and slug against existing drafts and published catalog records.
 */
export function detectDuplicates(
  candidate: ProductImportCandidate,
  drafts: readonly ImportDraft[],
  options?: DuplicateCheckOptions
): DuplicateCheckResult {
  const currentDraftId = options?.currentDraftId;
  const otherDrafts = currentDraftId
    ? drafts.filter((d) => d.id !== currentDraftId)
    : drafts;

  // 1. Check Canonical URL in drafts
  const draftByCanonical = otherDrafts.find(
    (d) =>
      d.sourceId === candidate.sourceId &&
      normalizeUrlForComparison(d.canonicalUrl) === normalizeUrlForComparison(candidate.canonicalUrl)
  );
  if (draftByCanonical) {
    return {
      isDuplicate: true,
      existingDraftId: draftByCanonical.id,
      existingProductId: null,
      matchField: "canonicalUrl",
      message: `An import draft already exists with canonical URL "${candidate.canonicalUrl}".`,
    };
  }

  // 2. Check Canonical URL in published catalog
  const catalog = options?.catalogRecords;
  if (catalog) {
    const publishedByCanonical = catalog.products.find(
      (p) => normalizeUrlForComparison(p.officialSource) === normalizeUrlForComparison(candidate.canonicalUrl)
    );
    if (publishedByCanonical) {
      return {
        isDuplicate: true,
        existingDraftId: null,
        existingProductId: publishedByCanonical.id,
        matchField: "canonicalUrl",
        message: `Published product "${publishedByCanonical.name}" already uses canonical source "${candidate.canonicalUrl}".`,
      };
    }
  }

  // 3. Check External Product ID for same source
  if (candidate.externalProductId) {
    const draftByExternalId = otherDrafts.find(
      (d) =>
        d.sourceId === candidate.sourceId &&
        d.externalProductId === candidate.externalProductId
    );
    if (draftByExternalId) {
      return {
        isDuplicate: true,
        existingDraftId: draftByExternalId.id,
        existingProductId: null,
        matchField: "externalProductId",
        message: `An import draft already exists with external ID "${candidate.externalProductId}" for source "${candidate.sourceId}".`,
      };
    }
  }

  // 4. Check Slug conflict
  if (catalog) {
    const publishedBySlug = catalog.products.find((p) => p.slug === candidate.slug);
    if (publishedBySlug) {
      return {
        isDuplicate: true,
        existingDraftId: null,
        existingProductId: publishedBySlug.id,
        matchField: "slug",
        message: `Published product "${publishedBySlug.name}" already uses the slug "${candidate.slug}".`,
      };
    }
  }

  const draftBySlug = otherDrafts.find((d) => {
    const slug = d.edits.slug || d.candidate.slug;
    return slug === candidate.slug;
  });
  if (draftBySlug) {
    return {
      isDuplicate: true,
      existingDraftId: draftBySlug.id,
      existingProductId: null,
      matchField: "slug",
      message: `Another draft already uses the slug "${candidate.slug}".`,
    };
  }

  return {
    isDuplicate: false,
    existingDraftId: null,
    existingProductId: null,
    matchField: null,
    message: null,
  };
}

function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // Remove trailing slash for consistency
    return parsed.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
