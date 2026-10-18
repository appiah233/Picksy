import type {
  AffiliateOffer,
  CatalogRecords,
  Category,
  Merchant,
  Product,
  Review,
} from "./catalog-types.ts";
import { validateCatalog } from "./catalog-validation.ts";
import { SanityClient, publicSanityClient } from "./sanity-client.ts";

export interface SanityCategoryDoc {
  _id: string;
  slug: { current: string };
  name: string;
  description: string;
  audience: string;
}

export interface SanityProductDoc {
  _id: string;
  slug: { current: string };
  category?: { _ref: string };
  name: string;
  officialSource: string;
  summary: string;
  intendedUser: string;
  intendedWorkflow: string;
  editorialImage?: { alt: string; url: string } | null;
}

export interface SanityReviewDoc {
  product?: { _ref: string };
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
}

export interface SanityMerchantDoc {
  _id: string;
  name: string;
  approvedHosts: string[];
  approvedDestinations: Array<{
    destinationId: string;
    url: string;
    authorizationReference: string;
  }>;
}

export interface SanityAffiliateOfferDoc {
  _id: string;
  product?: { _ref: string };
  merchant?: { _ref: string };
  approvedDestinationId: string;
  label: string;
  disclosure: string;
  state: "active" | "inactive";
}

export interface SanityCatalogQueryResult {
  categories: SanityCategoryDoc[];
  products: SanityProductDoc[];
  reviews: SanityReviewDoc[];
  merchants: SanityMerchantDoc[];
  offers: SanityAffiliateOfferDoc[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: Record<string, unknown>, fields: string[]): boolean =>
  fields.every((field) => typeof value[field] === "string");
const stringArray = (value: unknown): boolean =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");
const reference = (value: unknown): boolean => isRecord(value) && strings(value, ["_ref"]);
const slug = (value: unknown): boolean => isRecord(value) && strings(value, ["current"]);
const records = (value: unknown, check: (entry: Record<string, unknown>) => boolean): boolean =>
  Array.isArray(value) && value.every((entry) => isRecord(entry) && check(entry));
const editorialImage = (value: unknown): boolean =>
  value == null || (isRecord(value) && strings(value, ["alt", "url"]));

// Content Lake responses are untrusted runtime data. This only checks shape;
// validateCatalog remains responsible for editorial and destination invariants.
function hasCatalogShape(value: unknown): value is SanityCatalogQueryResult {
  return (
    isRecord(value) &&
    records(
      value.categories,
      (entry) => strings(entry, ["_id", "name", "description", "audience"]) && slug(entry.slug)
    ) &&
    records(
      value.products,
      (entry) =>
        strings(entry, [
          "_id",
          "name",
          "officialSource",
          "summary",
          "intendedUser",
          "intendedWorkflow",
        ]) &&
        slug(entry.slug) &&
        reference(entry.category) &&
        editorialImage(entry.editorialImage)
    ) &&
    records(
      value.reviews,
      (entry) =>
        strings(entry, [
          "author",
          "evaluatedOn",
          "publishedOn",
          "reviewedOn",
          "methodology",
          "suitableFor",
          "notSuitableFor",
          "conclusion",
        ]) &&
        reference(entry.product) &&
        stringArray(entry.sources) &&
        stringArray(entry.strengths) &&
        stringArray(entry.limitations)
    ) &&
    records(
      value.merchants,
      (entry) =>
        strings(entry, ["_id", "name"]) &&
        stringArray(entry.approvedHosts) &&
        records(entry.approvedDestinations, (destination) =>
          strings(destination, ["destinationId", "url", "authorizationReference"])
        )
    ) &&
    records(
      value.offers,
      (entry) =>
        strings(entry, ["_id", "approvedDestinationId", "label", "disclosure"]) &&
        reference(entry.product) &&
        reference(entry.merchant) &&
        (entry.state === "active" || entry.state === "inactive")
    )
  );
}

function invalidCatalog(errors: string[]): {
  records: CatalogRecords;
  valid: false;
  errors: string[];
} {
  return {
    records: { categories: [], products: [], reviews: [], merchants: [], offers: [] },
    valid: false,
    errors,
  };
}

export const PUBLISHED_CATALOG_GROQ = `{
  "categories": *[_type == "category" && !(_id in path("drafts.**"))] {
    _id,
    slug,
    name,
    description,
    audience
  },
  "products": *[_type == "product" && !(_id in path("drafts.**"))] {
    _id,
    slug,
    category,
    name,
    officialSource,
    editorialImage { alt, "url": asset->url },
    summary,
    intendedUser,
    intendedWorkflow
  },
  "reviews": *[_type == "review" && !(_id in path("drafts.**"))] {
    product,
    author,
    evaluatedOn,
    publishedOn,
    reviewedOn,
    methodology,
    sources,
    strengths,
    limitations,
    suitableFor,
    notSuitableFor,
    conclusion
  },
  "merchants": *[_type == "merchant" && !(_id in path("drafts.**"))] {
    _id,
    name,
    approvedHosts,
    approvedDestinations
  },
  "offers": *[_type == "affiliateOffer" && !(_id in path("drafts.**"))] {
    _id,
    product,
    merchant,
    approvedDestinationId,
    label,
    disclosure,
    state
  }
}`;

export class SanityCatalogAdapter {
  private client: SanityClient;

  constructor(client: SanityClient = publicSanityClient) {
    this.client = client;
  }

  /**
   * Fetches published records from Sanity Content Lake, normalizes references,
   * validates against validateCatalog(), and returns clean CatalogRecords.
   * Enforces fail-closed security: any validation failure returns an empty catalogue.
   */
  async loadPublishedCatalog(today?: string): Promise<{
    records: CatalogRecords;
    valid: boolean;
    errors: string[];
  }> {
    const rawData = await this.client.query<unknown>(PUBLISHED_CATALOG_GROQ, {}, "published");
    if (!hasCatalogShape(rawData)) {
      return invalidCatalog(["Invalid published Sanity catalogue structure."]);
    }

    const categories: Category[] = (rawData.categories || []).map((c) => ({
      id: c._id,
      slug: c.slug?.current || "",
      name: c.name,
      description: c.description,
      audience: c.audience,
      state: "published",
    }));

    const products: Product[] = (rawData.products || []).map((p) => ({
      id: p._id,
      slug: p.slug?.current || "",
      categoryId: p.category?._ref || "",
      name: p.name,
      officialSource: p.officialSource,
      summary: p.summary,
      intendedUser: p.intendedUser,
      intendedWorkflow: p.intendedWorkflow,
      editorialImage: p.editorialImage ?? undefined,
      state: "published",
    }));

    const reviews: Review[] = (rawData.reviews || []).map((r) => ({
      productId: r.product?._ref || "",
      author: r.author,
      evaluatedOn: r.evaluatedOn,
      publishedOn: r.publishedOn,
      reviewedOn: r.reviewedOn,
      methodology: r.methodology,
      sources: r.sources || [],
      strengths: r.strengths || [],
      limitations: r.limitations || [],
      suitableFor: r.suitableFor,
      notSuitableFor: r.notSuitableFor,
      conclusion: r.conclusion,
      state: "published",
    }));

    const merchants: Merchant[] = (rawData.merchants || []).map((m) => ({
      id: m._id,
      name: m.name,
      approvedHosts: m.approvedHosts || [],
      approvedDestinations: (m.approvedDestinations || []).map((d) => ({
        id: d.destinationId,
        url: d.url,
        authorizationReference: d.authorizationReference,
      })),
    }));

    const offers: AffiliateOffer[] = (rawData.offers || []).map((o) => ({
      id: o._id,
      productId: o.product?._ref || "",
      merchantId: o.merchant?._ref || "",
      approvedDestinationId: o.approvedDestinationId,
      label: o.label,
      disclosure: o.disclosure,
      state: o.state,
    }));

    const candidateRecords: CatalogRecords = {
      categories,
      products,
      reviews,
      merchants,
      offers,
    };

    // Run Gate 3 validation
    const validationErrors = validateCatalog(candidateRecords, today);

    if (validationErrors.length > 0) {
      // FAIL CLOSED: do not emit invalid records to the public site
      return invalidCatalog(validationErrors);
    }

    return {
      records: candidateRecords,
      valid: true,
      errors: [],
    };
  }
}

export const sanityCatalogAdapter = new SanityCatalogAdapter();
