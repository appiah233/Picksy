import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isApprovedDestination,
  isRenderSafeOffer,
  validateCatalog,
  validateCategoryTaxonomy,
} from "../src/lib/catalog-validation.ts";
import { createCatalogAccess } from "../src/lib/catalog-access.ts";

const fixture = () => ({
  categories: [
    {
      id: "c1",
      slug: "workflow",
      name: "Workflow",
      description: "Scope",
      audience: "Operators",
      state: "published",
    },
  ],
  products: [
    {
      id: "p1",
      slug: "tool",
      categoryId: "c1",
      name: "Tool",
      officialSource: "https://example.com",
      summary: "Summary",
      intendedUser: "Operators",
      intendedWorkflow: "Planning",
      state: "published",
    },
  ],
  reviews: [
    {
      productId: "p1",
      author: "Editor",
      evaluatedOn: "2026-10-01",
      publishedOn: "2026-10-02",
      reviewedOn: "2026-10-02",
      methodology: "Document review",
      sources: ["https://example.com"],
      strengths: ["Feature"],
      limitations: ["Limit"],
      suitableFor: "Operators",
      notSuitableFor: "Others",
      conclusion: "Qualified",
      state: "published",
    },
  ],
  merchants: [
    {
      id: "m1",
      name: "Example",
      approvedHosts: ["example.com"],
      approvedDestinations: [
        {
          id: "d1",
          url: "https://example.com/offer?ref=picksy",
          authorizationReference: "Agreement reference",
        },
      ],
    },
  ],
  offers: [
    {
      id: "o1",
      productId: "p1",
      merchantId: "m1",
      approvedDestinationId: "d1",
      label: "Visit Example",
      disclosure: "We may earn a commission.",
      state: "active",
    },
  ],
});

test("optional editorial product imagery requires a Sanity CDN URL and meaningful alt text", () => {
  const records = fixture();
  records.products[0].editorialImage = {
    url: "https://cdn.sanity.io/images/project/dataset/photo-1200x900.jpg",
    alt: "Unbranded headphones photographed on a pale surface",
  };
  assert.deepEqual(validateCatalog(records), []);
  records.products[0].editorialImage.url = "https://evil.example/product.jpg";
  assert.ok(validateCatalog(records).some((error) => error.includes("invalid editorial image")));
  records.products[0].editorialImage.url =
    "https://cdn.sanity.io/images/project/dataset/photo-1200x900.jpg";
  records.products[0].editorialImage.alt = "x";
  assert.ok(validateCatalog(records).some((error) => error.includes("invalid editorial image")));
});

test("a complete catalog passes validation", () =>
  assert.deepEqual(validateCatalog(fixture()), []));

for (const [label, mutate, expected] of [
  [
    "duplicate category ID",
    (r) => r.categories.push({ ...r.categories[0], slug: "other" }),
    "duplicate category id",
  ],
  [
    "duplicate category slug",
    (r) => r.categories.push({ ...r.categories[0], id: "c2" }),
    "duplicate category slug",
  ],
  [
    "duplicate product ID",
    (r) => r.products.push({ ...r.products[0], slug: "other" }),
    "duplicate product id",
  ],
  [
    "duplicate product slug",
    (r) => r.products.push({ ...r.products[0], id: "p2" }),
    "duplicate product slug",
  ],
  ["unknown category", (r) => (r.products[0].categoryId = "missing"), "unknown category"],
  [
    "unknown review product",
    (r) => (r.reviews[0].productId = "missing"),
    "unknown product for review",
  ],
  [
    "unknown offer product",
    (r) => (r.offers[0].productId = "missing"),
    "unknown product for offer",
  ],
  ["unknown merchant", (r) => (r.offers[0].merchantId = "missing"), "unknown merchant for offer"],
  ["incomplete review", (r) => (r.reviews[0].limitations = []), "incomplete review"],
  ["unpublished review", (r) => (r.reviews[0].state = "draft"), "incomplete review for product"],
  ["invalid publication state", (r) => (r.categories[0].state = "other"), "invalid category state"],
  ["invalid offer state", (r) => (r.offers[0].state = "other"), "invalid offer state"],
  ["invalid calendar date", (r) => (r.reviews[0].evaluatedOn = "2026-02-30"), "incomplete review"],
  [
    "HTTP review source",
    (r) => (r.reviews[0].sources = ["http://example.com"]),
    "incomplete review",
  ],
  [
    "HTTP official source",
    (r) => (r.products[0].officialSource = "http://example.com"),
    "incomplete published product",
  ],
  [
    "invalid approved host",
    (r) => (r.merchants[0].approvedHosts = ["-example.com"]),
    "invalid merchant",
  ],
]) {
  test(`rejects ${label}`, () => {
    const records = fixture();
    mutate(records);
    assert.ok(validateCatalog(records).some((error) => error.includes(expected)));
  });
}

test("valid approved HTTPS destination and merchant label are accepted", () => {
  const records = fixture();
  assert.equal(
    isApprovedDestination(records.merchants[0].approvedDestinations[0].url, records.merchants[0]),
    true
  );
  assert.equal(isRenderSafeOffer(records.offers[0], records.merchants[0]), true);
});

test("only the full approved path and query are accepted", () => {
  const records = fixture();
  const merchant = records.merchants[0];
  assert.equal(isApprovedDestination("https://example.com/offer?ref=other", merchant), false);
  assert.equal(isApprovedDestination("https://example.com/other?ref=picksy", merchant), false);
  assert.equal(
    isApprovedDestination("https://example.com/redirect?url=https://attacker.invalid", merchant),
    false
  );
  assert.equal(isApprovedDestination(merchant.approvedDestinations[0].url, merchant), true);
});

test("offer cannot select an unapproved destination ID", () => {
  const records = fixture();
  records.offers[0].approvedDestinationId = "missing";
  assert.equal(isRenderSafeOffer(records.offers[0], records.merchants[0]), false);
  assert.ok(
    validateCatalog(records).some((error) => error.includes("unknown approved destination"))
  );
});

test("approved destination requires an authorization reference", () => {
  const records = fixture();
  records.merchants[0].approvedDestinations[0].authorizationReference = "";
  assert.equal(isRenderSafeOffer(records.offers[0], records.merchants[0]), false);
  assert.ok(
    validateCatalog(records).some((error) => error.includes("invalid approved destination"))
  );
});

test("approved destination IDs must be unique", () => {
  const records = fixture();
  records.merchants[0].approvedDestinations.push({
    ...records.merchants[0].approvedDestinations[0],
    url: "https://example.com/another-offer",
  });
  assert.ok(
    validateCatalog(records).some((error) => error.includes("duplicate approved destination id"))
  );
});

test("duplicate approved URLs cannot borrow another record's authorization", () => {
  const records = fixture();
  records.merchants[0].approvedDestinations.push({
    id: "d2",
    url: records.merchants[0].approvedDestinations[0].url,
    authorizationReference: "",
  });
  records.offers[0].approvedDestinationId = "d2";
  assert.equal(isRenderSafeOffer(records.offers[0], records.merchants[0]), false);
  const errors = validateCatalog(records);
  assert.ok(errors.some((error) => error.includes("duplicate approved destination URL")));
  assert.ok(errors.some((error) => error.includes("invalid approved destination")));
});

test("two active offers for one product are rejected", () => {
  const records = fixture();
  records.offers.push({ ...records.offers[0], id: "o2" });
  assert.ok(validateCatalog(records).some((error) => error.includes("multiple active offers")));
  assert.throws(() => createCatalogAccess(records), /Invalid catalog/);
});

for (const destination of [
  "http://example.com/offer",
  "%%%",
  "https://user:secret@example.com/offer",
  "https://other.example/offer",
  "https://example.com.evil.test/offer",
  "https://example.com:8443/offer",
  "https://example.com:443/offer",
  "https://example.com/offer#section",
  "https://example.com/offer#",
  "https://example.com/offer ",
  "https://example.com/of fer",
  "https:example.com/offer",
  "https:/example.com/offer",
  "https://EXAMPLE.com/offer",
  "https://@example.com/offer",
  "https://example.com/a/../offer",
]) {
  test(`rejects unsafe destination ${destination}`, () => {
    const records = fixture();
    records.merchants[0].approvedDestinations[0].url = destination;
    assert.equal(isRenderSafeOffer(records.offers[0], records.merchants[0]), false);
    assert.ok(validateCatalog(records).some((error) => error.includes("invalid active offer")));
  });
}

test("an unsafe destination is rejected at accessor construction", () => {
  const records = fixture();
  records.merchants[0].approvedDestinations[0].url = "https:example.com/offer";
  assert.throws(() => createCatalogAccess(records), /Invalid catalog/);
});

for (const source of ["https:example.com/docs", "https:/example.com/docs"]) {
  test(`rejects review source ${source} that a browser would resolve on Picksy`, () => {
    const records = fixture();
    records.reviews[0].sources = [source];
    assert.ok(validateCatalog(records).some((error) => error.includes("incomplete review")));
  });
}

test("an active offer on an unpublished product is rejected", () => {
  const records = fixture();
  records.products[0].state = "draft";
  assert.ok(
    validateCatalog(records).some((error) => error.includes("unpublished product for offer"))
  );
  assert.throws(() => createCatalogAccess(records), /Invalid catalog/);
});

test("inactive offer and incorrect merchant label cannot render", () => {
  const records = fixture();
  records.offers[0].state = "inactive";
  assert.equal(isRenderSafeOffer(records.offers[0], records.merchants[0]), false);
  records.offers[0].state = "active";
  records.offers[0].label = "Visit Other";
  assert.equal(isRenderSafeOffer(records.offers[0], records.merchants[0]), false);
});

test("accessor resolves published content, review, and active offer", () => {
  const access = createCatalogAccess(fixture());
  assert.equal(access.getPublishedCategories().length, 1);
  assert.equal(access.getPublishedCategoryBySlug("workflow")?.id, "c1");
  assert.equal(access.getPublishedProductsForCategory("c1").length, 1);
  assert.equal(access.getPublishedProductBySlug("tool")?.id, "p1");
  assert.equal(access.getPublishedReviewForProduct("p1")?.author, "Editor");
  assert.equal(access.getActiveOfferForProduct("p1")?.merchant.name, "Example");
  assert.equal(
    access.getActiveOfferForProduct("p1")?.destination.url,
    "https://example.com/offer?ref=picksy"
  );
});

test("accessor hides unknown and unpublished content", () => {
  const records = fixture();
  records.categories.push({
    id: "c2",
    slug: "empty",
    name: "Empty",
    description: "Scope",
    audience: "Operators",
    state: "published",
  });
  records.products.push({
    ...records.products[0],
    id: "p2",
    slug: "draft",
    categoryId: "c2",
    state: "draft",
  });
  const access = createCatalogAccess(records);
  assert.equal(access.getPublishedCategoryBySlug("missing"), undefined);
  assert.equal(access.getPublishedCategoryBySlug("empty")?.id, "c2");
  assert.deepEqual(access.getPublishedProductsForCategory("c2"), []);
  assert.equal(access.getPublishedProductBySlug("draft"), undefined);
  assert.equal(access.getPublishedProductBySlug("missing"), undefined);
  assert.equal(access.getPublishedReviewForProduct("p2"), undefined);
  assert.equal(access.getActiveOfferForProduct("p2"), undefined);
});

test("accessor hides inactive offers", () => {
  const records = fixture();
  records.offers[0].state = "inactive";
  assert.equal(createCatalogAccess(records).getActiveOfferForProduct("p1"), undefined);
});

test("accessor rejects invalid records at construction", () => {
  const records = fixture();
  records.merchants[0].approvedDestinations[0].url = "http://example.com";
  assert.throws(() => createCatalogAccess(records), /Invalid catalog/);
});

test("published category must match site taxonomy ID and slug", () => {
  const records = fixture();
  assert.deepEqual(validateCategoryTaxonomy(records, [{ id: "c1", slug: "workflow" }]), []);
  assert.match(
    validateCategoryTaxonomy(records, [{ id: "c1", slug: "other" }])[0],
    /absent from site taxonomy/
  );
  assert.match(
    validateCategoryTaxonomy(records, [{ id: "other", slug: "workflow" }])[0],
    /absent from site taxonomy/
  );
});

test("review chronology and future dates are rejected with deterministic clock", () => {
  const records = fixture();
  assert.deepEqual(validateCatalog(records, "2026-10-08"), []);
  records.reviews[0].publishedOn = "2026-09-30";
  assert.ok(
    validateCatalog(records, "2026-10-08").some((error) => error.includes("incomplete review"))
  );
  records.reviews[0].publishedOn = "2026-10-02";
  records.reviews[0].reviewedOn = "2026-10-09";
  assert.ok(
    validateCatalog(records, "2026-10-08").some((error) => error.includes("incomplete review"))
  );
});
