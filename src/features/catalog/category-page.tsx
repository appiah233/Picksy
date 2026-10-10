import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="mx-auto max-w-6xl px-4 py-12 [overflow-wrap:anywhere] sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-600">
        <Link
          href="/"
          className="rounded-sm underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          Home
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span aria-current="page">{category.name}</span>
      </nav>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
        {category.name}
      </h1>
      <p className="mt-4 max-w-3xl text-zinc-700">{category.description}</p>
      <p className="mt-2 max-w-3xl text-zinc-600">For {category.audience}.</p>
      <section aria-labelledby="reviewed-products" className="mt-12">
        <h2 id="reviewed-products" className="text-2xl font-semibold text-zinc-950">
          Reviewed products
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Coverage is limited to the products shown here. This is not a ranking or a complete market
          comparison.
        </p>
        {products.length === 0 ? (
          <p className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-zinc-700">
            No product reviews are published in this category yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
              >
                <h3 className="text-lg font-semibold text-zinc-950">{product.name}</h3>
                <p className="mt-2 text-sm text-zinc-600">{product.summary}</p>
                <span className="mt-4 inline-block text-sm font-medium text-zinc-900">
                  Read review →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
