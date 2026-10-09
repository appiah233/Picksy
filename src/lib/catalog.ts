import "server-only";
import { catalogRecords } from "../content/catalog";
import { createCatalogAccess } from "./catalog-access";
import { validateCategoryTaxonomy } from "./catalog-validation";
import { siteConfig } from "../config/site";

const taxonomyErrors = validateCategoryTaxonomy(catalogRecords, siteConfig.categories);
if (taxonomyErrors.length)
  throw new Error(`Invalid catalog taxonomy: ${taxonomyErrors.join("; ")}`);

// The production accessor. It is built only from the production catalogue.
export const catalog = createCatalogAccess(catalogRecords);
