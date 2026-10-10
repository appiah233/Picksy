import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAdminSession } from "../src/lib/admin-auth/session-authorization.ts";

const ids = new Set(["123"]);

test("admin guard separates missing session from forbidden identity", () => {
  assert.equal(authorizeAdminSession(null, ids).code, "UNAUTHORIZED");
  assert.equal(authorizeAdminSession({ user: { id: "456", email: "viewer@example.com" } }, ids).code, "FORBIDDEN");
  assert.equal(authorizeAdminSession({ user: { id: "123", email: null } }, ids).code, "FORBIDDEN");
});

test("admin guard returns canonical principal for current authorized session", () => {
  assert.deepEqual(
    authorizeAdminSession({ user: { id: "123", email: "editor@example.com", name: "Editor" } }, ids),
    {
      authorized: true,
      principal: { id: "gitlab:123", email: "editor@example.com", name: "Editor", roles: ["ADMIN"] },
    }
  );
});
