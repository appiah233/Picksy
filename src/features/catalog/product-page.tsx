import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
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
    <article className="picksy-page-shell [overflow-wrap:anywhere]">
      <div className="picksy-container py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="picksy-breadcrumb">
          <Link href="/" className="rounded-sm">
            Home
          </Link>
          <span aria-hidden="true" className="text-slate-600">
            /
          </span>
          <Link href={`/categories/${category.slug}`} className="rounded-sm">
            {category.name}
          </Link>
          <span aria-hidden="true" className="text-slate-600">
            /
          </span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <header className="mt-8 rounded-2xl border border-slate-800/90 bg-slate-900/80 p-7 shadow-xl sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-500/35 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <ShieldCheck aria-hidden="true" size={14} />
              <span>Product review</span>
            </p>
            <span className="rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-1 text-xs font-medium text-slate-300">
              {category.name}
            </span>
          </div>

          <h1 className="picksy-editorial-heading mt-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">{product.summary}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/65 px-3.5 py-2 text-sm text-slate-300">
            <UserCheck aria-hidden="true" size={16} className="text-indigo-400 shrink-0" />
            <span>Intended for {product.intendedUser}.</span>
          </p>
          <p className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-4 text-xs font-medium text-slate-400 sm:text-sm">
            <Calendar aria-hidden="true" size={15} className="text-indigo-400 shrink-0" />
            <span>
              By {review.author} · Evaluated {review.evaluatedOn} · Published {review.publishedOn} ·
              Last reviewed {review.reviewedOn}
            </span>
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-8 leading-relaxed text-slate-200 lg:col-span-8">
            <section aria-labelledby="fit-title" className="picksy-surface-card p-6 sm:p-8">
              <div className="flex items-center gap-2.5">
                <Compass aria-hidden="true" size={20} className="text-indigo-400 shrink-0" />
                <h2
                  id="fit-title"
                  className="picksy-editorial-heading text-2xl font-semibold text-slate-50"
                >
                  Who this is for
                </h2>
              </div>
              <p className="mt-4 text-slate-200">{review.suitableFor}</p>
              <div className="mt-5 grid gap-4 border-t border-slate-800/80 pt-5 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                  <p className="text-sm text-slate-200">
                    <strong className="block mb-1 text-xs uppercase tracking-wider text-amber-300">
                      Who should consider other options:
                    </strong>{" "}
                    {review.notSuitableFor}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                  <p className="text-sm text-slate-200">
                    <strong className="block mb-1 text-xs uppercase tracking-wider text-indigo-300">
                      Intended workflow:
                    </strong>{" "}
                    {product.intendedWorkflow}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section
                aria-labelledby="strengths-title"
                className="picksy-surface-card border-emerald-500/25 p-6 sm:p-7"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    aria-hidden="true"
                    size={20}
                    className="text-emerald-400 shrink-0"
                  />
                  <h2
                    id="strengths-title"
                    className="picksy-editorial-heading text-xl font-semibold text-slate-50"
                  >
                    Observed strengths
                  </h2>
                </div>
                <ul className="mt-4 list-disc space-y-2.5 pl-5 text-sm text-slate-200 marker:text-emerald-400">
                  {review.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="limits-title"
                className="picksy-surface-card border-rose-500/25 p-6 sm:p-7"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle aria-hidden="true" size={20} className="text-rose-400 shrink-0" />
                  <h2
                    id="limits-title"
                    className="picksy-editorial-heading text-xl font-semibold text-slate-50"
                  >
                    Limitations
                  </h2>
                </div>
                <ul className="mt-4 list-disc space-y-2.5 pl-5 text-sm text-slate-200 marker:text-rose-400">
                  {review.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section aria-labelledby="method-title" className="picksy-surface-card p-6 sm:p-8">
              <div className="flex items-center gap-2.5">
                <BookOpen aria-hidden="true" size={20} className="text-indigo-400 shrink-0" />
                <h2
                  id="method-title"
                  className="picksy-editorial-heading text-2xl font-semibold text-slate-50"
                >
                  Evaluation method and sources
                </h2>
              </div>
              <p className="mt-4 text-slate-200">{review.methodology}</p>
              <ul className="mt-5 space-y-2.5 border-t border-slate-800/80 pt-5 text-sm">
                {review.sources.map((source, index) => (
                  <li key={`${source}-${index}`} className="flex items-center gap-2">
                    <ExternalLink
                      aria-hidden="true"
                      size={14}
                      className="text-indigo-400 shrink-0"
                    />
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm text-indigo-300 underline decoration-indigo-500/50 underline-offset-4 transition-colors hover:text-indigo-200"
                    >
                      Source {index + 1}: {new URL(source).hostname} (opens in a new tab)
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="conclusion-title"
              className="picksy-surface-card border-indigo-500/35 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/35 p-6 sm:p-8"
            >
              <span className="picksy-kicker">Editorial Verdict</span>
              <h2
                id="conclusion-title"
                className="picksy-editorial-heading mt-1 text-2xl font-semibold text-slate-50"
              >
                Conclusion
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-100">{review.conclusion}</p>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-28">
            {destination && (
              <aside className="picksy-offer-aside p-6 sm:p-7" aria-label="Merchant offer">
                <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                  Verified Merchant Offer
                </span>
                <h2 className="picksy-editorial-heading mt-3 text-2xl font-semibold text-slate-50">
                  Visit {destination.merchant.name}
                </h2>
                <p className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/70 p-3.5 text-xs leading-relaxed text-slate-300">
                  {destination.offer.disclosure}
                </p>
                <a
                  href={destination.destination.url}
                  rel="sponsored noopener noreferrer"
                  target="_blank"
                  aria-describedby="merchant-new-tab-note"
                  className="picksy-button-primary mt-5 inline-flex min-h-12 w-full max-w-full items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-bold text-white shadow-lg [overflow-wrap:anywhere]"
                >
                  {destination.offer.label}
                </a>
                <p id="merchant-new-tab-note" className="mt-2.5 text-center text-xs text-slate-400">
                  Opens merchant website in a new tab.
                </p>
              </aside>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
