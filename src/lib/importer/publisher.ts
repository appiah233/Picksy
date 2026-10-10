import type {
  AffiliateOffer,
  CatalogRecords,
  Category,
  Merchant,
  Product,
  Review,
} from "../catalog-types.ts";
import { validateCatalog } from "../catalog-validation.ts";
import type {
  EditorialReviewInput,
  ImportDraft,
  ImporterErrorCode,
  ProductImportCandidate,
} from "../importer-types.ts";
import { draftStore } from "./draft-store.ts";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "crm-automation", slug: "crm-automation", name: "CRM & Automation", description: "Customer lifecycle and automation.", audience: "Business operators", state: "published" },
  { id: "seo-tools", slug: "seo-tools", name: "SEO Tools", description: "Rank tracking, audit, and keyword research.", audience: "Business operators", state: "published" },
  { id: "email-marketing", slug: "email-marketing", name: "Email Marketing", description: "Broadcast delivery and automated sequences.", audience: "Business operators", state: "published" },
  { id: "course-platforms", slug: "course-platforms", name: "Course Platforms", description: "Digital courses and learning management.", audience: "Business operators", state: "published" },
  { id: "managed-hosting", slug: "managed-hosting", name: "Managed Hosting", description: "Managed infrastructure and cloud hosting.", audience: "Business operators", state: "published" },
  { id: "cybersecurity", slug: "cybersecurity", name: "Cybersecurity", description: "Endpoint protection and data compliance.", audience: "Business operators", state: "published" },
];

export interface PublishResult {
  ok: boolean;
  productId?: string;
  state?: "published";
  code?: ImporterErrorCode;
  message?: string;
  errors?: string[];
}

export interface PublishOptions {
  catalogRecords?: CatalogRecords;
  today?: string;
}

type DraftCheck =
  | { ok: true; draft: ImportDraft }
  | { ok: false; result: PublishResult };

type PublicationPreparation =
  | { ok: true; productId: string }
  | { ok: false; result: PublishResult };

function publicationFailure(
  message: string,
  code: ImporterErrorCode = "VALIDATION_FAILED",
  errors?: string[]
): PublishResult {
  return { ok: false, code, message, ...(errors ? { errors } : {}) };
}

function draftProblem(draft: ImportDraft | null, draftId: string, version: number): PublishResult | null {
  if (!draft) return publicationFailure(`Draft with ID "${draftId}" not found.`);
  if (draft.version !== version) {
    return publicationFailure(
      `Version conflict: Draft is at version ${draft.version}, but version ${version} was supplied.`,
      "CONFLICT"
    );
  }
  if (draft.state === "published") {
    return publicationFailure(`Draft "${draftId}" is already published.`);
  }
  return null;
}

async function getPublishableDraft(
  draftId: string,
  version: number
): Promise<DraftCheck> {
  const draft = await draftStore.getDraft(draftId);
  const problem = draftProblem(draft, draftId, version);
  return problem ? { ok: false, result: problem } : { ok: true, draft: draft! };
}

function canonicalDestinationUrl(value: string): string | null {
  // Store the canonical URL string that the browser will request. The catalogue
  // validator deliberately rejects destinations whose stored string differs
  // from URL.href, so a valid bare host such as https://example.com must be
  // normalized before it is recorded as the approved destination.
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

function makeProduct(merged: ProductImportCandidate, categoryId: string): Product {
  return {
    id: merged.slug,
    slug: merged.slug,
    categoryId,
    name: merged.name,
    officialSource: merged.officialSource || merged.canonicalUrl,
    summary: merged.summary,
    intendedUser: merged.intendedUser,
    intendedWorkflow: merged.intendedWorkflow,
    state: "published",
  };
}

function makeReview(productId: string, editorialReview: EditorialReviewInput): Review {
  return {
    productId,
    author: editorialReview.author,
    evaluatedOn: editorialReview.evaluatedOn,
    publishedOn: editorialReview.publishedOn,
    reviewedOn: editorialReview.reviewedOn,
    methodology: editorialReview.methodology,
    sources: editorialReview.sources,
    strengths: editorialReview.strengths,
    limitations: editorialReview.limitations,
    suitableFor: editorialReview.suitableFor,
    notSuitableFor: editorialReview.notSuitableFor,
    conclusion: editorialReview.conclusion,
    state: "published",
  };
}

function makeMerchant(
  merged: ProductImportCandidate,
  destinationUrl: string,
  authorizationReference: string
): Merchant {
  const merchantId = `merchant-${merged.slug}`;
  const destinationId = `dest-${merged.slug}`;
  return {
    id: merchantId,
    name: merged.merchantName,
    approvedHosts: [new URL(destinationUrl).hostname.toLowerCase()],
    approvedDestinations: [
      {
        id: destinationId,
        url: destinationUrl,
        authorizationReference,
      },
    ],
  };
}

function makeOffer(merged: ProductImportCandidate, editorialReview: EditorialReviewInput): AffiliateOffer {
  return {
    id: `offer-${merged.slug}`,
    productId: merged.slug,
    merchantId: `merchant-${merged.slug}`,
    approvedDestinationId: `dest-${merged.slug}`,
    label: editorialReview.offerLabel,
    disclosure: editorialReview.disclosure,
    state: "active",
  };
}

function makeCandidateCatalog(
  baseCatalog: CatalogRecords,
  merged: ProductImportCandidate,
  categoryId: string,
  destinationUrl: string,
  editorialReview: EditorialReviewInput
): CatalogRecords {
  return {
    categories: [...baseCatalog.categories],
    products: [...baseCatalog.products, makeProduct(merged, categoryId)],
    reviews: [...baseCatalog.reviews, makeReview(merged.slug, editorialReview)],
    merchants: [...baseCatalog.merchants, makeMerchant(merged, destinationUrl, editorialReview.authorizationReference)],
    offers: [...baseCatalog.offers, makeOffer(merged, editorialReview)],
  };
}

function publicationInputs(merged: ProductImportCandidate):
  | { ok: true; categoryId: string; destinationUrl: string }
  | { ok: false; result: PublishResult } {
  if (!merged.categoryId) {
    return { ok: false, result: publicationFailure("Publication requires a category assignment.", "VALIDATION_FAILED", ["Category is required for publication"]) };
  }
  const destinationUrl = canonicalDestinationUrl(merged.destinationUrl);
  if (!destinationUrl) {
    return { ok: false, result: publicationFailure("Publication requires a valid destination URL.", "VALIDATION_FAILED", ["Destination URL is invalid"]) };
  }
  return { ok: true, categoryId: merged.categoryId, destinationUrl };
}

function preparePublication(
  draft: ImportDraft,
  editorialReview: EditorialReviewInput,
  options?: PublishOptions
): PublicationPreparation {
  const merged: ProductImportCandidate = { ...draft.candidate, ...draft.edits };
  const inputs = publicationInputs(merged);
  if (!inputs.ok) return inputs;
  const baseCatalog: CatalogRecords = options?.catalogRecords ?? {
    categories: [...DEFAULT_CATEGORIES], products: [], reviews: [], merchants: [], offers: [],
  };
  const candidateCatalog = makeCandidateCatalog(baseCatalog, merged, inputs.categoryId, inputs.destinationUrl, editorialReview);
  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  const validationErrors = validateCatalog(candidateCatalog, today);
  return validationErrors.length > 0
    ? { ok: false, result: publicationFailure(`Catalog validation failed: ${validationErrors.join("; ")}`, "VALIDATION_FAILED", validationErrors) }
    : { ok: true, productId: merged.slug };
}

/**
 * Validates editorial review input, synthesizes catalog records,
 * and validates the entire catalog with validateCatalog before publishing.
 */
export async function publishImportDraft(
  draftId: string,
  version: number,
  editorialReview: EditorialReviewInput,
  options?: PublishOptions
): Promise<PublishResult> {
  const draftCheck = await getPublishableDraft(draftId, version);
  if (!draftCheck.ok) return draftCheck.result;

  const preparation = preparePublication(draftCheck.draft, editorialReview, options);
  if (!preparation.ok) return preparation.result;

  // Publication passed; update the draft with the same optimistic version guard.
  const updateResult = await draftStore.updateDraft(
    draftId,
    { ...draftCheck.draft.edits },
    version
  );
  const result: PublishResult = updateResult.ok && updateResult.draft
    ? { ok: true, productId: preparation.productId, state: "published" }
    : {
        ok: false,
        code: updateResult.code ?? "CONFLICT",
        message: updateResult.message ?? "Failed to finalize publication state.",
      };

  if (result.ok && updateResult.draft) updateResult.draft.state = "published";
  return result;
}
