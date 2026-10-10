import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { SYNTHETIC_MARKER } from "./fixtures/synthetic-catalog.ts";

// Checks the production build output. Run it through `npm run test:build`, which builds the
// current source first, so the output checked here is never left over from an earlier state.
const buildRoot = path.resolve(import.meta.dirname, "../.next");
const manifest = (name) => JSON.parse(readFileSync(path.join(buildRoot, name), "utf8"));

function outputFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    // `.next/cache` is compiler working state, not output that is served or deployed.
    if (entry.isDirectory()) return full === path.join(buildRoot, "cache") ? [] : outputFiles(full);
    return [full];
  });
}

test("a production build exists", () => {
  assert.ok(
    existsSync(path.join(buildRoot, "BUILD_ID")),
    "no production build found; run `npm run test:build`"
  );
});

test("production build output contains no synthetic fixture content", () => {
  const files = outputFiles(buildRoot);
  assert.ok(files.length > 20, "expected to scan a complete build output");
  for (const file of files) {
    assert.ok(
      !readFileSync(file, "latin1").includes(SYNTHETIC_MARKER),
      `${path.relative(buildRoot, file)} contains the fixture marker`
    );
  }
});

test("the build contains only the home, category and product routes in the public catalog", () => {
  const publicRoutes = Object.keys(manifest("server/app-paths-manifest.json"))
    .filter((route) => !route.startsWith("/admin/") && !route.startsWith("/api/") && !route.startsWith("/studio/"))
    .sort();
  assert.deepEqual(publicRoutes, [
    "/_not-found/page",
    "/categories/[slug]/page",
    "/page",
    "/products/[slug]/page",
  ]);
  // The legacy Pages Router must hold nothing beyond the framework's own error pages.
  const frameworkPages = ["/404", "/500", "/_app", "/_document", "/_error"];
  const legacyPages = Object.keys(manifest("server/pages-manifest.json"));
  assert.deepEqual(
    legacyPages.filter((page) => !frameworkPages.includes(page)),
    []
  );
  const routes = manifest("routes-manifest.json");
  assert.deepEqual(routes.rewrites, { beforeFiles: [], afterFiles: [], fallback: [] });
  const middleware = manifest("server/middleware-manifest.json").middleware;
  assert.deepEqual(Object.keys(middleware), ["/"]);
  assert.deepEqual(middleware["/"].matchers.map(({ originalSource }) => originalSource), [
    "/admin/:path*",
  ]);
});

test("the build publishes no category or product page", () => {
  // Only the home page and the not-found page are prerendered, and both catalogue routes are
  // statically generated from their parameters. A route switched to on-demand rendering would
  // drop out of `dynamicRoutes`, where it could serve pages this check cannot see.
  const prerender = manifest("prerender-manifest.json");
  assert.deepEqual(
    Object.keys(prerender.routes).filter((route) => !route.startsWith("/admin/")).sort(),
    ["/", "/_not-found"]
  );
  const publicDynamicRoutes = Object.keys(prerender.dynamicRoutes)
    .filter((route) => !route.startsWith("/studio/"))
    .sort();
  assert.deepEqual(publicDynamicRoutes, [
    "/categories/[slug]",
    "/products/[slug]",
  ]);

  const appOutput = path.join(buildRoot, "server", "app");
  const prerendered = outputFiles(appOutput)
    .map((file) => path.relative(appOutput, file).replaceAll("\\", "/"))
    .filter((file) => /^(?:categories|products)\/.+\.(?:html|rsc)$/.test(file));
  assert.deepEqual(prerendered, []);

  const home = path.join(appOutput, "index.html");
  assert.ok(existsSync(home), "the home page must be prerendered");
  assert.ok(!/href="\/(?:categories|products)\//.test(readFileSync(home, "utf8")));
});
