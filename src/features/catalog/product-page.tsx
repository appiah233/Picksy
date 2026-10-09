import type { Metadata } from "next";
import Link from "next/link";
import { assertValidatedCatalog, type CatalogAccess } from "@/lib/catalog-access";

export function productStaticParams(catalog: CatalogAccess) {
  assertValidatedCatalog(catalog);
  return catalog
    .getPublishedCategories()
    .flatMap((category) =>
      catalog.getPublishedProductsForCategory(category.id).map(({ slug }) => ({ slug }))
    );
}

export function productMetadata(catalog: CatalogAccess, slug: string): Metadata {
  assertValidatedCatalog(catalog);
  const product = catalog.getPublishedProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return { title: `${product.name} review`, description: product.summary };
}

// Renders a published product with its review from the given catalogue accessor, or null when
// the product, its review or its category is not published.
export function renderProductPage(catalog: CatalogAccess, slug: string) {
  assertValidatedCatalog(catalog);
  const product = catalog.getPublishedProductBySlug(slug);
  if (!product) return null;
  const review = catalog.getPublishedReviewForProduct(product.id);
  if (!review) return null;
  const category = catalog.getPublishedCategories().find(({ id }) => id === product.categoryId);
  if (!category) return null;
  const destination = catalog.getActiveOfferForProduct(product.id);

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 [overflow-wrap:anywhere] sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-600">
        <Link
          href="/"
          className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          Home
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <Link
          href={`/categories/${category.slug}`}
          className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        >
          {category.name}
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <header className="mt-8">
        <p className="text-sm font-medium text-zinc-600">Product review</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-4 text-lg text-zinc-700">{product.summary}</p>
        <p className="mt-3 text-zinc-700">Intended for {product.intendedUser}.</p>
        <p className="mt-4 text-sm text-zinc-600">
          By {review.author} · Evaluated {review.evaluatedOn} · Published {review.publishedOn} ·
          Last reviewed {review.reviewedOn}
        </p>
      </header>
      <div className="mt-12 space-y-10 leading-relaxed text-zinc-700">
        <section aria-labelledby="fit-title">
          <h2 id="fit-title" className="text-2xl font-semibold text-zinc-950">
            Who this is for
          </h2>
          <p className="mt-3">{review.suitableFor}</p>
          <p className="mt-3">
            <strong>Who should consider other options:</strong> {review.notSuitableFor}
          </p>
          <p className="mt-3">
            <strong>Intended workflow:</strong> {product.intendedWorkflow}
          </p>
        </section>
        <section aria-labelledby="method-title">
          <h2 id="method-title" className="text-2xl font-semibold text-zinc-950">
            Evaluation method and sources
          </h2>
          <p className="mt-3">{review.methodology}</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            {review.sources.map((source, index) => (
              <li key={`${source}-${index}`}>
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                >
                  Source {index + 1}: {new URL(source).hostname} (opens in a new tab)
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="strengths-title">
          <h2 id="strengths-title" className="text-2xl font-semibold text-zinc-950">
            Observed strengths
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            {review.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="limits-title">
          <h2 id="limits-title" className="text-2xl font-semibold text-zinc-950">
            Limitations
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            {review.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="conclusion-title">
          <h2 id="conclusion-title" className="text-2xl font-semibold text-zinc-950">
            Conclusion
          </h2>
          <p className="mt-3">{review.conclusion}</p>
        </section>
        {destination && (
          <aside
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-6"
            aria-label="Merchant offer"
          >
            <h2 className="text-xl font-semibold text-zinc-950">
              Visit {destination.merchant.name}
            </h2>
            <p className="mt-3 text-sm">{destination.offer.disclosure}</p>
            <a
              href={destination.destination.url}
              rel="sponsored noopener noreferrer"
              target="_blank"
              className="mt-5 inline-flex min-h-11 max-w-full items-center rounded-md bg-zinc-950 px-5 py-3 text-center font-medium text-white [overflow-wrap:anywhere] hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            >
              {destination.offer.label}
            </a>
            <p className="mt-2 text-xs text-zinc-600">Opens merchant website in a new tab.</p>
          </aside>
        )}
      </div>
    </article>
  );
}
