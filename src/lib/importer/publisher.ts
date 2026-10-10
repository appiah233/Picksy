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
  const draft = await draftStore.getDraft(draftId);
  if (!draft) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: `Draft with ID "${draftId}" not found.`,
    };
  }

  // Optimistic concurrency check
  if (draft.version !== version) {
    return {
      ok: false,
      code: "CONFLICT",
      message: `Version conflict: Draft is at version ${draft.version}, but version ${version} was supplied.`,
    };
  }

  if (draft.state === "published") {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: `Draft "${draftId}" is already published.`,
    };
  }

  // Merge candidate with edits
  const merged: ProductImportCandidate = {
    ...draft.candidate,
    ...draft.edits,
  };

  if (!merged.categoryId) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Publication requires a category assignment.",
      errors: ["Category is required for publication"],
    };
  }

  const baseCatalog: CatalogRecords = options?.catalogRecords ?? {
    categories: [...DEFAULT_CATEGORIES],
    products: [],
    reviews: [],
    merchants: [],
    offers: [],
  };

  const productId = merged.slug;

  const product: Product = {
    id: productId,
    slug: merged.slug,
    categoryId: merged.categoryId,
    name: merged.name,
    officialSource: merged.officialSource || merged.canonicalUrl,
    summary: merged.summary,
    intendedUser: merged.intendedUser,
    intendedWorkflow: merged.intendedWorkflow,
    state: "published",
  };

  const review: Review = {
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

  let merchantHost = "merchant.example";
  try {
    merchantHost = new URL(merged.destinationUrl).hostname.toLowerCase();
  } catch {
    // fallback host
  }

  const merchantId = `merchant-${merged.slug}`;
  const destinationId = `dest-${merged.slug}`;

  const merchant: Merchant = {
    id: merchantId,
    name: merged.merchantName,
    approvedHosts: [merchantHost],
    approvedDestinations: [
      {
        id: destinationId,
        url: merged.destinationUrl,
        authorizationReference: editorialReview.authorizationReference,
      },
    ],
  };

  const offer: AffiliateOffer = {
    id: `offer-${merged.slug}`,
    productId,
    merchantId,
    approvedDestinationId: destinationId,
    label: editorialReview.offerLabel,
    disclosure: editorialReview.disclosure,
    state: "active",
  };

  const candidateCatalog: CatalogRecords = {
    categories: [...baseCatalog.categories],
    products: [...baseCatalog.products, product],
    reviews: [...baseCatalog.reviews, review],
    merchants: [...baseCatalog.merchants, merchant],
    offers: [...baseCatalog.offers, offer],
  };

  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  const validationErrors = validateCatalog(candidateCatalog, today);

  if (validationErrors.length > 0) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: `Catalog validation failed: ${validationErrors.join("; ")}`,
      errors: validationErrors,
    };
  }

  // Publication passed! Update draft state to published
  const updateResult = await draftStore.updateDraft(
    draftId,
    {
      ...draft.edits,
    },
    version
  );

  if (!updateResult.ok || !updateResult.draft) {
    return {
      ok: false,
      code: updateResult.code ?? "CONFLICT",
      message: updateResult.message ?? "Failed to finalize publication state.",
    };
  }

  // Set draft state = published
  updateResult.draft.state = "published";

  return {
    ok: true,
    productId,
    state: "published",
  };
}
