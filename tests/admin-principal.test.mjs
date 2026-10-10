import assert from "node:assert/strict";
import test from "node:test";
import { toPicksyPrincipal } from "../src/lib/admin-auth/principal.ts";

const allowlist = new Set(["123"]);

test("maps an authorized GitLab identity to the canonical principal", () => {
  assert.deepEqual(
    toPicksyPrincipal(
      { provider: "gitlab", providerAccountId: "123", email: "editor@example.com", name: "Editor" },
      allowlist
    ),
    { id: "gitlab:123", email: "editor@example.com", name: "Editor", roles: ["ADMIN"] }
  );
});

test("rejects identities without verified account, email or current admin authorization", () => {
  for (const identity of [
    { provider: "github", providerAccountId: "123", email: "editor@example.com" },
    { provider: "gitlab", providerAccountId: "456", email: "editor@example.com" },
    { provider: "gitlab", providerAccountId: "123", email: "" },
    { provider: "gitlab", providerAccountId: "123", email: "bad address" },
  ]) assert.equal(toPicksyPrincipal(identity, allowlist), null);
  assert.equal(toPicksyPrincipal(null, allowlist), null);
});
