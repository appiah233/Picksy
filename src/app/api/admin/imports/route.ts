import { NextRequest } from "next/server";
import { verifyPreviewToken } from "@/lib/importer/auth";
import { requireAdmin } from "@/lib/admin-auth/guard";
import { validateAdminMutation } from "@/lib/admin-auth/mutation";
import { draftStore } from "@/lib/importer/draft-store";
import { getSourceAdapter } from "@/lib/importer/adapters/registry";
import { normalizeCandidate } from "@/lib/importer/normalizer";
import {
  errorResponse,
  jsonResponse,
  statusCodeForErrorCode,
} from "@/lib/importer/api-response";
import type { ImportDraft, ProductImportCandidate } from "@/lib/importer-types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return errorResponse(auth.code, auth.message, statusCodeForErrorCode(auth.code));
  }

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state") as "draft" | "published" | null;
  const sourceId = searchParams.get("sourceId") ?? undefined;

  const drafts = await draftStore.listDrafts({
    state: state ?? undefined,
    sourceId,
  });

  return jsonResponse({ drafts }, 200);
}

export async function POST(req: NextRequest) {
  // 1. Verify Admin Authentication
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return errorResponse(auth.code, auth.message, statusCodeForErrorCode(auth.code));
  }
  if (!validateAdminMutation(req)) {
    return errorResponse("FORBIDDEN", "Same-origin JSON request required.", 403);
  }

  // 2. Parse Body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_FAILED", "Malformed JSON request body.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("VALIDATION_FAILED", "Request body must be an object.", 400);
  }

  const { previewToken, edits } = body as {
    previewToken?: unknown;
    edits?: unknown;
  };

  if (typeof previewToken !== "string" || !previewToken.trim()) {
    return errorResponse(
      "VALIDATION_FAILED",
      "previewToken string is required.",
      400,
      "previewToken"
    );
  }

  // 3. Verify Preview Token
  const tokenVerification = verifyPreviewToken(previewToken.trim());
  if (!tokenVerification.ok) {
    return errorResponse(
      tokenVerification.code,
      tokenVerification.message,
      statusCodeForErrorCode(tokenVerification.code),
      "previewToken"
    );
  }

  const { sourceId, canonicalUrl } = tokenVerification.payload;

  // 4. Retrieve candidate from adapter or find existing draft
  const existing = await draftStore.findDraftBySourceUrl(sourceId, canonicalUrl);
  if (existing) {
    return jsonResponse<{ draft: ImportDraft; existing: boolean }>(
      { draft: existing, existing: true },
      200
    );
  }

  const adapter = getSourceAdapter(sourceId);
  if (!adapter) {
    return errorResponse("SOURCE_NOT_AUTHORIZED", `Source adapter "${sourceId}" unavailable.`, 400);
  }

  try {
    const rawPayload = await adapter.fetchCandidate(canonicalUrl);
    const candidate = normalizeCandidate(rawPayload);

    const safeEdits = (typeof edits === "object" && edits !== null ? edits : {}) as Partial<ProductImportCandidate>;

    const result = await draftStore.createDraft(candidate, safeEdits);

    const status = result.isExisting ? 200 : 201;
    return jsonResponse<{ draft: ImportDraft; existing?: boolean }>(
      { draft: result.draft, ...(result.isExisting ? { existing: true } : {}) },
      status
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating draft from candidate";
    return errorResponse("SOURCE_UNAVAILABLE", msg, 502);
  }
}
