# Sanity importer authorization threat review

**SecurityAgent review:** 2026-10-10  **Status:** CHANGES REQUIRED before Studio-to-Picksy importer calls are enabled. This is a read-only architecture review; no Sanity identity flow was tested.

## Critical blocker

At review time, `SECURITY.md` and `TEST-PLAN.md` proposed sending a reusable `x-picksy-importer-token` or robot token from a browser-executed Studio tool to the Picksy API; both active statements have since been corrected. This pattern is unsafe: every browser running the tool can extract and replay the credential, and it does not establish which human editor is acting. [Sanity warns against tokens in browser JavaScript](https://www.sanity.io/docs/help/js-client-browser-token). CORS origin restrictions do not make a browser-held secret safe.

## Required proof before enabling a separate importer API

1. Demonstrate a supported Studio editor identity handoff. Do not assume an exportable, short-lived token exists: [Studio auth may use token or cookie modes](https://www.sanity.io/docs/app-sdk/sdk-authentication), and [personal tokens may last a year](https://www.sanity.io/docs/content-lake/http-auth).
2. The Picksy service validates the editor credential online on each request, confirms the human actor, exact Sanity project/dataset and required permission, and fails closed for anonymous, expired, revoked, wrong-project, robot-only and insufficient-role requests. The [Access API permission check](https://www.sanity.io/docs/http-reference/access-api) is a candidate for the proof; its exact behavior in Studio mode remains unverified.
3. Keep a distinct, narrowly scoped Sanity robot write token only on the Picksy server for draft mutations. Never place it in Studio or the public Next.js bundle. No affiliate source credential enters browser code.
4. Restrict [CORS](https://www.sanity.io/docs/content-lake/cors) to exact Studio origins; treat it as a browser boundary, not authorization. If cookies are involved, verify Origin and CSRF protection. Limit request size, rate, and replay.
5. If editor credential verification cannot be proven, investigate a trusted Sanity-hosted Function or separately reviewed Picksy authorization boundary. Do not substitute a shared browser secret.

## Publication and data controls

- For webhook-triggered cache invalidation, verify the raw-body signature, bound replay and deduplicate deliveries; re-fetch current state because [Sanity webhooks can be duplicated or out of order](https://www.sanity.io/docs/content-lake/webhook-best-practices).
- The public catalogue adapter explicitly reads the [published perspective](https://www.sanity.io/docs/content-lake/perspectives), excludes drafts, maps complete linked records to the Picksy domain model, and runs `validateCatalog` before rendering.
- Preserve fail-closed source permissions, SSRF checks, provenance, duplicates, human publication and safe affiliate destinations.

**Next gate:** Gemini and Codex review the identity mechanism and schema; run anonymous/editor/non-editor/revoked credential tests against project `0tozsrrx`. Studio CLI initialization is separately blocked until an authorized Sanity login is available.
