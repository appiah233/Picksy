# Shared API Contract — CONTRACT STATUS: FROZEN

> **Architecture amendment, 2026-10-10:** Sanity is the sole approved external business platform and owns admin content workflows. The endpoint/error shapes below record the previously frozen custom-admin importer contract and remain preserved pending a coordinated transport/auth amendment for a standalone Sanity Studio. The independent Picksy API must authorize the actual editor server-side; a reusable robot/shared secret in browser-executed Studio code is prohibited (see [SecurityAgent review](SANITY-SECURITY-REVIEW.md)). Do not treat Auth.js below as active production architecture. No newsletter provider API is approved.

**Status**: FROZEN (Agreed by Gemini & Codex on 2026-10-10)  
**Lead Coordinator**: Gemini  
**Backend & Security Owner**: Codex  

All endpoints are server-side, admin-only, JSON, same-origin, and emit `Cache-Control: no-store`.  
Mutations enforce CSRF verification, session authentication, and audit tracking.  
Raw merchant HTML and source credentials are never exposed or returned to the browser.

---

## Endpoints

| Method | Path | Request Body | Success Response | Status |
| --- | --- | --- | --- | --- |
| `POST` | `/api/admin/imports/preview` | `{ sourceId: string, productUrl: string }` | `200 { previewToken, candidate: ProductImportCandidate, duplicate: DuplicateCheckResult }` | Frozen |
| `POST` | `/api/admin/imports` | `{ previewToken: string, edits: Partial<ProductImportCandidate> }` | `201 { draft: ImportDraft }` or `200 { draft: ImportDraft, existing: true }` | Frozen |
| `GET` | `/api/admin/imports/:id` | none | `200 { draft: ImportDraft }` | Frozen |
| `PATCH` | `/api/admin/imports/:id` | `{ edits: Partial<ProductImportCandidate>, version: number }` | `200 { draft: ImportDraft }` | Frozen |
| `POST` | `/api/admin/imports/:id/publish` | `{ version: number, editorialReview: EditorialReviewInput }` | `200 { productId: string, state: "published" }` | Frozen |

---

## Token & Error Specifications

- `previewToken`: A cryptographically signed or server-stored short-lived token (15-minute TTL) binding `sourceId`, `canonicalUrl`, and retrieved candidate timestamp. Prevents SSRF replay attacks.
- `version`: Monotonically increasing integer used for optimistic concurrency control on draft edits. Returns `409 CONFLICT` if mismatch detected.
- `duplicate`: Contains `{ isDuplicate: boolean, existingDraftId: string | null, existingProductId: string | null, matchField: string | null, message: string | null }`.

### Error Response Schema
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "The destination URL cannot be reached or violates SSRF policy.",
    "field": "productUrl"
  }
}
```

### Stable Error Codes
- `UNAUTHORIZED`: Authentication missing or invalid.
- `FORBIDDEN`: User lacks catalog administrator role.
- `INVALID_URL`: URL fails syntax, protocol (`https`), port, or private IP resolution check.
- `SOURCE_UNAVAILABLE`: Affiliate source adapter is offline, timed out, or uncontactable.
- `SOURCE_NOT_AUTHORIZED`: Source adapter not configured or lacks merchant permission.
- `DUPLICATE`: Conflict on canonical URL or external product ID during non-override create.
- `VALIDATION_FAILED`: Extracted or edited fields fail catalog schema constraints.
- `CONFLICT`: Optimistic locking collision (`version` mismatch).
- `NOT_FOUND`: Specified draft or entity not found.
- `RATE_LIMITED`: Exceeded maximum import requests per admin / source window.

## Proposed authentication clarification (SUPERSEDED)

> **Status: SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY**  
> **Disposition: PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT**

With Sanity approved as the sole managed administrative and content control plane, Studio editor sign-in and dataset roles are handled by Sanity. The historical Auth.js proposal below is preserved for traceability. An independent Picksy importer service must verify the individual editor and required permission server-side on every call. A reusable robot or shared token in browser-executed Studio code is prohibited; the exact supported handoff is CHANGES REQUIRED pending the [SecurityAgent review](SANITY-SECURITY-REVIEW.md) and a live proof. A server-only robot write token can be used only after caller authorization.

Auth.js GitLab OAuth was the previously proposed identity provider. Picksy authorizes exact GitLab user IDs server-side. Every admin API route returns `401 UNAUTHORIZED` for no valid session and `403 FORBIDDEN` for a valid session without importer authorization, before any source or database work. Cookie-authenticated mutations require a verified same-origin CSRF proof. This proposal preserves current endpoint paths and error codes; Gemini must accept the CSRF request detail before clients rely on a specific header or token shape.

