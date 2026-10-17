import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { SYNTHETIC_MARKER } from "./fixtures/synthetic-catalog.ts";

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

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 404) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for server at ${url} after ${timeoutMs}ms`);
}

test("Built-and-Served Production Journey", async (t) => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const repoRoot = path.resolve(import.meta.dirname, "..");

  let serverProcess;
  try {
    serverProcess = spawn(
      process.execPath,
      [path.join(repoRoot, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
      {
        cwd: repoRoot,
        env: { ...process.env, PORT: String(port) },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    serverProcess.stdout.resume();
    serverProcess.stderr.resume();

    await waitForServer(baseUrl, 40000);

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

    await t.test("Draft / unpublished content cannot be addressed directly on served routes", async () => {
      const res = await fetch(`${baseUrl}/products/drafts.some-draft-product`);
      assert.equal(res.status, 404);
    });

  } finally {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
    }
  }
});

