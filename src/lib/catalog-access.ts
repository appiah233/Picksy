import { isCompleteReview, isRenderSafeOffer, validateCatalog } from "./catalog-validation.ts";
import type {
  CatalogRecords,
  Category,
  Product,
  Review,
  AffiliateOffer,
  Merchant,
  ApprovedDestination,
} from "./catalog-types";

type ResolvedOffer = {
  offer: AffiliateOffer;
  merchant: Merchant;
  destination: ApprovedDestination;
};

function publishableProduct(records: CatalogRecords, product: Product): boolean {
  return (
    product.state === "published" &&
    records.categories.some(
      (category) => category.id === product.categoryId && category.state === "published"
    ) &&
    records.reviews.some(
      (review) =>
        review.productId === product.id && review.state === "published" && isCompleteReview(review)
    )
  );
}

function publishedProducts(records: CatalogRecords): Product[] {
  return records.products.filter((product) => publishableProduct(records, product));
}

function publishedReview(records: CatalogRecords, productId: string): Review | undefined {
  if (!publishedProducts(records).some((product) => product.id === productId)) return undefined;
  return records.reviews.find(
    (review) => review.productId === productId && review.state === "published"
  );
}

function resolveOffer(records: CatalogRecords, offer: AffiliateOffer): ResolvedOffer | undefined {
  const merchant = records.merchants.find((item) => item.id === offer.merchantId);
  const destination = merchant?.approvedDestinations.find(
    (item) => item.id === offer.approvedDestinationId
  );
  if (!merchant || !destination || !isRenderSafeOffer(offer, merchant)) return undefined;
  return { offer, merchant, destination };
}

function activeOffer(records: CatalogRecords, productId: string): ResolvedOffer | undefined {
  if (!publishedProducts(records).some((product) => product.id === productId)) return undefined;
  for (const offer of records.offers) {
    if (offer.productId !== productId || offer.state !== "active") continue;
    const resolved = resolveOffer(records, offer);
    if (resolved) return resolved;
  }
  return undefined;
}

export function createCatalogAccess(records: CatalogRecords) {
  const errors = validateCatalog(records);
  if (errors.length) throw new Error(`Invalid catalog: ${errors.join("; ")}`);
  const categories = (): Category[] =>
    records.categories.filter((category) => category.state === "published");
  return {
    getPublishedCategories: categories,
    getPublishedCategoryBySlug: (slug: string): Category | undefined =>
      categories().find((category) => category.slug === slug),
    getPublishedProductsForCategory: (categoryId: string): Product[] =>
      publishedProducts(records).filter((product) => product.categoryId === categoryId),
    getPublishedProductBySlug: (slug: string): Product | undefined =>
      publishedProducts(records).find((product) => product.slug === slug),
    getPublishedReviewForProduct: (productId: string): Review | undefined =>
      publishedReview(records, productId),
    getActiveOfferForProduct: (productId: string): ResolvedOffer | undefined =>
      activeOffer(records, productId),
  };
}
