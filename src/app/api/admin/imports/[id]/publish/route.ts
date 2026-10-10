import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth/guard";
import { validateAdminMutation } from "@/lib/admin-auth/mutation";
import { publishImportDraft } from "@/lib/importer/publisher";
import {
  errorResponse,
  jsonResponse,
  statusCodeForErrorCode,
} from "@/lib/importer/api-response";
import type { EditorialReviewInput } from "@/lib/importer-types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: RouteContext) {
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

  const { version, editorialReview } = body as {
    version?: unknown;
    editorialReview?: unknown;
  };

  if (typeof version !== "number") {
    return errorResponse(
      "VALIDATION_FAILED",
      'A numeric "version" field is required for publication.',
      400,
      "version"
    );
  }

  if (typeof editorialReview !== "object" || editorialReview === null) {
    return errorResponse(
      "VALIDATION_FAILED",
      '"editorialReview" object is required for publication.',
      400,
      "editorialReview"
    );
  }

  const result = await publishImportDraft(
    id,
    version,
    editorialReview as EditorialReviewInput
  );

  if (!result.ok) {
    const code = result.code ?? "VALIDATION_FAILED";
    const status = statusCodeForErrorCode(code);
    return errorResponse(code, result.message ?? "Publication validation failed.", status);
  }

  return jsonResponse<{ productId: string; state: "published" }>(
    {
      productId: result.productId!,
      state: "published",
    },
    200
  );
}
