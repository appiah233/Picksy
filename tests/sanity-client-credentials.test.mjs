import assert from "node:assert/strict";
import test from "node:test";
import {
  publicSanityClient,
  createPublicSanityClient,
  DEFAULT_PUBLIC_SANITY_CONFIG,
} from "../src/lib/sanity-client.ts";
import { SanityCatalogAdapter } from "../src/lib/sanity-catalog-adapter.ts";

test("DEFAULT_PUBLIC_SANITY_CONFIG strictly sets token to undefined", () => {
  assert.equal(DEFAULT_PUBLIC_SANITY_CONFIG.token, undefined);
  assert.equal(typeof DEFAULT_PUBLIC_SANITY_CONFIG.revalidate, "number");
  assert.ok(DEFAULT_PUBLIC_SANITY_CONFIG.revalidate > 0);
});

test("publicSanityClient instance has no write token attached", () => {
  assert.equal(publicSanityClient.config.token, undefined);
});

test("createPublicSanityClient strips any attempted token", () => {
  const client = createPublicSanityClient({ token: "malicious-write-token" });
  assert.equal(client.config.token, undefined);
});

test("publicSanityClient.query sends no Authorization header in HTTP request", async () => {
  let capturedHeaders;
  let capturedOptions;

  const mockClient = createPublicSanityClient({
    fetchFn: async (_url, options) => {
      capturedHeaders = options?.headers;
      capturedOptions = options;
      return {
        ok: true,
        json: async () => ({ result: [] }),
      };
    },
  });

  await mockClient.query("*[_type == 'product']");

  assert.ok(capturedHeaders, "expected headers to be captured");
  assert.equal(capturedHeaders.Authorization, undefined, "public query must NOT send Authorization header");
  assert.equal(capturedHeaders.Accept, "application/json");
  assert.deepEqual(capturedOptions.next, { revalidate: 60, tags: ["catalog"] }, "expected Next.js ISR options");
});

test("publicSanityClient rejects mutations with explicit error and zero network traffic", async () => {
  let networkCalled = false;
  const mockClient = createPublicSanityClient({
    fetchFn: async () => {
      networkCalled = true;
      return { ok: true, json: async () => ({ results: [] }) };
    },
  });

  await assert.rejects(
    () => mockClient.mutate([{ delete: { id: "test-id" } }]),
    /Public read client cannot perform mutations/
  );
  assert.equal(networkCalled, false, "mutations must be blocked before any network call");
});

test("SanityCatalogAdapter defaults to publicSanityClient with no write token", async () => {
  const adapter = new SanityCatalogAdapter(
    createPublicSanityClient({
      fetchFn: async () => {
        return {
          ok: true,
          json: async () => ({
            result: {
              categories: [],
              products: [],
              reviews: [],
              merchants: [],
              offers: [],
            },
          }),
        };
      },
    })
  );

  const result = await adapter.loadPublishedCatalog();
  assert.equal(result.valid, true);
});

test("Storefront query succeeds when SANITY_API_WRITE_TOKEN is completely absent", async () => {
  const originalToken = process.env.SANITY_API_WRITE_TOKEN;
  delete process.env.SANITY_API_WRITE_TOKEN;

  try {
    const unauthenticatedClient = createPublicSanityClient({
      fetchFn: async (_url, options) => {
        const headers = options?.headers;
        assert.equal(headers?.Authorization, undefined);
        return {
          ok: true,
          json: async () => ({
            result: {
              categories: [],
              products: [],
              reviews: [],
              merchants: [],
              offers: [],
            },
          }),
        };
      },
    });

    const adapter = new SanityCatalogAdapter(unauthenticatedClient);
    const { valid } = await adapter.loadPublishedCatalog();
    assert.equal(valid, true);
  } finally {
    if (originalToken !== undefined) {
      process.env.SANITY_API_WRITE_TOKEN = originalToken;
    }
  }
});
