import { toPicksyPrincipal, type PicksyPrincipal } from "./principal.ts";

export type AdminGuardResult =
  | { authorized: true; principal: PicksyPrincipal }
  | { authorized: false; code: "UNAUTHORIZED" | "FORBIDDEN"; message: string };

export function authorizeAdminSession(
  session: { user?: { id?: string; email?: string | null; name?: string | null } } | null,
  configuredIds: ReadonlySet<string>
): AdminGuardResult {
  if (!session?.user) {
    return { authorized: false, code: "UNAUTHORIZED", message: "Authentication required." };
  }
  const principal = toPicksyPrincipal(
    {
      provider: "gitlab",
      providerAccountId: session.user.id ?? "",
      email: session.user.email,
      name: session.user.name,
    },
    configuredIds
  );
  if (!principal) {
    return { authorized: false, code: "FORBIDDEN", message: "Catalog administrator access required." };
  }
  return { authorized: true, principal };
}
