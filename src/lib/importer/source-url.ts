// First boundary for an affiliate adapter. A network adapter must also validate DNS,
// every redirect, and the connected address before it makes a request.
export type SourceUrlResult =
  | { ok: true; url: string }
  | { ok: false; code: "INVALID_URL" | "SOURCE_NOT_AUTHORIZED" };

const ipLiteral = (host: string) =>
  /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith("[") || host.endsWith("]");

export function validateSourceUrl(input: string, approvedHosts: readonly string[]): SourceUrlResult {
  if (
    typeof input !== "string" ||
    input.length > 2048 ||
    input !== input.trim() ||
    /[\\\u0000-\u001f\u007f]/.test(input)
  )
    return { ok: false, code: "INVALID_URL" };
  try {
    const url = new URL(input);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      ipLiteral(url.hostname) ||
      !/^[a-z0-9.-]+$/.test(url.hostname) ||
      !url.hostname.includes(".")
    )
      return { ok: false, code: "INVALID_URL" };
    const hosts = new Set(approvedHosts.map((host) => host.toLowerCase()));
    if (!hosts.has(url.hostname.toLowerCase()))
      return { ok: false, code: "SOURCE_NOT_AUTHORIZED" };
    return { ok: true, url: url.href };
  } catch {
    return { ok: false, code: "INVALID_URL" };
  }
}
