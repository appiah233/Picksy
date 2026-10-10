import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth/guard";
import { validateAdminMutation } from "@/lib/admin-auth/mutation";
import { draftStore } from "@/lib/importer/draft-store";
import {
  errorResponse,
  jsonResponse,
  statusCodeForErrorCode,
} from "@/lib/importer/api-response";
import type { ImportDraft, ProductImportCandidate } from "@/lib/importer-types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return errorResponse(auth.code, auth.message, statusCodeForErrorCode(auth.code));
  }

  const { id } = await context.params;
  const draft = await draftStore.getDraft(id);

  if (!draft) {
    return errorResponse("VALIDATION_FAILED", `Draft with ID "${id}" not found.`, 404);
  }

  return jsonResponse<{ draft: ImportDraft }>({ draft }, 200);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return errorResponse(auth.code, auth.message, statusCodeForErrorCode(auth.code));
  }
  if (!validateAdminMutation(req)) {
    return errorResponse("FORBIDDEN", "Same-origin JSON request required.", 403);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_FAILED", "Malformed JSON request body.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("VALIDATION_FAILED", "Request body must be an object.", 400);
  }

  const { edits, version } = body as {
    edits?: unknown;
    version?: unknown;
  };

  if (typeof version !== "number") {
    return errorResponse(
      "VALIDATION_FAILED",
      'A numeric "version" field is required for optimistic concurrency control.',
      400,
      "version"
    );
  }

  const safeEdits = (typeof edits === "object" && edits !== null ? edits : {}) as Partial<ProductImportCandidate>;

  const result = await draftStore.updateDraft(id, safeEdits, version);

  if (!result.ok || !result.draft) {
    if (result.code === "CONFLICT") {
      return errorResponse("CONFLICT", result.message ?? "Optimistic locking conflict.", 409);
    }
    return errorResponse(
      "VALIDATION_FAILED",
      result.message ?? `Draft "${id}" not found.`,
      404
    );
  }

  return jsonResponse<{ draft: ImportDraft }>({ draft: result.draft }, 200);
}
