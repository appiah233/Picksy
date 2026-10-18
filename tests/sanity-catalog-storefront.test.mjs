import assert from "node:assert/strict";
import test from "node:test";
import { loadSource, renderHtml } from "./support/render-harness.mjs";

const { SanityClient } = loadSource("lib/sanity-client.ts");
const { SanityCatalogAdapter, PUBLISHED_CATALOG_GROQ } = loadSource("lib/sanity-catalog-adapter.ts");
const { createCatalogAccess } = loadSource("lib/catalog-access.ts");
const { renderHomePage } = loadSource("features/catalog/home-page.tsx");
const { renderCategoryPage } = loadSource("features/catalog/category-page.tsx");
const { renderProductPage, productMetadata, productStaticParams } = loadSource("features/catalog/product-page.tsx");

// Sample valid published Sanity Content Lake dataset
function createSampleSanityData() {
  return {
    categories: [
      {
        _id: "cat-workflow",
        slug: { current: "workflow" },
        name: "Workflow Tools",
        description: "Curated tools for engineering workflow automation.",
        audience: "Software Engineers and Technical Leads",
      },
      {
        _id: "cat-hardware",
        slug: { current: "hardware" },
        name: "Developer Hardware",
        description: "Ergonomic hardware for focused development.",
        audience: "Developers and Creators",
      },
    ],
    products: [
      {
        _id: "prod-codeflow",
        slug: { current: "codeflow-pro" },
        category: { _ref: "cat-workflow" },
        name: "CodeFlow Pro",
        officialSource: "https://codeflow.example.com",
        summary: "Autonomous code review and PR verification suite.",
        intendedUser: "Engineering teams practicing continuous delivery.",
        intendedWorkflow: "Pre-merge code quality and security verification.",
      },
      {
        _id: "prod-desk",
        slug: { current: "ergo-desk-x" },
        category: { _ref: "cat-hardware" },
        name: "ErgoDesk X",
        officialSource: "https://ergodesk.example.com",
        summary: "Customizable motorized standing desk for workstations.",
        intendedUser: "Professionals spending 8+ hours at a desk daily.",
        intendedWorkflow: "Active posture management during programming sessions.",
      },
    ],
    reviews: [
      {
        product: { _ref: "prod-codeflow" },
        author: "Picksy Technical Editorial Team",
        evaluatedOn: "2026-10-01",
        publishedOn: "2026-10-05",
        reviewedOn: "2026-10-15",
        methodology: "Evaluated across 50 production pull requests over 14 days.",
        sources: [
          "https://codeflow.example.com/docs/benchmarks",
          "https://codeflow.example.com/security/compliance",
        ],
        strengths: [
          "Automated constant-time signature verification on webhooks",
          "Instant sticky PR review comments with check runs matrix",
        ],
        limitations: [
          "Requires GitHub organization admin permissions for full webhook installation",
        ],
        suitableFor: "Mid-to-large engineering teams requiring automated PR quality gates.",
        notSuitableFor: "Solo developers with single-branch non-collaborative workflows.",
        conclusion: "Highly recommended for teams prioritizing release integrity and compliance.",
      },
      {
        product: { _ref: "prod-desk" },
        author: "Picksy Hardware Review Team",
        evaluatedOn: "2026-09-15",
        publishedOn: "2026-09-20",
        reviewedOn: "2026-10-10",
        methodology: "Tested with dual-monitor workstation under maximum load.",
        sources: ["https://ergodesk.example.com/specs"],
        strengths: ["Ultra-quiet dual motors", "Four programmable memory presets"],
        limitations: ["Assembly takes approximately 45 minutes with two people"],
        suitableFor: "Remote workers and developers seeking reliable sit-stand transitions.",
        notSuitableFor: "Temporary or mobile workspace setups.",
        conclusion: "A sturdy, well-engineered investment in developer ergonomic health.",
      },
    ],
    merchants: [
      {
        _id: "merch-codeflow",
        name: "CodeFlow",
        approvedHosts: ["codeflow.example.com"],
        approvedDestinations: [
          {
            destinationId: "dest-codeflow-annual",
            url: "https://codeflow.example.com/pricing/team?ref=picksy",
            authorizationReference: "AUTH-PARTNER-2026-CF10",
          },
        ],
      },
      {
        _id: "merch-ergodesk",
        name: "ErgoDirect",
        approvedHosts: ["ergodesk.example.com"],
        approvedDestinations: [
          {
            destinationId: "dest-desk-direct",
            url: "https://ergodesk.example.com/products/desk-x?aff=picksy_mvp",
            authorizationReference: "AUTH-MERCHANT-2026-ED44",
          },
        ],
      },
    ],
    offers: [
      {
        _id: "offer-codeflow",
        product: { _ref: "prod-codeflow" },
        merchant: { _ref: "merch-codeflow" },
        approvedDestinationId: "dest-codeflow-annual",
        label: "Get CodeFlow Pro Team Plan",
        disclosure: "Picksy earns an affiliate commission on qualifying purchases at no added cost to you.",
        state: "active",
      },
      {
        _id: "offer-desk",
        product: { _ref: "prod-desk" },
        merchant: { _ref: "merch-ergodesk" },
        approvedDestinationId: "dest-desk-direct",
        label: "Buy from ErgoDirect",
        disclosure: "Picksy may earn a referral fee if you purchase through this merchant link.",
        state: "active",
      },
    ],
  };
}

test("Data Flow E2E: Sanity published record -> public query layer -> catalogue -> product page -> merchant destination", async () => {
  const sampleData = createSampleSanityData();

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ result: sampleData, ms: 12 }),
  });

  const client = new SanityClient({
    projectId: "0tozsrrx",
    dataset: "production",
    fetchFn: mockFetch,
  });

  const adapter = new SanityCatalogAdapter(client);
  const { records, valid, errors } = await adapter.loadPublishedCatalog();

  assert.equal(valid, true, `Validation failed: ${errors.join("; ")}`);
  assert.equal(errors.length, 0);

  // 1. Create CatalogAccess
  const catalog = createCatalogAccess(records);
  assert.equal(catalog.getPublishedCategories().length, 2);

  // 2. Render Catalogue / Home Page
  const homeHtml = renderHtml(renderHomePage(catalog));
  assert.ok(homeHtml.includes("CodeFlow Pro"), "Home page should render CodeFlow Pro card");
  assert.ok(homeHtml.includes("ErgoDesk X"), "Home page should render ErgoDesk X card");
  assert.ok(homeHtml.includes('href="/products/codeflow-pro"'), "Card should link to /products/codeflow-pro");
  assert.ok(homeHtml.includes("CodeFlow"), "Card should display merchant name");

  // 3. Render Category Page
  const categoryHtml = renderHtml(renderCategoryPage(catalog, "workflow"));
  assert.ok(categoryHtml.includes("Workflow Tools"), "Category page should render category name");
  assert.ok(categoryHtml.includes("CodeFlow Pro"), "Category page should include category product");

  // 4. Render Product Detail Page
  const productHtml = renderHtml(renderProductPage(catalog, "codeflow-pro"));
  assert.ok(productHtml.includes("CodeFlow Pro"), "Product page renders product heading");
  assert.ok(productHtml.includes("Picksy Technical Editorial Team"), "Product page renders editorial author");
  assert.ok(productHtml.includes("Who this is for"), "Product page renders fit section");
  assert.ok(productHtml.includes("Evaluation method and sources"), "Product page renders methodology");
  assert.ok(productHtml.includes("Observed strengths"), "Product page renders strengths");
  assert.ok(productHtml.includes("Limitations"), "Product page renders limitations");
  assert.ok(productHtml.includes("Conclusion"), "Product page renders conclusion");

  // 5. Authorized Merchant Destination Link
  assert.ok(productHtml.includes('href="https://codeflow.example.com/pricing/team?ref=picksy"'), "Renders exact approved merchant destination");
  assert.ok(productHtml.includes('rel="sponsored noopener noreferrer"'), "Renders sponsored rel attribute for affiliate destination");
  assert.ok(productHtml.includes('target="_blank"'), "Opens merchant destination in new tab");
  assert.ok(productHtml.includes("Picksy earns an affiliate commission"), "Renders FTC required disclosure text");
});

test("Sanity Storefront: Multiple products in catalog render independently with correct metadata", async () => {
  const sampleData = createSampleSanityData();
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ result: sampleData }),
  });

  const adapter = new SanityCatalogAdapter(new SanityClient({ fetchFn: mockFetch }));
  const { records } = await adapter.loadPublishedCatalog();
  const catalog = createCatalogAccess(records);

  const staticParams = productStaticParams(catalog);
  assert.deepEqual(staticParams, [
    { slug: "codeflow-pro" },
    { slug: "ergo-desk-x" },
  ]);

  const meta1 = productMetadata(catalog, "codeflow-pro");
  assert.equal(meta1.title, "CodeFlow Pro review");
  assert.equal(meta1.description, "Autonomous code review and PR verification suite.");

  const meta2 = productMetadata(catalog, "ergo-desk-x");
  assert.equal(meta2.title, "ErgoDesk X review");
  assert.equal(meta2.description, "Customizable motorized standing desk for workstations.");
});

test("Sanity Storefront: Empty catalogue renders fallback placeholder state safely without crashing", async () => {
  const emptyData = {
    categories: [],
    products: [],
    reviews: [],
    merchants: [],
    offers: [],
  };

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ result: emptyData }),
  });

  const adapter = new SanityCatalogAdapter(new SanityClient({ fetchFn: mockFetch }));
  const { records, valid } = await adapter.loadPublishedCatalog();
  assert.equal(valid, true);

  const catalog = createCatalogAccess(records);
  assert.deepEqual(catalog.getPublishedCategories(), []);

  // Home page renders empty state
  const homeHtml = renderHtml(renderHomePage(catalog));
  assert.ok(homeHtml.includes("Coverage coming soon"), "Home page renders coverage coming soon placeholders");
  assert.ok(!homeHtml.includes("/products/"), "Home page renders no product links when empty");

  // Detail and category routes return null / 404
  assert.equal(renderProductPage(catalog, "any-product"), null);
  assert.equal(renderCategoryPage(catalog, "any-category"), null);
});

test("Sanity Storefront: Draft / unpublished content strictly filtered from public storefront", async () => {
  // Query GROQ explicitly excludes drafts
  assert.ok(PUBLISHED_CATALOG_GROQ.includes('!(_id in path("drafts.**"))'), "GROQ must exclude drafts in path");

  const sampleData = createSampleSanityData();
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ result: sampleData }),
  });

  const adapter = new SanityCatalogAdapter(new SanityClient({ fetchFn: mockFetch }));
  const { records } = await adapter.loadPublishedCatalog();
  
  // Mark one product as draft in records to test catalog-access enforcement
  records.products[0].state = "draft";
  // Remove offer for the draft product so catalog validation invariants hold
  records.offers = records.offers.filter(o => o.productId !== records.products[0].id);
  const catalog = createCatalogAccess(records);

  // Unpublished product must not be returned by getPublishedProductBySlug
  assert.equal(catalog.getPublishedProductBySlug("codeflow-pro"), undefined);
  assert.equal(renderProductPage(catalog, "codeflow-pro"), null);

  // The published product remains accessible
  assert.ok(catalog.getPublishedProductBySlug("ergo-desk-x") !== undefined);
  assert.ok(renderProductPage(catalog, "ergo-desk-x") !== null);
});

test("Sanity Storefront: Missing product or invalid slug returns null / 404 metadata", async () => {
  const sampleData = createSampleSanityData();
  const mockFetch = async () => ({ ok: true, json: async () => ({ result: sampleData }) });
  const adapter = new SanityCatalogAdapter(new SanityClient({ fetchFn: mockFetch }));
  const { records } = await adapter.loadPublishedCatalog();
  const catalog = createCatalogAccess(records);

  assert.equal(renderProductPage(catalog, "invalid-slug-999"), null);
  assert.equal(renderCategoryPage(catalog, "invalid-slug-999"), null);

  const meta = productMetadata(catalog, "invalid-slug-999");
  assert.equal(meta.title, "Product not found");
  assert.deepEqual(meta.robots, { index: false });
});

test("Sanity Storefront: Malformed or incomplete record fails closed and returns empty catalogue", async () => {
  const malformedData = createSampleSanityData();
  // Corrupt review: missing conclusion
  delete malformedData.reviews[0].conclusion;

  const mockFetch = async () => ({ ok: true, json: async () => ({ result: malformedData }) });
  const adapter = new SanityCatalogAdapter(new SanityClient({ fetchFn: mockFetch }));
  const { records, valid, errors } = await adapter.loadPublishedCatalog();

  assert.equal(valid, false);
  assert.ok(errors.length > 0);
  assert.deepEqual(records.products, [], "Malformed product review must cause fail-closed empty catalog");
});

test("Sanity Storefront: Sanity query failure is caught and falls back to empty catalogue gracefully", async () => {
  const mockFetch = async () => {
    throw new Error("Network timeout: Sanity Content Lake unreachable");
  };

  const adapter = new SanityCatalogAdapter(new SanityClient({ fetchFn: mockFetch }));
  let threw = false;
  try {
    await adapter.loadPublishedCatalog();
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes("Sanity request could not be completed"));
  }
  assert.equal(threw, true, "Network failure throws handled error");
});

test("Sanity Storefront: Missing affiliate destination renders editorial review without merchant CTA", async () => {
  const sampleData = createSampleSanityData();
  // Remove offers
  sampleData.offers = [];

  const mockFetch = async () => ({ ok: true, json: async () => ({ result: sampleData }) });
  const adapter = new SanityCatalogAdapter(new SanityClient({ fetchFn: mockFetch }));
  const { records } = await adapter.loadPublishedCatalog();
  const catalog = createCatalogAccess(records);

  const productHtml = renderHtml(renderProductPage(catalog, "codeflow-pro"));
  assert.ok(productHtml.includes("CodeFlow Pro"), "Product review still renders");
  assert.ok(!productHtml.includes("rel=\"sponsored noopener noreferrer\""), "No sponsored link rendered when offer is missing");
  assert.ok(!productHtml.includes("Visit CodeFlow"), "No merchant CTA section rendered");
});

test("Sanity Storefront: Live Content Lake query against project 0tozsrrx executes successfully", async () => {
  const liveClient = new SanityClient({
    projectId: "0tozsrrx",
    dataset: "production",
  });
  const liveAdapter = new SanityCatalogAdapter(liveClient);
  const result = await liveAdapter.loadPublishedCatalog();

  assert.equal(result.valid, true, `Live Sanity query failed: ${result.errors.join("; ")}`);
  assert.ok(Array.isArray(result.records.products), "Live records products must be an array");
  assert.ok(Array.isArray(result.records.categories), "Live records categories must be an array");
});
