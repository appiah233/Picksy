import assert from "node:assert/strict";
import test from "node:test";
import { SanityCatalogAdapter } from "../src/lib/sanity-catalog-adapter.ts";

const empty = () => ({ categories: [], products: [], reviews: [], merchants: [], offers: [] });
const category = () => ({ _id: "category", slug: { current: "category" }, name: "Category", description: "Description", audience: "Audience" });
const review = () => ({ product: { _ref: "product" }, author: "Editor", evaluatedOn: "2026-01-01", publishedOn: "2026-01-02", reviewedOn: "2026-01-03", methodology: "Evaluation", suitableFor: "Teams", notSuitableFor: "Individuals", conclusion: "Useful", sources: ["https://example.com"], strengths: ["Fast"], limitations: ["Cost"] });
const load = (payload) => new SanityCatalogAdapter({ query: async () => payload }).loadPublishedCatalog();

test("catalogue rejects malformed runtime structures without partial output", async () => {
  const cases = [null, undefined, [], {}, ...["categories", "products", "reviews", "merchants", "offers"].flatMap((key) =>
    [null, {}, "invalid", [null], [42]].map((value) => ({ ...empty(), [key]: value }))),
    { ...empty(), categories: [{ ...category(), name: 4 }] },
    { ...empty(), categories: [{ ...category(), slug: { current: 2 } }] },
    { ...empty(), merchants: [{ _id: "merchant", name: "Merchant", approvedHosts: [4], approvedDestinations: [] }] },
    { ...empty(), merchants: [{ _id: "merchant", name: "Merchant", approvedHosts: ["example.com"], approvedDestinations: [null] }] },
    ...["sources", "strengths", "limitations"].flatMap((field) => [null, "invalid", [4]].map((value) => ({ ...empty(), reviews: [{ ...review(), [field]: value }] }))),
    { ...empty(), reviews: [{ ...review(), product: { _ref: 1 } }] },
    { ...empty(), merchants: [{ _id: "merchant", name: "Merchant", approvedHosts: ["example.com"], approvedDestinations: [{ destinationId: "destination", url: "https://example.com", authorizationReference: 1 }] }] },
  ];
  for (const payload of cases) {
    const result = await load(payload);
    assert.equal(result.valid, false);
    assert.deepEqual(result.records, empty());
    assert.ok(result.errors.length > 0);
  }
});

test("catalogue rejects missing or invalid offer state before activating an offer", async () => {
  for (const state of [undefined, null, "", "published", 1]) {
    const result = await load({ ...empty(), offers: [{ _id: "offer", product: { _ref: "product" }, merchant: { _ref: "merchant" }, approvedDestinationId: "destination", label: "Merchant offer", disclosure: "Disclosure", state }] });
    assert.equal(result.valid, false);
    assert.deepEqual(result.records, empty());
    assert.match(result.errors.join(" "), /structure/i);
  }
});

test("catalogue explicitly requests published perspective and still applies domain validation", async () => {
  let args;
  const adapter = new SanityCatalogAdapter({ query: async (...received) => { args = received; return { ...empty(), categories: [{ ...category(), name: "" }] }; } });
  const result = await adapter.loadPublishedCatalog();
  assert.equal(args[2], "published");
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /incomplete published category/);
  assert.deepEqual(result.records, empty());
  assert.equal((await load(empty())).valid, true);
});

test("catalogue propagates transport failures", async () => {
  const failure = new Error("transport unavailable");
  const adapter = new SanityCatalogAdapter({ query: async () => { throw failure; } });
  await assert.rejects(adapter.loadPublishedCatalog(), (error) => error === failure);
});
