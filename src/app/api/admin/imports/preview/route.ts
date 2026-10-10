import { NextRequest } from "next/server";
import { checkRateLimit, generatePreviewToken } from "@/lib/importer/auth";
import { requireAdmin } from "@/lib/admin-auth/guard";
import { validateAdminMutation } from "@/lib/admin-auth/mutation";
import { validateSourceUrlWithDns } from "@/lib/importer/url-validator";
import { getSourceAdapter, isSupportedSource } from "@/lib/importer/adapters/registry";
import { normalizeCandidate } from "@/lib/importer/normalizer";
import { detectDuplicates } from "@/lib/importer/duplicate-detector";
import { draftStore } from "@/lib/importer/draft-store";
import {
  errorResponse,
  jsonResponse,
  statusCodeForErrorCode,
} from "@/lib/importer/api-response";
import type { ImportPreviewResponse } from "@/lib/importer-types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Verify Admin Authentication
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return errorResponse(auth.code, auth.message, statusCodeForErrorCode(auth.code));
  }
  if (!validateAdminMutation(req)) {
    return errorResponse("FORBIDDEN", "Same-origin JSON request required.", 403);
  }

  // 2. Sliding window rate limiting
  const rateLimit = checkRateLimit(`preview_${auth.principal.id}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many preview requests. Please wait before submitting another URL.",
      429
    );
  }

  // 3. Parse JSON Body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_FAILED", "Malformed JSON request body.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("VALIDATION_FAILED", "Request body must be an object.", 400);
  }

  const { sourceId, productUrl } = body as { sourceId?: unknown; productUrl?: unknown };

  if (typeof sourceId !== "string" || !isSupportedSource(sourceId)) {
    return errorResponse(
      "SOURCE_NOT_AUTHORIZED",
      `Source "${String(sourceId)}" is not supported or authorized.`,
      400,
      "sourceId"
    );
  }

  if (typeof productUrl !== "string" || !productUrl.trim()) {
    return errorResponse(
      "INVALID_URL",
      "A non-empty productUrl string is required.",
      400,
      "productUrl"
    );
  }

  // 4. Source Adapter & SSRF Protection with DNS verification
  const adapter = getSourceAdapter(sourceId);
  if (!adapter) {
    return errorResponse("SOURCE_NOT_AUTHORIZED", `No adapter configured for "${sourceId}".`, 400);
  }

  const urlCheck = await validateSourceUrlWithDns(productUrl.trim(), {
    approvedHosts: adapter.approvedHosts,
  });

  if (!urlCheck.ok) {
    return errorResponse(
      urlCheck.code,
      urlCheck.message,
      statusCodeForErrorCode(urlCheck.code),
      "productUrl"
    );
  }

  // 5. Fetch & Normalize Candidate
  try {
    const rawPayload = await adapter.fetchCandidate(urlCheck.url);
    const candidate = normalizeCandidate(rawPayload);

    // 6. Duplicate Detection
    const existingDrafts = await draftStore.listDrafts();
    const duplicate = detectDuplicates(candidate, existingDrafts);

    // 7. Generate Signed Preview Token
    const previewToken = generatePreviewToken(candidate.sourceId, candidate.canonicalUrl);

    const response: ImportPreviewResponse = {
      previewToken,
      candidate,
      duplicate,
    };

    return jsonResponse<ImportPreviewResponse>(response, 200);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch candidate from source";
    return errorResponse("SOURCE_UNAVAILABLE", msg, 502);
  }
}
