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

export function createCatalogAccess(records: CatalogRecords) {
  const errors = validateCatalog(records);
  if (errors.length) throw new Error(`Invalid catalog: ${errors.join("; ")}`);

  function publishableProduct(product: Product): boolean {
    return (
      product.state === "published" &&
      records.categories.some(
        (category) => category.id === product.categoryId && category.state === "published"
      ) &&
      records.reviews.some(
        (review) =>
          review.productId === product.id &&
          review.state === "published" &&
          isCompleteReview(review)
      )
    );
  }

  function getPublishedCategories(): Category[] {
    return records.categories.filter((category) => category.state === "published");
  }

  function getPublishedCategoryBySlug(slug: string): Category | undefined {
    return getPublishedCategories().find((category) => category.slug === slug);
  }

  function getPublishedProductsForCategory(categoryId: string): Product[] {
    return records.products.filter(
      (product) => product.categoryId === categoryId && publishableProduct(product)
    );
  }

  function getPublishedProductBySlug(slug: string): Product | undefined {
    return records.products.find((product) => product.slug === slug && publishableProduct(product));
  }

  function getPublishedReviewForProduct(productId: string): Review | undefined {
    if (
      !records.products.some((product) => product.id === productId && publishableProduct(product))
    )
      return undefined;
    return records.reviews.find(
      (review) => review.productId === productId && review.state === "published"
    );
  }

  function getActiveOfferForProduct(
    productId: string
  ): { offer: AffiliateOffer; merchant: Merchant; destination: ApprovedDestination } | undefined {
    if (
      !records.products.some((product) => product.id === productId && publishableProduct(product))
    )
      return undefined;
    for (const offer of records.offers) {
      if (offer.productId !== productId || offer.state !== "active") continue;
      const merchant = records.merchants.find((item) => item.id === offer.merchantId);
      const destination = merchant?.approvedDestinations.find(
        (item) => item.id === offer.approvedDestinationId
      );
      if (merchant && destination && isRenderSafeOffer(offer, merchant))
        return { offer, merchant, destination };
    }
    return undefined;
  }

  return {
    getPublishedCategories,
    getPublishedCategoryBySlug,
    getPublishedProductsForCategory,
    getPublishedProductBySlug,
    getPublishedReviewForProduct,
    getActiveOfferForProduct,
  };
}
