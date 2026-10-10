import assert from "node:assert/strict";
import test from "node:test";
import { SanityClient } from "../src/lib/sanity-client.ts";
import { SanityDraftStore } from "../src/lib/sanity-draft-store.ts";
import { SanityCatalogAdapter } from "../src/lib/sanity-catalog-adapter.ts";
import { normalizeCandidate } from "../src/lib/importer/normalizer.ts";

test("SanityClient constructs query URL, params, and Authorization headers", async () => {
  let capturedUrl = "";
  let capturedHeaders = {};

  const mockFetch = async (url, options) => {
    capturedUrl = String(url);
    capturedHeaders = options.headers || {};
    return {
      ok: true,
      json: async () => ({ result: [{ _id: "doc-1" }], ms: 5 }),
    };
  };

  const client = new SanityClient({
    projectId: "testproj",
    dataset: "testdataset",
    token: "secret-test-token",
    fetchFn: mockFetch,
  });

  const res = await client.query("*[_type == $type]", { type: "product" });
  assert.equal(res.length, 1);
  assert.equal(res[0]._id, "doc-1");
  assert.ok(capturedUrl.includes("perspective=published"));
  assert.ok(capturedUrl.includes("https://testproj.api.sanity.io/v2024-01-01/data/query/testdataset"));
  assert.equal(capturedHeaders.Authorization, "Bearer secret-test-token");
});

test("SanityClient handles mutation dispatch and error responses", async () => {
  let capturedBody = "";

  const mockFetch = async (_url, options) => {
    capturedBody = options.body;
    return {
      ok: true,
      json: async () => ({ results: [{ id: "doc-123", operation: "create" }] }),
    };
  };

  const client = new SanityClient({
    projectId: "testproj",
    dataset: "testdataset",
    token: "write-token",
    fetchFn: mockFetch,
  });

  const res = await client.mutate([{ create: { _id: "doc-123", title: "New Item" } }]);
  assert.equal(res.results[0].id, "doc-123");
  assert.ok(capturedBody.includes('"create":{"_id":"doc-123"'));
});

test("SanityDraftStore writes importDraft documents and enforces optimistic version locking", async () => {
  const storeMap = new Map();
  let lastPatch;

  const mockFetch = async (url, options) => {
    const urlStr = String(url);
    if (options.method === "POST" && urlStr.includes("/data/mutate/")) {
      const { mutations } = JSON.parse(options.body);
      const results = [];
      for (const m of mutations) {
        if (m.create) {
          const id = m.create._id || `generated-${storeMap.size + 1}`;
          storeMap.set(id, {
            ...m.create,
            _id: id,
            _rev: `rev-${id}-1`,
            _createdAt: new Date().toISOString(),
          });
          results.push({ id, operation: "create" });
        }
        if (m.patch) {
          lastPatch = m.patch;
          results.push({ id: m.patch.id, operation: "update" });
          const doc = storeMap.get(m.patch.id);
          if (doc) {
            Object.assign(doc, m.patch.set);
            doc.version = (m.patch.set.version || doc.version);
            doc._rev = `${doc._rev}-next`;
          }
        }
      }
      return { ok: true, json: async () => ({ results }) };
    }

    if (urlStr.includes("/data/query/")) {
      const docs = Array.from(storeMap.values());
      const queryParam = new URL(urlStr).searchParams.get("query") || "";

      if (queryParam.includes("_id == $id")) {
        const idParam = JSON.parse(new URL(urlStr).searchParams.get("$id") || '""');
        return { ok: true, json: async () => ({ result: storeMap.get(idParam) || null }) };
      }

      if (queryParam.includes("sourceId == $sourceId")) {
        const sourceParam = JSON.parse(new URL(urlStr).searchParams.get("$sourceId") || '""');
        const match = docs.find((d) => d.sourceId === sourceParam);
        return { ok: true, json: async () => ({ result: match || null }) };
      }

      return { ok: true, json: async () => ({ result: docs }) };
    }

    return { ok: false, status: 500, text: async () => "Unknown endpoint" };
  };

  const client = new SanityClient({
    projectId: "0tozsrrx",
    dataset: "production",
    token: "write-token",
    fetchFn: mockFetch,
  });

  const store = new SanityDraftStore(client);

  const candidate = normalizeCandidate({
    sourceId: "impact",
    sourceUrl: "https://impact.com/item/123",
    name: "Sanity Managed Tool",
    description: "Cloud content platform integration candidate.",
    destinationUrl: "https://tool.example",
  });

  // 1. Create draft
  const { draft, isExisting } = await store.createDraft(candidate);
  assert.equal(isExisting, false);
  assert.equal(draft.version, 1);
  assert.equal(draft.state, "draft");

  // 2. Fetch draft by ID
  const retrieved = await store.getDraft(draft.id);
  assert.ok(retrieved);
  assert.equal(retrieved.id, draft.id);
  assert.equal(retrieved.candidate.name, "Sanity Managed Tool");

  // 3. Update draft with version 1 -> advances to version 2
  const updateRes = await store.updateDraft(draft.id, { name: "Edited Tool" }, 1);
  assert.equal(updateRes.ok, true);
  assert.equal(updateRes.draft.version, 2);
  assert.equal(updateRes.draft.edits.name, "Edited Tool");
  assert.equal(lastPatch.ifRevisionID, "rev-generated-1-1");

  // 4. Stale update with version 1 -> fails with CONFLICT (409)
  const staleRes = await store.updateDraft(draft.id, { name: "Conflicting Edit" }, 1);
  assert.equal(staleRes.ok, false);
  assert.equal(staleRes.code, "CONFLICT");
});

test("SanityCatalogAdapter fails closed when published Sanity documents violate catalog validation", async () => {
  // Invalid data: missing review sources, future evaluation date
  const invalidSanityPayload = {
    categories: [
      {
        _id: "seo-tools",
        slug: { current: "seo-tools" },
        name: "SEO Tools",
        description: "Rank tracking and keywords",
        audience: "Marketers",
      },
    ],
    products: [
      {
        _id: "prod-invalid",
        slug: { current: "prod-invalid" },
        category: { _ref: "seo-tools" },
        name: "Broken Product",
        officialSource: "https://broken.example",
        summary: "Product with invalid review dates",
        intendedUser: "Marketers",
        intendedWorkflow: "SEO Analysis",
      },
    ],
    reviews: [
      {
        product: { _ref: "prod-invalid" },
        author: "Editor",
        evaluatedOn: "2099-01-01", // Future date
        publishedOn: "2099-01-02",
        reviewedOn: "2099-01-03",
        methodology: "Testing",
        sources: [], // Empty sources
        strengths: ["Fast"],
        limitations: ["None"],
        suitableFor: "All",
        notSuitableFor: "None",
        conclusion: "Great",
      },
    ],
    merchants: [],
    offers: [],
  };

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ result: invalidSanityPayload }),
  });

  const client = new SanityClient({
    projectId: "0tozsrrx",
    dataset: "production",
    fetchFn: mockFetch,
  });

  const adapter = new SanityCatalogAdapter(client);
  const result = await adapter.loadPublishedCatalog("2026-10-10");

  // MUST FAIL CLOSED
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.deepEqual(result.records.products, []);
  assert.deepEqual(result.records.categories, []);
});

test("SanityCatalogAdapter emits complete CatalogRecords when Sanity records satisfy Gate 3 validation", async () => {
  const validSanityPayload = {
    categories: [
      {
        _id: "seo-tools",
        slug: { current: "seo-tools" },
        name: "SEO Tools",
        description: "Rank tracking and keyword intelligence.",
        audience: "Marketers and agencies.",
      },
    ],
    products: [
      {
        _id: "se-ranking",
        slug: { current: "se-ranking" },
        category: { _ref: "seo-tools" },
        name: "SE Ranking",
        officialSource: "https://seranking.example",
        summary: "All-in-one SEO platform with rank tracking.",
        intendedUser: "SEO agencies and in-house teams",
        intendedWorkflow: "Technical site auditing and keyword tracking",
      },
    ],
    reviews: [
      {
        product: { _ref: "se-ranking" },
        author: "Editorial Team",
        evaluatedOn: "2026-10-01",
        publishedOn: "2026-10-05",
        reviewedOn: "2026-10-08",
        methodology: "Hands-on keyword rank tracking analysis over 30 days.",
        sources: ["https://seranking.example/documentation"],
        strengths: ["Accurate rank tracking", "Intuitive reporting"],
        limitations: ["Advanced API requires higher plan"],
        suitableFor: "Growing digital marketing agencies",
        notSuitableFor: "Personal blogs with zero commercial intent",
        conclusion: "A robust and comprehensive SEO platform.",
      },
    ],
    merchants: [
      {
        _id: "merchant-se-ranking",
        name: "SE Ranking",
        approvedHosts: ["seranking.example"],
        approvedDestinations: [
          {
            destinationId: "dest-seranking-trial",
            url: "https://seranking.example/free-trial",
            authorizationReference: "AUTH-SERANKING-2026-001",
          },
        ],
      },
    ],
    offers: [
      {
        _id: "offer-se-ranking",
        product: { _ref: "se-ranking" },
        merchant: { _ref: "merchant-se-ranking" },
        approvedDestinationId: "dest-seranking-trial",
        label: "Try SE Ranking 14-day free trial",
        disclosure: "Picksy may earn a referral commission at no additional cost to you.",
        state: "active",
      },
    ],
  };

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ result: validSanityPayload }),
  });

  const client = new SanityClient({
    projectId: "0tozsrrx",
    dataset: "production",
    fetchFn: mockFetch,
  });

  const adapter = new SanityCatalogAdapter(client);
  const result = await adapter.loadPublishedCatalog("2026-10-10");

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.records.categories.length, 1);
  assert.equal(result.records.products.length, 1);
  assert.equal(result.records.products[0].slug, "se-ranking");
  assert.equal(result.records.offers.length, 1);
  assert.equal(result.records.offers[0].label, "Try SE Ranking 14-day free trial");
});
