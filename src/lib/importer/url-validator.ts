import dns from "node:dns/promises";
import type { ImporterErrorCode } from "../importer-types.ts";

export type UrlValidationResult =
  | { ok: true; url: string; hostname: string }
  | { ok: false; code: ImporterErrorCode; message: string };

export type DnsLookupFn = (
  hostname: string
) => Promise<Array<{ address: string; family: number }>>;

/**
 * Checks whether an IPv4 address string is in loopback, private RFC1918,
 * link-local, carrier NAT, multicast, or reserved ranges.
 */
export function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Not a valid standard IPv4, reject for safety
  }
  const [b0, b1, b2] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 10.0.0.0/8 (Private RFC1918)
  if (b0 === 10) return true;
  // 172.16.0.0/12 (Private RFC1918: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16 (Private RFC1918)
  if (b0 === 192 && b1 === 168) return true;
  // 169.254.0.0/16 (Link-local RFC3927 / cloud metadata)
  if (b0 === 169 && b1 === 254) return true;
  // 100.64.0.0/10 (Carrier-grade NAT RFC6598: 100.64.0.0 - 100.127.255.255)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;
  // 198.18.0.0/15 (Network benchmark tests: 198.18 - 198.19)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;
  // 224.0.0.0/4 (Multicast: 224 - 239)
  if (b0 >= 224 && b0 <= 239) return true;
  // 240.0.0.0/4 (Reserved / Broadcast: 240 - 255)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address string is in loopback, unspecified,
 * IPv4-mapped, unique local, link-local, site-local, or multicast ranges.
 */
export function isPrivateOrReservedIpv6(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();

  // IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith("::ffff:") || cleanIp.startsWith("0:0:0:0:0:ffff:")) {
    const lastPart = cleanIp.split(":").pop() ?? "";
    if (lastPart.includes(".")) {
      return isPrivateOrReservedIpv4(lastPart);
    }
  }

  // Exact loopback and unspecified shortcuts
  if (cleanIp === "::1" || cleanIp === "0:0:0:0:0:0:0:1") return true;
  if (cleanIp === "::" || cleanIp === "0:0:0:0:0:0:0:0") return true;

  // Expand IPv6 address to 8 16-bit numeric words
  const words = expandIpv6Words(cleanIp);
  if (!words) return true; // Malformed IPv6, reject for safety

  const [w0, w1] = words;

  // Loopback (::1) check on expanded words
  if (
    words[0] === 0 &&
    words[1] === 0 &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0 &&
    words[6] === 0 &&
    words[7] === 1
  ) {
    return true;
  }

  // Unspecified (::)
  if (words.every((w) => w === 0)) return true;

  // fc00::/7 (Unique Local Address RFC4193: fc00.. - fdff..)
  if (w0 >= 0xfc00 && w0 <= 0xfdff) return true;

  // fe80::/10 (Link-Local unicast RFC4291: fe80.. - febf..)
  if (w0 >= 0xfe80 && w0 <= 0xfebf) return true;

  // fec0::/10 (Site-Local unicast, deprecated: fec0.. - feff..)
  if (w0 >= 0xfec0 && w0 <= 0xfeff) return true;

  // ff00::/8 (Multicast)
  if (w0 >= 0xff00) return true;

  // 2001:db8::/32 (Documentation)
  if (w0 === 0x2001 && w1 === 0x0db8) return true;

  // 100::/64 (Discard-only)
  if (w0 === 0x0100) return true;

  // 64:ff9b::/96 (IPv4/IPv6 translation)
  if (w0 === 0x0064 && w1 === 0xff9b) return true;

  return false;
}

function expandIpv6Words(ip: string): number[] | null {
  const sections = ip.split("::");
  if (sections.length > 2) return null;

  const leftParts: string[] = sections[0] ? sections[0].split(":") : [];
  const rightParts: string[] = sections[1] ? sections[1].split(":") : [];

  // Handle embedded IPv4 dotted quad in last part if present
  const lastPart = rightParts.length > 0 ? rightParts[rightParts.length - 1] : leftParts[leftParts.length - 1];
  if (lastPart && lastPart.includes(".")) {
    const ipv4Octets = lastPart.split(".").map(Number);
    if (ipv4Octets.length !== 4 || ipv4Octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
      return null;
    }
    const high = ((ipv4Octets[0] << 8) | ipv4Octets[1]).toString(16);
    const low = ((ipv4Octets[2] << 8) | ipv4Octets[3]).toString(16);
    if (rightParts.length > 0) {
      rightParts.splice(rightParts.length - 1, 1, high, low);
    } else {
      leftParts.splice(leftParts.length - 1, 1, high, low);
    }
  }

  const missingCount = 8 - (leftParts.length + rightParts.length);
  if (sections.length === 2) {
    if (missingCount < 0) return null;
    const zeros = new Array(missingCount).fill("0");
    const all = [...leftParts, ...zeros, ...rightParts];
    return all.map((part) => parseInt(part || "0", 16));
  } else {
    if (leftParts.length !== 8) return null;
    return leftParts.map((part) => parseInt(part, 16));
  }
}

export function isPrivateOrReservedIp(ip: string): boolean {
  if (ip.includes(":")) {
    return isPrivateOrReservedIpv6(ip);
  }
  return isPrivateOrReservedIpv4(ip);
}

const isIpLiteral = (host: string): boolean => {
  // IPv4 dotted-decimal or decimal/hex integer trick
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return true;
  if (/^\d+$/.test(host)) return true; // Decimal IP representation (e.g. 2130706433 = 127.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(host)) return true; // Hex IP representation
  if (host.startsWith("[") || host.endsWith("]")) return true;
  return false;
};

/**
 * Validates syntax, scheme, credentials, ports, and IP literals before any network activity.
 */
export function validateUrlSyntax(input: string): { ok: true; url: URL } | { ok: false; code: ImporterErrorCode; message: string } {
  if (typeof input !== "string" || input.length === 0 || input.length > 2048 || input !== input.trim()) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "The URL must be a non-empty trimmed string of 2048 characters or less.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "The URL could not be parsed as a valid absolute URL.",
    };
  }

  // Enforce HTTPS
  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Only secure HTTPS URLs are permitted.",
    };
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "User credentials are not permitted in URLs.",
    };
  }

  // Reject non-standard ports (allow only default 443 or omitted)
  if (parsed.port && parsed.port !== "443") {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Only standard HTTPS port 443 is permitted.",
    };
  }

  // Reject fragment / hash
  if (parsed.hash) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "URL fragments are not permitted.",
    };
  }

  // Reject IP literals
  if (isIpLiteral(parsed.hostname)) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Direct IP literal hostnames are prohibited for SSRF protection.",
    };
  }

  // Reject invalid host syntax (must be standard lowercase hostname with dot)
  const host = parsed.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".") || host.startsWith(".") || host.endsWith(".")) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Hostname must be a valid fully-qualified domain name.",
    };
  }

  // Check each DNS label length
  const labels = host.split(".");
  if (labels.some((l) => l.length === 0 || l.length > 63 || l.startsWith("-") || l.endsWith("-"))) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Invalid domain label syntax in URL hostname.",
    };
  }

  return { ok: true, url: parsed };
}

const defaultDnsLookup: DnsLookupFn = async (hostname: string) => {
  const results = await dns.lookup(hostname, { all: true });
  return results;
};

/**
 * Validates URL syntax, verifies against source allowlist (if provided),
 * resolves DNS, and checks resolved IP addresses against private / reserved ranges.
 */
export async function validateSourceUrlWithDns(
  input: string,
  options?: {
    approvedHosts?: readonly string[];
    dnsLookup?: DnsLookupFn;
  }
): Promise<UrlValidationResult> {
  const syntaxCheck = validateUrlSyntax(input);
  if (!syntaxCheck.ok) {
    return syntaxCheck;
  }

  const { url } = syntaxCheck;
  const hostname = url.hostname.toLowerCase();

  // If approvedHosts are configured, enforce strict match
  if (options?.approvedHosts && options.approvedHosts.length > 0) {
    const hostSet = new Set(options.approvedHosts.map((h) => h.toLowerCase()));
    if (!hostSet.has(hostname)) {
      return {
        ok: false,
        code: "SOURCE_NOT_AUTHORIZED",
        message: `Hostname "${hostname}" is not on the authorized source allowlist.`,
      };
    }
  }

  const lookup = options?.dnsLookup ?? defaultDnsLookup;

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "DNS resolution failed";
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      message: `Failed to resolve hostname "${hostname}": ${msg}`,
    };
  }

  if (!addresses || addresses.length === 0) {
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      message: `No IP addresses found for hostname "${hostname}".`,
    };
  }

  // Verify that EVERY resolved address is safe
  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      return {
        ok: false,
        code: "INVALID_URL",
        message: `Resolved IP address ${address} is in a private, loopback, or reserved range.`,
      };
    }
  }

  return {
    ok: true,
    url: url.href,
    hostname,
  };
}
