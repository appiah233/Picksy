export type AdminAuthorization =
  | { authorized: true; userId: string }
  | { authorized: false; code: "UNAUTHORIZED" | "FORBIDDEN" };

const gitLabId = /^[1-9][0-9]*$/;

export function parseAdminGitLabIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set();
  const ids = raw.split(",").map((value) => value.trim());
  if (ids.some((id) => !gitLabId.test(id))) return new Set();
  return new Set(ids);
}

export function authorizeAdminIdentity(
  identity: { provider: string; providerAccountId: string } | null,
  configuredIds: ReadonlySet<string>
): AdminAuthorization {
  if (!identity) return { authorized: false, code: "UNAUTHORIZED" };
  if (
    identity.provider !== "gitlab" ||
    !gitLabId.test(identity.providerAccountId) ||
    !configuredIds.has(identity.providerAccountId)
  ) return { authorized: false, code: "FORBIDDEN" };
  return { authorized: true, userId: identity.providerAccountId };
}
