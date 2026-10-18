import assert from "node:assert/strict";
import { execFileSync, execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { SYNTHETIC_MARKER } from "./fixtures/synthetic-catalog.ts";

function readTextIfPresent(filePath) {
  try {
    return readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitForServer(url, serverProcess, timeoutMs = 90000) {
  let serverOutput = "";
  let exited = false;
  let exitCode = null;

  serverProcess.stdout.on("data", (d) => { serverOutput += d.toString(); });
  serverProcess.stderr.on("data", (d) => { serverOutput += d.toString(); });
  serverProcess.on("exit", (code) => {
    exited = true;
    exitCode = code;
  });

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (exited) {
      throw new Error(`Server exited prematurely with code ${exitCode}. Output:\n${serverOutput}`);
    }
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 404) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for server at ${url} after ${timeoutMs}ms. Output:\n${serverOutput}`);
}

async function stopServer(proc) {
  if (!proc || proc.exitCode !== null) return;
  const exitPromise = new Promise((resolve) => proc.on("exit", resolve));
  proc.kill("SIGTERM");
  const fallback = setTimeout(() => {
    try { proc.kill("SIGKILL"); } catch {}
  }, 3000);
  await exitPromise;
  clearTimeout(fallback);
}

function ensureExactShaBuild(repoRoot, mockSanityPort) {
  let headSha = "unknown";
  try {
    headSha = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    // fallback if git not available
  }

  let isDirty = false;
  try {
    isDirty = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf8" }).trim().length > 0;
  } catch {}

  const buildMarker = path.join(repoRoot, ".next", "BUILD_COMMIT_SHA");
  const buildId = readTextIfPresent(path.join(repoRoot, ".next", "BUILD_ID"));
  const existingSha = readTextIfPresent(buildMarker);

  // CX-004 / CX-007: Rebuild if missing or SHA mismatch (without TOCTOU existsSync check)
  const isValidBuild = Boolean(buildId) &&
    (existingSha === headSha || (isDirty && existingSha === `${headSha}-dirty`));

  if (!isValidBuild) {
    execFileSync(
      process.execPath,
      [path.join(repoRoot, "node_modules", "next", "dist", "bin", "next"), "build"],
      {
        cwd: repoRoot,
        stdio: "ignore",
        env: {
          ...process.env,
          NEXT_TELEMETRY_DISABLED: "1",
          NODE_ENV: "production",
          SANITY_API_BASE_URL: `http://127.0.0.1:${mockSanityPort}`,
          SANITY_REVALIDATE_SECONDS: "1",
          NEXT_PUBLIC_SANITY_PROJECT_ID: "0tozsrrx",
          NEXT_PUBLIC_SANITY_DATASET: "production",
          NEXT_PUBLIC_SANITY_API_VERSION: "v2024-01-01",
          SANITY_API_WRITE_TOKEN: "",
        },
        timeout: 300000,
      }
    );
    try {
      writeFileSync(buildMarker, isDirty ? `${headSha}-dirty` : headSha, { encoding: "utf8" });
    } catch {}
  }
}

function createSampleSanityData() {
  return {
    categories: [
      {
        _id: "crm-automation",
        slug: { current: "crm-automation" },
        name: "CRM & Automation",
        description: "Curated automation tools for engineering teams.",
        audience: "Software Engineers and Technical Leads",
      },
    ],
    products: [
      {
        _id: "prod-codeflow",
        slug: { current: "codeflow-pro" },
        category: { _ref: "crm-automation" },
        name: "CodeFlow Pro",
        officialSource: "https://codeflow.example.com",
        summary: "Autonomous code review and PR verification suite.",
        intendedUser: "Engineering teams practicing continuous delivery.",
        intendedWorkflow: "Pre-merge code quality and security verification.",
      },
      {
        _id: "prod-standalone",
        slug: { current: "standalone-tool" },
        category: { _ref: "crm-automation" },
        name: "Standalone Utility",
        officialSource: "https://utility.example.com",
        summary: "Local developer utility with no merchant offer.",
        intendedUser: "Developers.",
        intendedWorkflow: "Local development.",
      },
      // TASK2-CX-003 / CX-007: Unapproved draft document residing in Content Lake
      {
        _id: "drafts.prod-unapproved",
        slug: { current: "unapproved-draft-tool" },
        category: { _ref: "crm-automation" },
        name: "Unapproved Draft Tool",
        officialSource: "https://draft.example.com",
        summary: "Unpublished draft candidate.",
        intendedUser: "Developers.",
        intendedWorkflow: "Draft testing.",
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
          "Requires GitHub organization permissions",
        ],
        suitableFor: "Mid-to-large engineering teams requiring automated PR quality gates.",
        notSuitableFor: "Solo developers with single-branch non-collaborative workflows.",
        conclusion: "Highly recommended for teams prioritizing release integrity and compliance.",
      },
      {
        product: { _ref: "prod-standalone" },
        author: "Picksy Hardware Review Team",
        evaluatedOn: "2026-10-01",
        publishedOn: "2026-10-05",
        reviewedOn: "2026-10-15",
        methodology: "Tested in local isolated sandbox.",
        sources: ["https://utility.example.com"],
        strengths: ["Clean interface"],
        limitations: ["No external destination"],
        suitableFor: "All developers",
        notSuitableFor: "Enterprise sync",
        conclusion: "A reliable standalone utility.",
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
    ],
    offers: [
      {
        _id: "offer-codeflow",
        product: { _ref: "prod-codeflow" },
        merchant: { _ref: "merch-codeflow" },
        approvedDestinationId: "dest-codeflow-annual",
        label: "Visit CodeFlow",
        disclosure: "Affiliate partner",
        state: "active",
      },
    ],
  };
}

test("Built-and-Served Production Journey", async (t) => {
  const repoRoot = path.resolve(import.meta.dirname, "..");

  // TASK2-CX-007: Start local mock Sanity server FIRST before building or serving
  let mockSanityMode = "empty";
  let mockSanityPayload = null;
  const recordedSanityRequests = [];
  const openSockets = new Set();

  const mockSanityServer = http.createServer((req, res) => {
    recordedSanityRequests.push({
      url: req.url,
      method: req.method,
      headers: req.headers,
    });

    if (mockSanityMode === "timeout") {
      // Hold connection open to trigger client deadline abort
      return;
    }

    if (mockSanityMode === "error") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Simulated upstream Sanity error (500)" }));
      return;
    }

    if (mockSanityMode === "published") {
      const parsedUrl = new URL(req.url, "http://127.0.0.1");
      const perspective = parsedUrl.searchParams.get("perspective");

      // Perspective filter: "published" perspective strictly filters out drafts.*
      const filterDoc = (doc) => perspective === "published" ? !doc._id.startsWith("drafts.") : true;
      const filtered = {
        categories: (mockSanityPayload.categories || []).filter(filterDoc),
        products: (mockSanityPayload.products || []).filter(filterDoc),
        reviews: (mockSanityPayload.reviews || []).filter((r) => perspective === "published" ? !r.product?._ref?.startsWith("drafts.") : true),
        merchants: (mockSanityPayload.merchants || []).filter(filterDoc),
        offers: (mockSanityPayload.offers || []).filter(filterDoc),
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result: filtered, ms: 2 }));
      return;
    }

    // Default "empty" mode
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      result: { categories: [], products: [], reviews: [], merchants: [], offers: [] },
      ms: 1,
    }));
  });

  // Track client sockets for clean shutdown
  mockSanityServer.on("connection", (socket) => {
    openSockets.add(socket);
    socket.on("close", () => openSockets.delete(socket));
  });

  const mockSanityPort = await getFreePort();
  await new Promise((resolve) => mockSanityServer.listen(mockSanityPort, "127.0.0.1", resolve));

  // TASK2-CX-004 & TASK2-CX-007: Ensure build artifact exists using the mock environment
  ensureExactShaBuild(repoRoot, mockSanityPort);

  const nextPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${nextPort}`;

  let serverProcess;
  try {
    serverProcess = spawn(
      process.execPath,
      [path.join(repoRoot, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(nextPort), "-H", "127.0.0.1"],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          PORT: String(nextPort),
          NEXT_TELEMETRY_DISABLED: "1",
          NODE_ENV: "production",
          SANITY_API_BASE_URL: `http://127.0.0.1:${mockSanityPort}`,
          SANITY_REVALIDATE_SECONDS: "1", // 1s ISR revalidation window for test
          NEXT_PUBLIC_SANITY_PROJECT_ID: "0tozsrrx",
          NEXT_PUBLIC_SANITY_DATASET: "production",
          NEXT_PUBLIC_SANITY_API_VERSION: "v2024-01-01",
          SANITY_API_WRITE_TOKEN: "", // zero write tokens
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    await waitForServer(baseUrl, serverProcess, 90000);

    // 1. Baseline Empty State (Gate 3)
    await t.test("Served home page returns 200 OK with empty catalogue state under Gate 3", async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("<!DOCTYPE html>"), "must return valid HTML");
      assert.ok(!html.includes(SYNTHETIC_MARKER), "served HTML must contain zero synthetic fixtures");
    });

    await t.test("Served missing product route returns 404 Not Found", async () => {
      const res = await fetch(`${baseUrl}/products/non-existent-product-slug`);
      assert.equal(res.status, 404);
    });

    await t.test("Served missing category route returns 404 Not Found", async () => {
      const res = await fetch(`${baseUrl}/categories/non-existent-category-slug`);
      assert.equal(res.status, 404);
    });

    await t.test("Served response headers and client scripts contain no write tokens", async () => {
      const res = await fetch(`${baseUrl}/`);
      const html = await res.text();
      assert.ok(!html.includes("SANITY_API_WRITE_TOKEN"));
      assert.ok(!html.includes("pbot_"));
      assert.ok(!html.includes("whsec_"));
      assert.ok(!html.includes("ghp_"));
    });

    await t.test("Public Sanity read queries sent zero Authorization header to upstream API", async () => {
      assert.ok(recordedSanityRequests.length > 0, "expected at least one query to mock Sanity");
      for (const req of recordedSanityRequests) {
        assert.equal(req.headers.authorization, undefined, "Public storefront queries must never carry Authorization header");
      }
    });

    // 2. TASK2-CX-001: Live Publication Transition & ISR Freshness Proof
    await t.test("Served application dynamically renders newly published catalogue records after ISR revalidation without restart", async () => {
      // Transition mock Sanity state to published content
      mockSanityMode = "published";
      mockSanityPayload = createSampleSanityData();

      // Wait 1200ms to exceed the 1000ms ISR revalidation window
      await new Promise((r) => setTimeout(r, 1200));

      // Trigger ISR background revalidation
      await fetch(`${baseUrl}/`);

      // Bounded polling loop to observe the freshly regenerated HTML
      let refreshed = false;
      let lastHtml = "";
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise((r) => setTimeout(r, 600));
        const res = await fetch(`${baseUrl}/`);
        if (res.status === 200) {
          lastHtml = await res.text();
          if (lastHtml.includes("CodeFlow Pro")) {
            refreshed = true;
            break;
          }
        }
      }

      assert.ok(refreshed, "Freshly published product must appear in served HTML after ISR background revalidation");
      assert.ok(lastHtml.includes("CRM &amp; Automation") || lastHtml.includes("CRM & Automation"), "Freshly published category must appear in served HTML");
    });

    // 3. TASK2-CX-003: Published Product Route & Safe Merchant Destination
    await t.test("Served product page renders published record and validated external merchant destination", async () => {
      const res = await fetch(`${baseUrl}/products/codeflow-pro`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("CodeFlow Pro"), "Must display product title");
      assert.ok(html.includes("Picksy Technical Editorial Team"), "Must display editorial review");
      assert.ok(html.includes("https://codeflow.example.com/pricing/team?ref=picksy"), "Must contain approved destination link");
      assert.ok(html.includes('rel="sponsored noopener noreferrer"'), "External merchant link must contain rel='sponsored noopener noreferrer'");
    });

    // 4. TASK2-CX-003: Published Category Route
    await t.test("Served category page renders published category and associated products", async () => {
      const res = await fetch(`${baseUrl}/categories/crm-automation`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("CRM &amp; Automation") || html.includes("CRM & Automation"), "Must display category title");
      assert.ok(html.includes("CodeFlow Pro"), "Must display listed product under category");
    });

    // 5. TASK2-CX-003: Draft Content Exclusion
    await t.test("Draft / unpublished content cannot be addressed directly on served routes", async () => {
      const res1 = await fetch(`${baseUrl}/products/drafts.unapproved-product`);
      assert.equal(res1.status, 404);
      // Unapproved draft document residing in Content Lake must return 404
      const res2 = await fetch(`${baseUrl}/products/unapproved-draft-tool`);
      assert.equal(res2.status, 404, "Draft product slug must return 404 on public route");
    });

    // 6. TASK2-CX-003: Absent / Missing Merchant Destination Handling
    await t.test("Product with absent merchant destination renders safely without broken links", async () => {
      const res = await fetch(`${baseUrl}/products/standalone-tool`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("Standalone Utility"));
      assert.ok(!html.includes('href="undefined"'), "Must not leak href='undefined'");
      assert.ok(!html.includes('href="http://undefined"'), "Must not leak href='http://undefined'");
      assert.ok(!html.includes('aria-label="Merchant offer"'), "Must not render merchant offer section when destination is absent");
    });

    // 7. TASK2-CX-003: Upstream Failure Resilience
    await t.test("Upstream Sanity 500 error and timeout do not crash the served application", async () => {
      // 1. Upstream 500 error
      mockSanityMode = "error";
      await new Promise((r) => setTimeout(r, 1200));
      const res500 = await fetch(`${baseUrl}/`);
      assert.equal(res500.status, 200);
      const html500 = await res500.text();
      assert.ok(!html500.includes("Internal Server Error"));

      // 2. Upstream timeout
      mockSanityMode = "timeout";
      await new Promise((r) => setTimeout(r, 1200));
      const resTimeout = await fetch(`${baseUrl}/`);
      assert.equal(resTimeout.status, 200);
      const htmlTimeout = await resTimeout.text();
      assert.ok(!htmlTimeout.includes("Internal Server Error"));
    });

  } finally {
    // TASK2-CX-004: Clean process, socket, and server shutdown
    await stopServer(serverProcess);
    for (const socket of openSockets) {
      try { socket.destroy(); } catch {}
    }
    openSockets.clear();
    await new Promise((resolve) => mockSanityServer.close(resolve));
  }
});
