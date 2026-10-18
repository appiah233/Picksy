import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { SYNTHETIC_MARKER, syntheticCatalog } from "./fixtures/synthetic-catalog.ts";
import {
  loadSource,
  readSource,
  renderHtml,
  sourceFiles,
  sourceRoot,
} from "./support/render-harness.mjs";

// These tests load the real production modules: the route files under `src/app`, the production
// accessor in `src/lib/catalog.ts` and the production catalogue. Nothing here is synthetic
// except where a test deliberately supplies bad input.
const { createCatalogAccess } = loadSource("lib/catalog-access.ts");
const { catalogRecords } = loadSource("content/catalog.ts");
const { catalog } = loadSource("lib/catalog.ts");
const { siteConfig } = loadSource("config/site.ts");
const { renderHomePage } = loadSource("features/catalog/home-page.tsx");
const categoryViews = loadSource("features/catalog/category-page.tsx");
const productViews = loadSource("features/catalog/product-page.tsx");
const homeRoute = loadSource("app/page.tsx");
const categoryRoute = loadSource("app/categories/[slug]/page.tsx");
const productRoute = loadSource("app/products/[slug]/page.tsx");

const PRODUCTION_ACCESSOR = "lib/catalog.ts";
const PRODUCTION_CATALOGUE = "content/catalog.ts";
const ROUTES = ["app/categories/[slug]/page.tsx", "app/page.tsx", "app/products/[slug]/page.tsx"];

const params = (slug) => ({ params: Promise.resolve({ slug }) });
const notFound = (error) => error?.digest === "NEXT_HTTP_ERROR_FALLBACK;404";

// Every module specifier a source file imports, statically or dynamically.
function specifiers(text) {
  const pattern =
    /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm;
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

// The path under `src/` that a specifier refers to, or undefined for a package. A relative path
// that leaves `src/` resolves to a path starting with "..".
function target(file, specifier) {
  if (specifier.startsWith("@/")) return path.posix.normalize(specifier.slice(2));
  if (!specifier.startsWith(".")) return undefined;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
}

const withoutExtension = (file) => file.replace(/\.tsx?$/, "");
const isAdminOrImporter = (file) =>
  file.startsWith("app/admin/") ||
  file.startsWith("app/api/") ||
  file.startsWith("features/admin/") ||
  file.startsWith("lib/importer/");

const importers = (file) =>
  sourceFiles()
    .filter((candidate) => !isAdminOrImporter(candidate))
    .filter((candidate) =>
      specifiers(readSource(candidate)).some(
        (specifier) =>
          withoutExtension(target(candidate, specifier) ?? "") === withoutExtension(file)
      )
    );

test("the production accessor is built from the production catalogue", () => {
  const expected = createCatalogAccess(catalogRecords);
  assert.deepEqual(catalog.getPublishedCategories(), expected.getPublishedCategories());
  assert.deepEqual(
    productViews.productStaticParams(catalog),
    productViews.productStaticParams(expected)
  );
  assert.equal(renderHtml(renderHomePage(catalog)), renderHtml(renderHomePage(expected)));
});

test("production publishes nothing while Gate 3 is unauthorized", () => {
  for (const [collection, items] of Object.entries(catalogRecords)) {
    assert.deepEqual(items, [], `production ${collection} must be empty`);
  }
  assert.deepEqual(catalog.getPublishedCategories(), []);
  assert.deepEqual(categoryViews.categoryStaticParams(catalog), []);
  assert.deepEqual(productViews.productStaticParams(catalog), []);
});

test("there is exactly one catalogue source and one production accessor", () => {
  assert.deepEqual(importers(PRODUCTION_CATALOGUE), [PRODUCTION_ACCESSOR]);
  const creators = sourceFiles().filter((file) =>
    /\bcreateCatalogAccess\s*\(/.test(readSource(file).replace(/export function \w+\(/g, ""))
  );
  assert.deepEqual(creators, [PRODUCTION_ACCESSOR]);
  assert.deepEqual(importers(PRODUCTION_ACCESSOR).sort(), ROUTES);
});

test("the only public catalogue routes are home, category and product", () => {
  const routeFiles = sourceFiles().filter(
    (file) =>
      file.startsWith("app/") &&
      !file.startsWith("app/admin/") &&
      !file.startsWith("app/api/") &&
      !file.startsWith("app/studio/") &&
      /(?:^|\/)(?:page|route|default)\.[jt]sx?$/.test(file)
  );
  assert.deepEqual(routeFiles.sort(), ROUTES);
  const interceptors = sourceFiles().filter((file) =>
    /^(?:middleware|instrumentation)\./.test(file)
  );
  assert.deepEqual(interceptors, ["middleware.ts"]);
  const middleware = readSource("middleware.ts");
  assert.match(middleware, /matcher:\s*\["\/admin\/:path\*"\]/);
  assert.doesNotMatch(middleware, /(?:\/categories|\/products|\/api\/admin)/);
});

test("the real route modules render from the production accessor and publish nothing", async () => {
  const home = renderHtml(await homeRoute.default());
  assert.equal(home, renderHtml(renderHomePage(catalog)));
  assert.ok(!/href="\/(?:categories|products)\//.test(home));
  assert.match(home, /THE COLLECTION IS TAKING SHAPE/);
  assert.doesNotMatch(home, /Coverage coming soon|Upcoming/);

  assert.deepEqual(await categoryRoute.generateStaticParams(), []);
  assert.deepEqual(await productRoute.generateStaticParams(), []);
  for (const { slug } of siteConfig.categories) {
    await assert.rejects(categoryRoute.default(params(slug)), notFound, `/categories/${slug}`);
    await assert.rejects(productRoute.default(params(slug)), notFound, `/products/${slug}`);
    assert.deepEqual((await categoryRoute.generateMetadata(params(slug))).robots, { index: false });
    assert.deepEqual((await productRoute.generateMetadata(params(slug))).robots, { index: false });
  }
});

test("route files only delegate: they contain no markup of their own", () => {
  // A route file that wrote its own markup could publish a page the catalogue never validated.
  for (const file of ROUTES) {
    const source = readSource(file);
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    const markup = [];
    const visit = (node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
        markup.push(node.getText().slice(0, 40));
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    assert.deepEqual(markup, [], `${file} contains its own markup`);
    assert.ok(!/createElement|dangerouslySetInnerHTML/.test(source), `${file} builds markup`);
  }
});

test("the real route modules are not rendered on demand", () => {
  for (const route of [homeRoute, categoryRoute, productRoute]) {
    for (const option of ["dynamic", "dynamicParams", "revalidate", "fetchCache", "runtime"]) {
      assert.equal(route[option], undefined, `unexpected route option: ${option}`);
    }
  }
});

test("views refuse an accessor that was not validated", () => {
  const validated = createCatalogAccess(syntheticCatalog());
  const impostors = [
    { ...validated },
    Object.create(validated),
    {
      getPublishedCategories: () => [],
      getPublishedCategoryBySlug: () => undefined,
      getPublishedProductsForCategory: () => [],
      getPublishedProductBySlug: () => undefined,
      getPublishedReviewForProduct: () => undefined,
      getActiveOfferForProduct: () => undefined,
    },
  ];
  const views = [
    (accessor) => renderHomePage(accessor),
    (accessor) => categoryViews.renderCategoryPage(accessor, "any"),
    (accessor) => categoryViews.categoryMetadata(accessor, "any"),
    (accessor) => categoryViews.categoryStaticParams(accessor),
    (accessor) => productViews.renderProductPage(accessor, "any"),
    (accessor) => productViews.productMetadata(accessor, "any"),
    (accessor) => productViews.productStaticParams(accessor),
  ];
  for (const impostor of impostors) {
    for (const view of views) {
      assert.throws(() => view(impostor), /not created by createCatalogAccess/);
    }
  }
  for (const view of views) assert.doesNotThrow(() => view(validated));
});

test("a validated accessor cannot be altered after validation", () => {
  const records = syntheticCatalog();
  const slug = records.products[0].slug;
  const accessor = createCatalogAccess(records);
  assert.ok(Object.isFrozen(accessor));
  assert.throws(() => {
    accessor.getActiveOfferForProduct = () => undefined;
  }, TypeError);

  // Changing the caller's records afterwards must not reach a page.
  const before = renderHtml(productViews.renderProductPage(accessor, slug));
  records.merchants[0].approvedDestinations[0].url = "http://unapproved.invalid/";
  records.offers.push({ ...records.offers[0], id: "added-after-validation" });
  records.products[0].name = "Changed after validation";
  assert.equal(renderHtml(productViews.renderProductPage(accessor, slug)), before);
});

test("records returned by a validated accessor cannot change a rendered destination", () => {
  const records = syntheticCatalog();
  const accessor = createCatalogAccess(records);
  const slug = records.products[0].slug;
  const before = renderHtml(productViews.renderProductPage(accessor, slug));
  const product = accessor.getPublishedProductBySlug(slug);
  const review = accessor.getPublishedReviewForProduct(product.id);
  const resolved = accessor.getActiveOfferForProduct(product.id);
  assert.ok(review);
  assert.ok(resolved);

  assert.throws(() => {
    resolved.destination.url = "https://attacker.example/offer";
  }, TypeError);
  assert.throws(() => {
    resolved.merchant.approvedHosts.push("attacker.example");
  }, TypeError);
  assert.throws(() => {
    resolved.offer.label = "Visit attacker";
  }, TypeError);
  assert.throws(() => {
    review.sources.push("https://attacker.example/source");
  }, TypeError);
  assert.throws(() => {
    product.summary = "Changed after validation";
  }, TypeError);
  assert.equal(renderHtml(productViews.renderProductPage(accessor, slug)), before);
});

test("external links come only from catalogue records", () => {
  // No page may carry a hand-written external or merchant link: the catalogue is the only place
  // an external URL may be written, and the product view is the only place one is rendered.
  // Per ADR-002, admin features and importer subsystems are isolated.
  const PRODUCT_VIEW = "features/catalog/product-page.tsx";
  for (const file of sourceFiles()) {
    if (
      file.startsWith("features/admin/") ||
      file.startsWith("app/admin/") ||
      file.startsWith("app/api/admin/") ||
      file.startsWith("app/studio/") ||
      file.startsWith("lib/importer/") ||
      file.startsWith("lib/sanity-") ||
      file.startsWith("sanity/")
    ) {
      continue;
    }
    const text = readSource(file);
    if (file !== PRODUCTION_CATALOGUE) {
      assert.ok(!/https?:\/\/|["'`]\/\/\w/i.test(text), `${file} contains a hard-coded URL`);
    }
    if (file !== PRODUCT_VIEW) {
      assert.ok(!/sponsored|_blank/i.test(text), `${file} renders an external link`);
    }
  }
  assert.equal(readSource(PRODUCT_VIEW).match(/sponsored/g).length, 1);
});

test("production source imports nothing from outside src and holds no fixture data", () => {
  const files = sourceFiles();
  assert.ok(files.length > 10, "expected to scan the production source tree");
  for (const file of files) {
    const text = readSource(file);
    assert.ok(!text.includes(SYNTHETIC_MARKER), `${file} contains the fixture marker`);
    for (const specifier of specifiers(text)) {
      const resolved = target(file, specifier);
      assert.ok(
        resolved === undefined ||
          !resolved.startsWith("..") ||
          ((file === "app/studio/[[...tool]]/page.tsx" ||
            file === "app/studio/[[...tool]]/Studio.tsx") &&
            specifier === "../../../../sanity.config"),
        `${file} imports from outside src: ${specifier}`
      );
    }
  }
  // An alias could reach outside `src/` without a relative path, so only the `@/` alias may exist.
  const tsconfig = JSON.parse(readFileSync(path.join(sourceRoot, "../tsconfig.json"), "utf8"));
  assert.deepEqual(tsconfig.compilerOptions.paths, { "@/*": ["./src/*"] });
});
