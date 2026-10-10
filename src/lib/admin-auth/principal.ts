import { authorizeAdminIdentity } from "./authorization.ts";

export type PicksyRole = "ADMIN";

export interface PicksyPrincipal {
  id: string;
  email: string;
  name?: string | null;
  roles: PicksyRole[];
}

interface ExternalIdentity {
  provider: string;
  providerAccountId: string;
  email: string | null | undefined;
  name?: string | null;
}

const validEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Provider details stay inside this boundary. Importer business logic receives
// only an opaque Picksy ID, contact email, display name and application roles.
export function toPicksyPrincipal(
  identity: ExternalIdentity | null,
  adminIds: ReadonlySet<string>
): PicksyPrincipal | null {
  if (!identity || !identity.email || !validEmail(identity.email)) return null;
  const access = authorizeAdminIdentity(identity, adminIds);
  if (!access.authorized) return null;
  return {
    id: `gitlab:${access.userId}`,
    email: identity.email,
    name: identity.name ?? null,
    roles: ["ADMIN"],
  };
}
