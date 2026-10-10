import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { validateSourceUrl } from "./source-url.ts";

type Address = { address: string; family: number };
type Resolver = (hostname: string) => Promise<Address[]>;

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");

export type ResolvedSourceUrlResult =
  | { ok: true; url: string; hostname: string; addresses: string[] }
  | { ok: false; code: "INVALID_URL" | "SOURCE_NOT_AUTHORIZED" | "SOURCE_UNAVAILABLE" };

export async function validateResolvedSourceUrl(
  input: string,
  approvedHosts: readonly string[],
  resolve: Resolver = async (hostname) => lookup(hostname, { all: true, verbatim: true })
): Promise<ResolvedSourceUrlResult> {
  const syntax = validateSourceUrl(input, approvedHosts);
  if (!syntax.ok) return syntax;
  const hostname = new URL(syntax.url).hostname;
  let records: Address[];
  try {
    records = await resolve(hostname);
  } catch {
    return { ok: false, code: "SOURCE_UNAVAILABLE" };
  }
  if (
    records.length === 0 ||
    records.length > 16 ||
    records.some(({ address, family }) =>
      family !== 4 || isIP(address) !== 4 || blocked.check(address, "ipv4")
    )
  ) return { ok: false, code: "INVALID_URL" };
  return { ok: true, url: syntax.url, hostname, addresses: records.map(({ address }) => address) };
}
