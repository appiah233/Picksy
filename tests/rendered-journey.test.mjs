import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  CATEGORY_SLUG,
  DESTINATION_URL,
  OFFER_PRODUCT_SLUG,
  PLAIN_PRODUCT_SLUG,
  SOURCE_URLS,
  SYNTHETIC_MARKER,
  syntheticCatalog,
} from "./fixtures/synthetic-catalog.ts";
import { loadSource, renderHtml, sourceRoot } from "./support/render-harness.mjs";

const { createCatalogAccess } = loadSource("lib/catalog-access.ts");
const { validateCatalog, validateCategoryTaxonomy } = loadSource("lib/catalog-validation.ts");
const { siteConfig } = loadSource("config/site.ts");
const { renderHomePage } = loadSource("features/catalog/home-page.tsx");
const { categoryMetadata, categoryStaticParams, renderCategoryPage } = loadSource(
  "features/catalog/category-page.tsx"
);
const { productMetadata, productStaticParams, renderProductPage } = loadSource(
  "features/catalog/product-page.tsx"
);

const decode = (value) =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

// Every link in rendered markup, with its attributes and visible text.
function links(html) {
  return [...html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attributes, inner]) => ({
    ...Object.fromEntries(
      [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name,
        decode(value),
      ])
    ),
    text: decode(inner.replace(/<[^>]*>/g, "")),
  }));
}

const page = (element) => {
  assert.ok(element, "expected the page to render");
  return renderHtml(element);
};

// Resolves a rendered link to the App Router file that serves it, the way Next.js does: an exact
// directory wins, otherwise a single dynamic `[param]` directory. Returns undefined for a dead link.
function routeFile(href) {
  let directory = path.join(sourceRoot, "app");
  for (const segment of href.split("/").filter(Boolean)) {
    const entries = readdirSync(directory, { withFileTypes: true }).filter((e) => e.isDirectory());
    const match =
      entries.find((entry) => entry.name === segment) ??
      entries.find((entry) => entry.name.startsWith("[") && !entry.name.startsWith("[..."));
    if (!match) return undefined;
    directory = path.join(directory, match.name);
  }
  const file = path.join(directory, "page.tsx");
  return existsSync(file) ? path.relative(sourceRoot, file).replaceAll("\\", "/") : undefined;
}

test("synthetic records pass normal catalogue and taxonomy validation", () => {
  const records = syntheticCatalog();
  assert.deepEqual(validateCatalog(records), []);
  assert.deepEqual(validateCategoryTaxonomy(records, siteConfig.categories), []);
});

test("home → category → product journey renders by following the rendered links", () => {
  const catalog = createCatalogAccess(syntheticCatalog());

  const home = page(renderHomePage(catalog));
  const categoryLinks = links(home).filter((link) => link.href.startsWith("/categories/"));
  assert.equal(categoryLinks.length, 1);
  assert.equal(categoryLinks[0].href, `/categories/${CATEGORY_SLUG}`);
  assert.equal(routeFile(categoryLinks[0].href), "app/categories/[slug]/page.tsx");
  assert.match(categoryLinks[0].text, new RegExp(`${SYNTHETIC_MARKER} Category`));
  assert.match(categoryLinks[0].text, /Explore reviewed products/);
  assert.equal(home.match(/Coverage coming soon/g).length, siteConfig.categories.length - 1);

  const category = page(renderCategoryPage(catalog, categoryLinks[0].href.split("/").pop()));
  assert.match(category, new RegExp(`<h1[^>]*>${SYNTHETIC_MARKER} Category</h1>`));
  const productLinks = links(category).filter((link) => link.href.startsWith("/products/"));
  assert.deepEqual(
    productLinks.map((link) => link.href),
    [`/products/${OFFER_PRODUCT_SLUG}`, `/products/${PLAIN_PRODUCT_SLUG}`]
  );
  assert.match(productLinks[0].text, new RegExp(`${SYNTHETIC_MARKER} Offer Tool`));
  for (const link of productLinks) {
    assert.equal(routeFile(link.href), "app/products/[slug]/page.tsx");
  }

  const product = page(renderProductPage(catalog, productLinks[0].href.split("/").pop()));
  assert.match(product, new RegExp(`<h1[^>]*>${SYNTHETIC_MARKER} Offer Tool</h1>`));
  assert.match(product, new RegExp(`By ${SYNTHETIC_MARKER} Reviewer`));
  assert.match(product, /Evaluated 2026-01-10 · Published 2026-01-12 · Last reviewed 2026-01-15/);
  const records = syntheticCatalog();
  const { summary, intendedUser, intendedWorkflow } = records.products[0];
  const { methodology, suitableFor, notSuitableFor, conclusion, strengths, limitations } =
    records.reviews[0];
  for (const text of [
    summary,
    intendedUser,
    intendedWorkflow,
    methodology,
    suitableFor,
    notSuitableFor,
    conclusion,
    ...strengths,
    ...limitations,
  ]) {
    assert.ok(product.includes(text), `product page is missing: ${text}`);
  }
  const back = links(product).find((link) => link.href === `/categories/${CATEGORY_SLUG}`);
  assert.ok(back, "product page links back to its category");
  for (const link of [...links(home), ...links(category), ...links(product)]) {
    if (link.href.startsWith("/") && !link.href.startsWith("/#")) {
      assert.ok(routeFile(link.href), `internal link has no route: ${link.href}`);
    }
  }
});

test("static routes and metadata are derived from published records only", () => {
  const records = syntheticCatalog();
  const catalog = createCatalogAccess(records);
  assert.deepEqual(categoryStaticParams(catalog), [{ slug: CATEGORY_SLUG }]);
  assert.deepEqual(productStaticParams(catalog), [
    { slug: OFFER_PRODUCT_SLUG },
    { slug: PLAIN_PRODUCT_SLUG },
  ]);
  assert.deepEqual(categoryMetadata(catalog, CATEGORY_SLUG), {
    title: `${SYNTHETIC_MARKER} Category`,
    description: `${SYNTHETIC_MARKER} category description.`,
  });
  assert.equal(
    productMetadata(catalog, OFFER_PRODUCT_SLUG).title,
    `${SYNTHETIC_MARKER} Offer Tool review`
  );
  assert.deepEqual(productMetadata(catalog, "missing").robots, { index: false });
  assert.deepEqual(categoryMetadata(catalog, "missing").robots, { index: false });

  const empty = createCatalogAccess({
    categories: [],
    products: [],
    reviews: [],
    merchants: [],
    offers: [],
  });
  assert.deepEqual(categoryStaticParams(empty), []);
  assert.deepEqual(productStaticParams(empty), []);
});

test("merchant CTA renders the exact approved destination with the required link policy", () => {
  const catalog = createCatalogAccess(syntheticCatalog());
  const product = page(renderProductPage(catalog, OFFER_PRODUCT_SLUG));
  const sponsored = links(product).filter((link) => link.rel?.includes("sponsored"));
  assert.equal(sponsored.length, 1);
  const [cta] = sponsored;
  assert.equal(cta.href, DESTINATION_URL);
  assert.equal(cta.target, "_blank");
  assert.equal(cta.rel, "sponsored noopener noreferrer");
  assert.equal(cta.text, `Visit ${SYNTHETIC_MARKER} Merchant One`);
  assert.match(product, /<aside[^>]*aria-label="Merchant offer"/);
});

test("disclosure renders inside the offer, before the CTA", () => {
  const catalog = createCatalogAccess(syntheticCatalog());
  const product = page(renderProductPage(catalog, OFFER_PRODUCT_SLUG));
  const offer = /<aside[^>]*aria-label="Merchant offer"[^>]*>([\s\S]*?)<\/aside>/.exec(product)[1];
  const disclosure = offer.indexOf(`${SYNTHETIC_MARKER} disclosure: we may earn a commission.`);
  assert.ok(disclosure >= 0, "disclosure text is rendered in the offer");
  assert.ok(disclosure < offer.indexOf("<a "), "disclosure precedes the CTA");
});

test("review source links are labelled, external and unsponsored", () => {
  const catalog = createCatalogAccess(syntheticCatalog());
  const product = page(renderProductPage(catalog, OFFER_PRODUCT_SLUG));
  const sources = links(product).filter((link) => SOURCE_URLS.includes(link.href));
  assert.deepEqual(
    sources.map(({ href, target, rel, text }) => ({ href, target, rel, text })),
    SOURCE_URLS.map((href, index) => ({
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      text: `Source ${index + 1}: ${new URL(href).hostname} (opens in a new tab)`,
    }))
  );
});

test("a valid product without an offer renders with no merchant CTA", () => {
  const catalog = createCatalogAccess(syntheticCatalog());
  const product = page(renderProductPage(catalog, PLAIN_PRODUCT_SLUG));
  assert.match(product, new RegExp(`<h1[^>]*>${SYNTHETIC_MARKER} Plain Tool</h1>`));
  assert.ok(!product.includes("Merchant offer"));
  assert.ok(!product.includes("sponsored"));
  assert.ok(!product.includes("merchant-one.example"));
  assert.equal(links(product).filter((link) => SOURCE_URLS.includes(link.href)).length, 2);

  const inactive = syntheticCatalog();
  inactive.offers[0].state = "inactive";
  const withInactiveOffer = page(
    renderProductPage(createCatalogAccess(inactive), OFFER_PRODUCT_SLUG)
  );
  assert.ok(!withInactiveOffer.includes("sponsored"));
  assert.ok(!withInactiveOffer.includes("merchant-one.example"));
});

test("unknown and unpublished content renders nothing", () => {
  const records = syntheticCatalog();
  records.products[1].state = "draft";
  records.reviews[1].state = "draft";
  const catalog = createCatalogAccess(records);
  assert.equal(renderCategoryPage(catalog, "missing"), null);
  assert.equal(renderProductPage(catalog, "missing"), null);
  assert.equal(renderProductPage(catalog, PLAIN_PRODUCT_SLUG), null);
  const category = page(renderCategoryPage(catalog, CATEGORY_SLUG));
  assert.ok(!category.includes(PLAIN_PRODUCT_SLUG));
});

for (const [label, mutate, expected] of [
  [
    "an offer for an unknown product",
    (records) => (records.offers[0].productId = "missing"),
    "unknown product for offer",
  ],
  [
    "an offer for an unknown merchant",
    (records) => (records.offers[0].merchantId = "missing"),
    "unknown merchant for offer",
  ],
  [
    "an offer for an unknown destination",
    (records) => (records.offers[0].approvedDestinationId = "missing"),
    "unknown approved destination for offer",
  ],
  [
    "a product in an unknown category",
    (records) => (records.products[0].categoryId = "missing"),
    "unknown category for product",
  ],
  [
    "a review for an unknown product",
    (records) => (records.reviews[1].productId = "missing"),
    "unknown product for review",
  ],
  [
    "an offer that uses another merchant's destination",
    (records) => (records.offers[0].approvedDestinationId = "synthetic-destination-two"),
    "unknown approved destination for offer",
  ],
  [
    "a destination on another merchant's host",
    (records) =>
      (records.merchants[0].approvedDestinations[0].url = "https://merchant-two.example/other"),
    "invalid approved destination",
  ],
  [
    "a destination without an authorization reference",
    (records) => (records.merchants[0].approvedDestinations[0].authorizationReference = " "),
    "invalid approved destination",
  ],
  [
    "a non-HTTPS destination",
    (records) =>
      (records.merchants[0].approvedDestinations[0].url = "http://merchant-one.example/offer"),
    "invalid approved destination",
  ],
  [
    "two active offers for one product",
    (records) => records.offers.push({ ...records.offers[0], id: "synthetic-offer-duplicate" }),
    "multiple active offers for product",
  ],
]) {
  test(`${label} fails validation and cannot be rendered`, () => {
    const records = syntheticCatalog();
    mutate(records);
    assert.ok(
      validateCatalog(records).some((error) => error.includes(expected)),
      `expected a "${expected}" error`
    );
    assert.throws(() => createCatalogAccess(records), /Invalid catalog/);
  });
}

test("every synthetic record carries the fixture marker", () => {
  const records = syntheticCatalog();
  for (const [collection, items] of Object.entries(records)) {
    for (const item of items) {
      assert.ok(
        JSON.stringify(item).includes(SYNTHETIC_MARKER),
        `unmarked synthetic record in ${collection}`
      );
    }
  }
  const catalog = createCatalogAccess(records);
  assert.ok(page(renderHomePage(catalog)).includes(SYNTHETIC_MARKER));
});
