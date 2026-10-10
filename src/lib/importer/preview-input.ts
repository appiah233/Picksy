import type { ApiErrorResponse } from "../importer-types.ts";
import { validateSourceUrl } from "./source-url.ts";

export type PreviewInput = { sourceId: string; productUrl: string };
export type PermittedSource = { id: string; approvedHosts: readonly string[] };
export type PreviewInputResult =
  | { ok: true; input: PreviewInput; canonicalUrl: string; source: PermittedSource }
  | { ok: false; status: 400 | 403; body: ApiErrorResponse };

function error(status: 400 | 403, code: "INVALID_URL" | "SOURCE_NOT_AUTHORIZED", message: string): PreviewInputResult {
  return { ok: false, status, body: { error: { code, message, field: code === "INVALID_URL" ? "productUrl" : "sourceId" } } };
}

export function validatePreviewInput(
  body: unknown,
  permittedSources: readonly PermittedSource[]
): PreviewInputResult {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return error(400, "INVALID_URL", "Provide a source ID and product URL.");
  const { sourceId, productUrl } = body as Record<string, unknown>;
  if (typeof sourceId !== "string" || !sourceId || sourceId.length > 80)
    return error(403, "SOURCE_NOT_AUTHORIZED", "Affiliate source is not authorized.");
  const source = permittedSources.find((item) => item.id === sourceId);
  if (!source || source.approvedHosts.length === 0)
    return error(403, "SOURCE_NOT_AUTHORIZED", "Affiliate source is not authorized.");
  if (typeof productUrl !== "string")
    return error(400, "INVALID_URL", "Provide a valid HTTPS product URL.");
  const url = validateSourceUrl(productUrl, source.approvedHosts);
  if (!url.ok)
    return error(
      url.code === "INVALID_URL" ? 400 : 403,
      url.code,
      url.code === "INVALID_URL" ? "Provide a valid HTTPS product URL." : "URL host is not authorized for this source."
    );
  return { ok: true, input: { sourceId, productUrl }, canonicalUrl: url.url, source };
}
