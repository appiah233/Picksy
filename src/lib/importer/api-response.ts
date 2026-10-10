import { NextResponse } from "next/server";
import type { ImporterErrorCode } from "../importer-types.ts";

export function jsonResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(
  code: ImporterErrorCode,
  message: string,
  status = 400,
  field?: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(field ? { field } : {}),
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    }
  );
}

export function statusCodeForErrorCode(code: ImporterErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "INVALID_URL":
      return 400;
    case "SOURCE_NOT_AUTHORIZED":
      return 400;
    case "SOURCE_UNAVAILABLE":
      return 502;
    case "DUPLICATE":
      return 409;
    case "VALIDATION_FAILED":
      return 422;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    default:
      return 400;
  }
}
