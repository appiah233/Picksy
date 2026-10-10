import assert from "node:assert/strict";
import test from "node:test";
import { validateAdminMutation } from "../src/lib/admin-auth/mutation.ts";

const target = "https://picksy.example/api/admin/imports/preview";
const request = (origin, contentType = "application/json") =>
  new Request(target, {
    method: "POST",
    headers: { ...(origin ? { origin } : {}), "content-type": contentType },
    body: "{}",
  });

test("admin mutation accepts an explicit same-origin JSON request", () => {
  assert.equal(validateAdminMutation(request("https://picksy.example")), true);
});

test("admin mutation rejects missing, foreign and lookalike origins", () => {
  for (const origin of [undefined, "https://evil.example", "https://picksy.example.evil.test", "http://picksy.example"])
    assert.equal(validateAdminMutation(request(origin)), false, String(origin));
});

test("admin mutation rejects browser simple content types", () => {
  assert.equal(validateAdminMutation(request("https://picksy.example", "text/plain")), false);
  assert.equal(validateAdminMutation(request("https://picksy.example", "application/x-www-form-urlencoded")), false);
});
