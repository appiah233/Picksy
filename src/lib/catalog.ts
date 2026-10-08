import "server-only";
import { catalogRecords } from "../content/catalog";
import { createCatalogAccess } from "./catalog-access";
import { validateCategoryTaxonomy } from "./catalog-validation";
import { siteConfig } from "../config/site";

const taxonomyErrors = validateCategoryTaxonomy(catalogRecords, siteConfig.categories);
if (taxonomyErrors.length)
  throw new Error(`Invalid catalog taxonomy: ${taxonomyErrors.join("; ")}`);

export const {
  getPublishedCategories,
  getPublishedCategoryBySlug,
  getPublishedProductsForCategory,
  getPublishedProductBySlug,
  getPublishedReviewForProduct,
  getActiveOfferForProduct,
} = createCatalogAccess(catalogRecords);
