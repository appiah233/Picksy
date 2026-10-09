import type { CatalogRecords } from "../../src/lib/catalog-types";

// Synthetic catalogue for rendered tests. Nothing here describes a real product, merchant,
// review or agreement, and nothing under `src/` may import this file. Every record carries the
// marker so that any leak into production code or build output is detectable.
export const SYNTHETIC_MARKER = "PICKSY-SYNTHETIC-R5-4c1e9a7b";

export const OFFER_PRODUCT_SLUG = "synthetic-offer-tool";
export const PLAIN_PRODUCT_SLUG = "synthetic-plain-tool";
// The category ID and slug must exist in the site taxonomy for the home page to link to it.
export const CATEGORY_SLUG = "crm-automation";
export const DESTINATION_URL = "https://merchant-one.example/offer/plan?ref=picksy&campaign=r5";
export const SOURCE_URLS = ["https://vendor.example/docs", "https://standards.example/report"];

// Returns a fresh copy on every call so tests can mutate it freely.
export function syntheticCatalog(): CatalogRecords {
  const review = (productId: string) => ({
    productId,
    author: `${SYNTHETIC_MARKER} Reviewer`,
    evaluatedOn: "2026-01-10",
    publishedOn: "2026-01-12",
    reviewedOn: "2026-01-15",
    methodology: `${SYNTHETIC_MARKER} methodology: document review.`,
    sources: [...SOURCE_URLS],
    strengths: [`${SYNTHETIC_MARKER} strength`],
    limitations: [`${SYNTHETIC_MARKER} limitation`],
    suitableFor: `${SYNTHETIC_MARKER} suitable audience.`,
    notSuitableFor: `${SYNTHETIC_MARKER} unsuitable audience.`,
    conclusion: `${SYNTHETIC_MARKER} conclusion.`,
    state: "published" as const,
  });
  const product = (id: string, slug: string, name: string) => ({
    id,
    slug,
    categoryId: CATEGORY_SLUG,
    name: `${SYNTHETIC_MARKER} ${name}`,
    officialSource: "https://vendor.example",
    summary: `${SYNTHETIC_MARKER} summary of ${name}.`,
    intendedUser: `${SYNTHETIC_MARKER} operators`,
    intendedWorkflow: `${SYNTHETIC_MARKER} workflow`,
    state: "published" as const,
  });

  return {
    categories: [
      {
        id: CATEGORY_SLUG,
        slug: CATEGORY_SLUG,
        name: `${SYNTHETIC_MARKER} Category`,
        description: `${SYNTHETIC_MARKER} category description.`,
        audience: `${SYNTHETIC_MARKER} audience`,
        state: "published",
      },
    ],
    products: [
      product("synthetic-product-offer", OFFER_PRODUCT_SLUG, "Offer Tool"),
      product("synthetic-product-plain", PLAIN_PRODUCT_SLUG, "Plain Tool"),
    ],
    reviews: [review("synthetic-product-offer"), review("synthetic-product-plain")],
    merchants: [
      {
        id: "synthetic-merchant-one",
        name: `${SYNTHETIC_MARKER} Merchant One`,
        approvedHosts: ["merchant-one.example"],
        approvedDestinations: [
          {
            id: "synthetic-destination-one",
            url: DESTINATION_URL,
            authorizationReference: `${SYNTHETIC_MARKER} placeholder, not an agreement`,
          },
        ],
      },
      {
        id: "synthetic-merchant-two",
        name: `${SYNTHETIC_MARKER} Merchant Two`,
        approvedHosts: ["merchant-two.example"],
        approvedDestinations: [
          {
            id: "synthetic-destination-two",
            url: "https://merchant-two.example/offer",
            authorizationReference: `${SYNTHETIC_MARKER} placeholder, not an agreement`,
          },
        ],
      },
    ],
    offers: [
      {
        id: "synthetic-offer-one",
        productId: "synthetic-product-offer",
        merchantId: "synthetic-merchant-one",
        approvedDestinationId: "synthetic-destination-one",
        label: `Visit ${SYNTHETIC_MARKER} Merchant One`,
        disclosure: `${SYNTHETIC_MARKER} disclosure: we may earn a commission.`,
        state: "active",
      },
    ],
  };
}
