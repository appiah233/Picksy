# Backend evidence

## 2026-10-10 Joint Managed-Platform & Newsletter Investigation Evidence

1. **Documentary & Architectural Decisions**:
   - Official Sanity documentation reviewed; Sanity explicitly **APPROVED** as the ONLY third-party platform for Picksy's managed administrative and content control plane.
   - Brevo evaluation: **Status: EVALUATED - NOT APPROVED**; all vendor integration halted. Newsletter requirement: **Status: REQUIRED - DELIVERY ARCHITECTURE NOT APPROVED**.
   - Core technology stack invariants reaffirmed: React remains part of Picksy (UI layer), Next.js remains the framework, TypeScript remains the implementation language. Sanity does NOT replace React or Next.js.


2. **Backend & Route Dynamic Verification**:
   - Codex updated all dynamic API routes with `export const dynamic = "force-dynamic";`:
     - `src/app/api/auth/[...nextauth]/route.ts`
     - `src/app/api/admin/imports/preview/route.ts`
     - `src/app/api/admin/imports/route.ts`
     - `src/app/api/admin/imports/[id]/route.ts`
     - `src/app/api/admin/imports/[id]/publish/route.ts`
   - Test Evidence:
     - `npm run typecheck`: 0 errors.
     - `npm run lint`: 0 errors, 0 warnings.
     - `npm test`: 136/136 tests PASS across all suites (including frontend component tests, SSRF unit tests, backend importer tests, admin authorization tests, catalog isolation, and production wiring).

3. **Status & Invariants**:
   - Custom admin UI (`src/features/admin/product-importer/`) and Auth.js foundation: **Status: SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY**; **Disposition: PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT**.
   - Public catalogue in `src/content/catalog.ts` remains empty as the transitional runtime source. Sanity Content Lake is the approved target authority; no live adapter/cutover has been verified. Gate 3 invariants remain required.

## 2026-10-10 SecurityAgent cross-review

The proposed browser Studio shared/robot token authorization is **CHANGES REQUIRED**. A reusable credential in Studio browser code can be extracted and replayed and cannot identify an editor. The independent review and official source links are in [SANITY-SECURITY-REVIEW.md](SANITY-SECURITY-REVIEW.md). No Sanity identity, draft, publication, webhook or public-read integration proof has run. The requested sibling Studio initializer failed with `No valid authentication credentials found`; `../studio-picksy` was not created.

## 2026-10-10 Milestone C-SANITY-1 Server-Side Draft Write & Catalogue Adapter Evidence

1. **Component Implementations**:
   - `src/lib/sanity-client.ts`: Implemented native fetch-based server HTTP transport for Sanity Content Lake API (`v2024-03-15`). Constructs dynamic query and mutation URLs, attaches `Authorization: Bearer <SANITY_API_WRITE_TOKEN>` on server side only, and enforces zero browser exposure.
   - `src/lib/sanity-draft-store.ts`: Implemented `SanityDraftStore` conforming to `ImportDraftStore` interface. Writes `importDraft` documents to Content Lake via Sanity mutation endpoint with optimistic version locking (409 CONFLICT on mismatch).
   - `src/lib/sanity-catalog-adapter.ts`: Implemented `SanityCatalogAdapter` executing GROQ queries against Content Lake for published documents (`category`, `merchant`, `product`, `review`, `affiliateOffer`). Enforces Gate 3 `validateCatalog()` fail-closed semantics: returns empty catalog if Content Lake contains broken references or constraint violations.

2. **Test & Verification Evidence**:
   - `tests/sanity-integration.test.mjs`: Added comprehensive 5-test suite:
     - SanityClient URL construction, params, and Authorization headers.
     - SanityClient mutation dispatch and error handling.
     - SanityDraftStore document generation and optimistic concurrency control.
     - SanityCatalogAdapter fail-closed behavior on catalog validation failure.
     - SanityCatalogAdapter projection and validation for valid Content Lake records.
   - Test execution results:
     - `node --experimental-strip-types --test tests/sanity-integration.test.mjs`: 5/5 passed (805ms).
     - `npm run lint`: 0 errors, 0 warnings.
     - `npm run typecheck`: 0 errors.
     - `npm test`: 141/141 tests PASS cleanly across all 15 test suites.

3. **Isolation & Invariants**:
   - Public catalogue `src/content/catalog.ts` remains empty and isolated until Gate 3 authorization.
   - Zero hardcoded external URLs in client code.
   - Zero browser exposure of write tokens or credentials.


