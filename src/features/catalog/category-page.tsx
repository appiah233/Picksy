import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Layers, ShieldCheck, Users } from "lucide-react";
import { assertValidatedCatalog, type CatalogAccess } from "@/lib/catalog-access";

export function categoryStaticParams(catalog: CatalogAccess) {
  assertValidatedCatalog(catalog);
  return catalog.getPublishedCategories().map(({ slug }) => ({ slug }));
}

export function categoryMetadata(catalog: CatalogAccess, slug: string): Metadata {
  assertValidatedCatalog(catalog);
  const category = catalog.getPublishedCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  return { title: category.name, description: category.description };
}

// Renders a published category from the given catalogue accessor, or null when there is none.
export function renderCategoryPage(catalog: CatalogAccess, slug: string) {
  assertValidatedCatalog(catalog);
  const category = catalog.getPublishedCategoryBySlug(slug);
  if (!category) return null;
  const products = catalog.getPublishedProductsForCategory(category.id);

  return (
    <div className="picksy-page-shell [overflow-wrap:anywhere]">
      <div className="picksy-container py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="picksy-breadcrumb">
          <Link href="/" className="rounded-sm">
            Home
          </Link>
          <span aria-hidden="true" className="text-slate-600">
            /
          </span>
          <span aria-current="page">{category.name}</span>
        </nav>

        <header className="mt-8 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-7 shadow-xl sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/35 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <Layers aria-hidden="true" size={14} />
            <span>Category Dossier</span>
          </div>
          <h1 className="picksy-editorial-heading mt-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-lg">
            {category.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
            <p className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-300">
              <Users aria-hidden="true" size={16} className="text-indigo-400 shrink-0" />
              <span>For {category.audience}.</span>
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck aria-hidden="true" size={15} />
              <span>
                {products.length} {products.length === 1 ? "verified review" : "verified reviews"}
              </span>
            </span>
          </div>
        </header>

        <section aria-labelledby="reviewed-products" className="mt-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="picksy-kicker">Editorial Selection</span>
              <h2
                id="reviewed-products"
                className="picksy-editorial-heading mt-1 text-2xl font-semibold text-slate-50 sm:text-3xl"
              >
                Reviewed products
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-400">
              Coverage is limited to the products shown here. This is not a ranking or a complete
              market comparison.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="picksy-surface-card mt-8 p-8 text-center">
              <p className="text-base text-slate-300">
                No product reviews are published in this category yet.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {products.map((product) => {
                const offer = catalog.getActiveOfferForProduct(product.id);
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="picksy-surface-card-interactive group flex flex-col justify-between p-6 sm:p-7"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                        <span className="text-indigo-300">{category.name}</span>
                        {offer ? (
                          <span className="picksy-merchant">{offer.merchant.name}</span>
                        ) : (
                          <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-slate-300">
                            Editorial review
                          </span>
                        )}
                      </div>
                      <h3 className="picksy-editorial-heading mt-3 text-xl font-semibold text-slate-50 group-hover:text-indigo-200">
                        {product.name}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                        {product.summary}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-800/90 pt-4 text-xs">
                      <span className="text-slate-400 line-clamp-1">
                        Best for: {product.intendedUser}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-indigo-300 group-hover:text-indigo-200">
                        Read review →
                        <ArrowUpRight aria-hidden="true" size={14} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
