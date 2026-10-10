import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeAdminIdentity,
  parseAdminGitLabIds,
} from "../src/lib/admin-auth/authorization.ts";

test("missing or malformed allowlist fails closed", () => {
  for (const raw of [undefined, "", "123,", "123,all", "-1", "0", "1e3"])
    assert.equal(parseAdminGitLabIds(raw).size, 0, String(raw));
});

test("authorizes only an exact GitLab account ID", () => {
  const ids = parseAdminGitLabIds("123, 456");
  assert.deepEqual(authorizeAdminIdentity(null, ids), { authorized: false, code: "UNAUTHORIZED" });
  for (const identity of [
    { provider: "github", providerAccountId: "123" },
    { provider: "gitlab", providerAccountId: "12" },
    { provider: "gitlab", providerAccountId: "1234" },
    { provider: "gitlab", providerAccountId: "0123" },
  ]) assert.deepEqual(authorizeAdminIdentity(identity, ids), { authorized: false, code: "FORBIDDEN" });
  assert.deepEqual(authorizeAdminIdentity({ provider: "gitlab", providerAccountId: "123" }, ids), {
    authorized: true,
    userId: "123",
  });
});

test("removing an ID revokes authorization on the next check", () => {
  const identity = { provider: "gitlab", providerAccountId: "123" };
  assert.equal(authorizeAdminIdentity(identity, parseAdminGitLabIds("123")).authorized, true);
  assert.equal(authorizeAdminIdentity(identity, parseAdminGitLabIds("456")).authorized, false);
});
