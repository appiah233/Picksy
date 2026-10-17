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

// TASK2-CX-006: Revalidation interval parsing & bounds test
test("parseRevalidateSeconds safely bounds inputs and rejects invalid/negative/oversized values", async () => {
  const { parseRevalidateSeconds } = await import("../src/lib/sanity-client.ts");

  assert.equal(parseRevalidateSeconds(10), 10);
  assert.equal(parseRevalidateSeconds("30"), 30);
  assert.equal(parseRevalidateSeconds(86400), 86400);

  // Negative, zero, float, NaN, infinity, oversized, malformed strings fall back to 60
  assert.equal(parseRevalidateSeconds(-5), 60);
  assert.equal(parseRevalidateSeconds(0), 60);
  assert.equal(parseRevalidateSeconds(3.14), 60);
  assert.equal(parseRevalidateSeconds("3.14"), 60);
  assert.equal(parseRevalidateSeconds(NaN), 60);
  assert.equal(parseRevalidateSeconds(Infinity), 60);
  assert.equal(parseRevalidateSeconds(-Infinity), 60);
  assert.equal(parseRevalidateSeconds(999999), 60);
  assert.equal(parseRevalidateSeconds(""), 60);
  assert.equal(parseRevalidateSeconds("invalid"), 60);
  assert.equal(parseRevalidateSeconds(null), 60);
  assert.equal(parseRevalidateSeconds(undefined), 60);
});

// TASK2-CX-005: Write-capable client credential isolation & origin pinning
test("SanityClient with write token strictly pins baseUrl to Sanity HTTPS and rejects custom baseUrl", async () => {
  const { SanityClient } = await import("../src/lib/sanity-client.ts");

  // Attempting to configure custom baseUrl with a token must throw immediately
  assert.throws(
    () => new SanityClient({ token: "write-token-secret", baseUrl: "https://custom.api.endpoint" }),
    /Custom baseUrl is strictly forbidden for authenticated or write-capable Sanity clients/
  );

  // Even if SANITY_API_BASE_URL is set in environment, write-capable client ignores it
  const origBase = process.env.SANITY_API_BASE_URL;
  try {
    process.env.SANITY_API_BASE_URL = "http://127.0.0.1:9999";
    const client = new SanityClient({ token: "write-token-secret", projectId: "0tozsrrx" });
    assert.equal(client.baseUrl, "https://0tozsrrx.api.sanity.io/v2024-01-01");
  } finally {
    if (origBase !== undefined) process.env.SANITY_API_BASE_URL = origBase;
    else delete process.env.SANITY_API_BASE_URL;
  }
});

test("Public tokenless SanityClient allows local loopback HTTP and rejects non-loopback HTTP", async () => {
  const { SanityClient } = await import("../src/lib/sanity-client.ts");

  // Allowed on local loopback
  const localClient = new SanityClient({ baseUrl: "http://127.0.0.1:4567" });
  assert.equal(localClient.baseUrl, "http://127.0.0.1:4567");

  // Rejected on non-loopback HTTP
  assert.throws(
    () => new SanityClient({ baseUrl: "http://external-insecure.example.com" }),
    /HTTP Sanity baseUrl is only allowed on local loopback/
  );
});

// TASK2-CX-009: Verify cache: "no-store" is strictly preserved for authenticated reads and writes
test("Authenticated queries and mutations always use cache: 'no-store' and never receive ISR options", async () => {
  const { SanityClient } = await import("../src/lib/sanity-client.ts");

  let capturedQueryOptions;
  let capturedMutationOptions;

  const authClient = new SanityClient({
    token: "valid-write-token-12345",
    revalidate: 30, // Even if revalidate is configured, authenticated operations must not cache
    fetchFn: async (url, options) => {
      if (options.method === "POST") {
        capturedMutationOptions = options;
        return {
          ok: true,
          json: async () => ({ results: [{ id: "doc-1", operation: "create" }] }),
        };
      }
      capturedQueryOptions = options;
      return {
        ok: true,
        json: async () => ({ result: [{ _id: "doc-1" }] }),
      };
    },
  });

  // 1. Authenticated query
  await authClient.query("*[_type == 'importDraft']");
  assert.equal(capturedQueryOptions.cache, "no-store", "Authenticated query must use cache: 'no-store'");
  assert.equal(capturedQueryOptions.next, undefined, "Authenticated query must not have next.revalidate");

  // 2. Authenticated mutation
  await authClient.mutate([{ create: { _id: "doc-1", title: "Test" } }]);
  assert.equal(capturedMutationOptions.cache, "no-store", "Mutation POST must use cache: 'no-store'");
  assert.equal(capturedMutationOptions.next, undefined, "Mutation POST must not have next.revalidate");
});

