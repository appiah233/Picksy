import assert from "node:assert/strict";
import test from "node:test";
import { validateSourceUrl } from "../src/lib/importer/source-url.ts";

const hosts = ["merchant.example"];

test("accepts an exact approved HTTPS host and retains path and query", () => {
  assert.deepEqual(validateSourceUrl("https://merchant.example/item?ref=abc", hosts), {
    ok: true,
    url: "https://merchant.example/item?ref=abc",
  });
});

test("rejects unapproved hosts and suffix tricks", () => {
  for (const url of ["https://other.example/item", "https://merchant.example.evil.test/item"])
    assert.deepEqual(validateSourceUrl(url, hosts), {
      ok: false,
      code: "SOURCE_NOT_AUTHORIZED",
    });
});

test("rejects unsafe URL syntax before network access", () => {
  for (const url of [
    "http://merchant.example/item",
    "https://user@merchant.example/item",
    "https://merchant.example:8443/item",
    "https://merchant.example/item#fragment",
    "https://127.0.0.1/item",
    "https://merchant.example\\@evil.example/item",
    "https://merchant.example/item\n",
    " https://merchant.example/item",
    "not a URL",
  ]) {
    assert.equal(validateSourceUrl(url, hosts).ok, false, url);
  }
});
