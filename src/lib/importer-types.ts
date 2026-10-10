/**
 * Picksy Affiliate Product Importer — Shared Types
 * Contract Status: FROZEN
 * Owned jointly by Gemini (Frontend/Design) and Codex (Backend/Security)
 */

export type ImporterSourceId =
  | "impact"
  | "partnerstack"
  | "shareasale"
  | "direct-feed"
  | "custom";

export interface ProvenanceRecord {
  sourceUrl: string;
  retrievedAt: string; // ISO 8601 UTC
}

export interface ProductImportCandidate {
  sourceId: string;
  canonicalUrl: string;
  externalProductId: string | null;
  name: string;
  slug: string;
  categoryId: string | null;
  merchantName: string;
  merchantDomain: string;
  officialSource: string;
  summary: string;
  intendedUser: string;
  intendedWorkflow: string;
  price: string | null;
  currency: string | null;
  affiliateUrl: string;
  destinationUrl: string;
  imageUrl: string | null;
  retrievedAt: string; // ISO 8601 UTC
  warnings: string[];
  provenance: Record<string, ProvenanceRecord>;
}

// Backward-compatible alias
export type NormalizedPreview = ProductImportCandidate;

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingDraftId: string | null;
  existingProductId: string | null;
  matchField: "canonicalUrl" | "externalProductId" | "slug" | null;
  message: string | null;
}

export interface ImportPreviewResponse {
  previewToken: string;
  candidate: ProductImportCandidate;
  duplicate: DuplicateCheckResult;
}

export interface ImportDraft {
  id: string;
  sourceId: string;
  canonicalUrl: string;
  externalProductId: string | null;
  state: "draft" | "published";
  candidate: ProductImportCandidate;
  edits: Partial<ProductImportCandidate>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EditorialReviewInput {
  author: string;
  evaluatedOn: string;
  publishedOn: string;
  reviewedOn: string;
  methodology: string;
  sources: string[];
  strengths: string[];
  limitations: string[];
  suitableFor: string;
  notSuitableFor: string;
  conclusion: string;
  authorizationReference: string;
  offerLabel: string;
  disclosure: string;
}

export type ImporterErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_URL"
  | "SOURCE_UNAVAILABLE"
  | "SOURCE_NOT_AUTHORIZED"
  | "DUPLICATE"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "RATE_LIMITED";

export interface ApiErrorResponse {
  error: {
    code: ImporterErrorCode;
    message: string;
    field?: string;
  };
}
