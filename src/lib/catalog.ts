import "server-only";
import { catalogRecords } from "../content/catalog";
import { createCatalogAccess, type CatalogAccess } from "./catalog-access";
import { validateCategoryTaxonomy } from "./catalog-validation";
import { sanityCatalogAdapter } from "./sanity-catalog-adapter";
import { siteConfig } from "../config/site";

const taxonomyErrors = validateCategoryTaxonomy(catalogRecords, siteConfig.categories);
if (taxonomyErrors.length)
  throw new Error(`Invalid catalog taxonomy: ${taxonomyErrors.join("; ")}`);

// The production baseline accessor. It is built only from the production catalogue.
export const catalog: CatalogAccess = createCatalogAccess(catalogRecords);

/**
 * Loads published catalogue records from the Sanity Content Lake via SanityCatalogAdapter.
 * Enforces fail-closed security:
 * 1. Only published records are retrieved (GROQ excludes drafts, perspective="published").
 * 2. SanityCatalogAdapter runs validateCatalog() verifying editorial and affiliate constraints.
 * 3. Validates category taxonomy against siteConfig.categories.
 * 4. Freezes records into an immutable CatalogAccess.
 * 5. Falls back safely to empty catalog on validation failure or network error.
 */
export async function getCatalog(): Promise<CatalogAccess> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return catalog;
  }
  try {
    const { records, valid, errors } = await sanityCatalogAdapter.loadPublishedCatalog();
    if (valid && records && records.categories.length > 0) {
      const liveTaxonomyErrors = validateCategoryTaxonomy(records, siteConfig.categories);
      if (liveTaxonomyErrors.length === 0) {
        return createCatalogAccess(records);
      }
      console.warn("[Catalog] Taxonomy validation failed for Sanity records:", liveTaxonomyErrors);
    } else if (!valid && errors.length > 0) {
      console.warn("[Catalog] Sanity catalogue validation failed:", errors);
    }
  } catch (err) {
    console.warn(
      "[Catalog] Failed to load published catalog from Sanity Content Lake:",
      err instanceof Error ? err.message : err
    );
  }
  return catalog;
}
