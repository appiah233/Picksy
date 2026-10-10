# Product Importer Architectural Decisions & Record

**Lead Coordinator**: Gemini  
**Backend & Security Owner**: Codex  
**Status**: ACTIVE

---

## Decision Log

### ADR-001: Unification of Shared Candidate Interface (`ProductImportCandidate`)
- **Context**: Codex proposed `NormalizedPreview` in `DATA-CONTRACT.md`. The project coordination protocol references `ProductImportCandidate`.
- **Decision**: Adopt `ProductImportCandidate` as the primary shared contract interface representing extracted, normalized affiliate product candidates. `NormalizedPreview` is aliased to `ProductImportCandidate` for backward compatibility.
- **Consequences**:
  - Frontend displays `ProductImportCandidate` in preview state.
  - Backend adapter engines emit `ProductImportCandidate`.
  - All shared typings reside in `src/lib/importer-types.ts`.

### ADR-002: Administrative Route Scoping & Public Site Isolation
- **Current status**: Historical custom-admin route decision; SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY. The existing code is PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT. Public-site isolation remains mandatory.
- **Context**: Existing Gate 2 tests (`tests/production-wiring.test.mjs` and `tests/build-isolation.mjs`) assert that the public application only contains `categories/[slug]`, `products/[slug]`, and home `/`.
- **Decision**:
  - The admin importer UI is encapsulated within `src/features/admin/product-importer/` with its page route at `src/app/admin/imports/page.tsx`.
  - API endpoints reside at `src/app/api/admin/imports/route.ts` and `src/app/api/admin/imports/preview/route.ts` (or dedicated sub-routes).
  - Test suites are updated to recognize admin routes under an isolated admin boundary without compromising public catalog invariants.

### ADR-003: SSRF Mitigation & DNS Resolution Architecture
- **Context**: Retrieving merchant product data from external URLs poses Server-Side Request Forgery (SSRF) and DNS rebinding risks.
- **Decision**:
  - The browser NEVER calls merchant endpoints directly.
  - Server-side validation resolves hostnames to IP addresses prior to HTTP requests.
  - Prohibit all loopback (`127.0.0.0/8`), private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and multicast addresses.
  - Enforce strict HTTPS protocol, standard ports, and source-specific host allowlists.

### ADR-004: In-Memory / File-Backed Draft Persistence Seam
- **Current status**: Historical local/test seam; Sanity Content Lake is the approved target for content drafts. Existing local store code is preserved pending safe disposition.
- **Context**: Production PostgreSQL / Neon connection is not yet provisioned in this development environment (`DATABASE_URL` unconfigured).
- **Decision**:
  - Implement a pluggable storage adapter interface (`ImportDraftStore`).
  - Provide a robust file-backed / memory store for local development and test automation, paired with Prisma schema specifications for Neon PostgreSQL deployment.
  - Guarantees end-to-end functionality, deterministic testing, and zero blocking on third-party cloud infrastructure.

### ADR-005: Publication Gate Invariants
- **Context**: In accordance with Gate 2/3 rules, an imported draft MUST NOT automatically appear in the public catalog without verified editorial evidence and merchant destination authorization.
- **Decision**:
  - `POST /api/admin/imports/:id/publish` strictly runs `validateCatalog` logic.
  - Requires approved destination ID with `authorizationReference`.
  - If validation fails, publication is rejected with descriptive error codes and the draft remains in `draft` state.

### ADR-006: Source Permissions Strategy (Blocker 1 Resolution)
- **Context**: Need a clear, enforceable boundary regarding which affiliate sources can be queried and how retrieval permission is verified without arbitrary web scraping.
- **Decision**:
  - Arbitrary merchant scraping is strictly prohibited.
  - Only registered source adapters (`partnerstack`, `impact`, `shareasale`, `direct-feed`) with configured credentials or verified feed endpoints are authorized.
  - Each source adapter maintains an explicit hostname allowlist (e.g., `app.partnerstack.com`, `impact.com`, official merchant API domains).
  - Unregistered domains or missing credentials fail fast with `SOURCE_NOT_AUTHORIZED` or `INVALID_URL`.
- **Status**: RESOLVED.

### ADR-007: Persistence Target Strategy (Blocker 2 Resolution)
- **Current status**: Historical Neon/Prisma proposal superseded for managed content drafts by ADR-008. The schema remains in the tree pending safe disposition; no production Neon migration was verified.
- **Context**: Production persistence target must support transactional integrity, unique constraints, and schema migrations while allowing seamless local execution.
- **Decision**:
  - **Production Model**: Defined in `prisma/schema.prisma` with `model ImportDraft` targeting Neon PostgreSQL.
  - **Runtime Execution**: An abstracted `ImportDraftStore` provides an in-memory/JSON-file implementation (`MemoryDraftStore` / `FileDraftStore`) active in development and test environments when `DATABASE_URL` is unconfigured.
  - Enforces unique constraints on `(sourceId, canonicalUrl)` and `(sourceId, externalProductId)`.
  - Implements optimistic concurrency control via integer `version` field.
- **Status**: RESOLVED.
 
 ### ADR-008: Outsourcing Administrative & Content Control Plane to Managed Platform (Sanity - APPROVED)
 - **Context**: Maintaining a large custom `/admin` application with custom UI layouts, table management, editorial workflow, and session management creates excessive maintenance overhead for Picksy's MVP. Product owner explicitly APPROVED Sanity as the ONLY third-party platform for Picksy's administrative/content control plane.
 - **Decision**:
   - Adopt Sanity as Picksy's managed administrative and content control plane.
   - Implement vertical integration following the target architecture:
     `Sanity -> Affiliate Product Importer -> ProductImportCandidate -> Sanity Draft -> Human Review -> Publish -> Picksy Catalogue Adapter -> Next.js -> React UI -> Affiliate Merchant`.
   - Package the existing Product Importer React 19 components (`src/features/admin/product-importer/`) as a custom Sanity Studio Tool.
   - React remains part of Picksy; Next.js remains the application framework; TypeScript remains the implementation language. Sanity does not replace React or Next.js.
   - Preserve the Codex backend importer engine (SSRF validator, source adapters, normalizer, duplicate detection) as an authenticated service backing the Studio Tool.
 - **Consequences**:
   - Eliminates custom admin dashboard maintenance and custom user session tables in Picksy.
   - Public catalogue reads from Sanity Content Lake via an explicit, validated adapter (`Picksy Catalogue Adapter`), running all records through `validateCatalog` to keep Gate 3 invariants strictly intact.
 - **Status**: APPROVED.
 
 ### ADR-009: Disposition of Third-Party Newsletter Platforms (Brevo REJECTED)
 - **Context**: Architectural investigation explored Brevo for newsletter and deal alerts. Product owner explicitly corrected: Sanity is the ONLY third-party platform approved. Brevo is NOT approved and must NOT be implemented.
 - **Decision**:
   - **Brevo integration is REJECTED and MUST NOT be implemented.**
   - The newsletter requirement itself remains valid for visitors to subscribe to deal alerts, but no third-party email delivery vendor integration is authorized.
   - Any future newsletter implementation must be platform-agnostic or evaluated under separate product-owner direction.
 - **Consequences**:
   - All Brevo-specific API endpoints, credentials, templates, and integration plans are halted and removed from the active architecture.
 - **Status**: EVALUATED - NOT APPROVED.

 
 ### ADR-010: Pausing Custom Administrator Control Plane & Auth.js Implementation
 - **Context**: Product owner directed pausing work dependent on Picksy owning a custom admin control plane or custom administrator authentication.
 - **Decision**:
   - Pause further Auth.js integration work and positive-path testing for `/admin` routes.
   - With Sanity Studio handling content administration, user authentication and RBAC are outsourced to Sanity's managed identity system.
   - Re-evaluate `AUTH-CONTRACT.md`: Sanity handles Studio editor sign-in, while any independent Picksy importer API still needs proven per-editor server-side authorization. A reusable robot/shared token in browser Studio code is prohibited; see `SANITY-SECURITY-REVIEW.md`.
   - Keep existing Auth.js foundation in tree marked as pending architectural disposition.
 - **Status**: SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY.
 - **Disposition**: PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT.



### ADR-011: Sanity Studio Content Schemas and Custom Importer Tool Plugin
- **Context**: Vertical integration of Sanity as the managed administrative control plane requires explicit document schemas in Sanity Content Lake matching Picksy's domain model, and an architectural specification for packaging the React 19 Product Importer component tree as a Sanity Studio Tool.
- **Decision**:
  1. Adopt 6 formal document schemas in `SANITY-SCHEMA-SPECIFICATION.md`:
     - `category`: id, slug, name, description, audience
     - `merchant`: id, name, approvedHosts, approvedDestinations
     - `product`: id, slug, category (reference), name, officialSource, summary, intendedUser, intendedWorkflow, importProvenance
     - `review`: product (reference), author, evaluatedOn, publishedOn, reviewedOn, methodology, sources, strengths, limitations, suitableFor, notSuitableFor, conclusion
     - `affiliateOffer`: product (reference), merchant (reference), approvedDestinationId, label, disclosure, state
     - `importDraft`: sourceId, canonicalUrl, externalProductId, candidateJson, editedCandidateJson, importStatus, version
  2. Implement `definePlugin` for Sanity Studio Tool `productImporter`:
     - Mounts proven frontend UI components (`UrlIngestionForm`, `CandidateEditor`, `ProvenanceBadge`, `DuplicateAlert`, `ImporterProgress`, `PublicationModal`) within Sanity Studio tool view layout.
     - Studio Tool communicates with Picksy importer service via authenticated requests (using editor session credential or proxy, NEVER a shared browser robot write token).
     - Upon saving/confirming an import candidate, writes an `importDraft` document into Sanity Content Lake using server-side Sanity write client (`SANITY_API_WRITE_TOKEN`).
  3. Strict Gate 3 public catalog isolation:
     - Public catalogue adapter reads published documents only using Sanity's `published` perspective.
     - Passes all records to `validateCatalog()` (`src/lib/catalog-validation.ts`) before emitting `CatalogRecords` to Next.js page views. Fails closed if any record fails validation.
- **Status**: APPROVED.


### ADR-012: Sanity Dependency Compatibility Remediation via Option A
- **Context**: `create-sanity` attempted to install `next-sanity@13.3.4`, which failed with npm `ERESOLVE` due to its peer requirement for `next@"^16.0.0-0"` against Picksy's `next@15.5.27`. Additionally, `sanity@5.31.2` imports `useEffectEvent` directly from `'react'`, which is undefined in Next.js 15.5.27's compiled React bundle, breaking Webpack builds.
- **Decision**:
  - Adopt **Option A**: Preserve `next@15.5.27`, `react@19.0.0` (resolved to `19.3.0`), and `typescript`.
  - Pin `next-sanity` to its official `stable` release `11.6.13` (declared peer `"next": "^15.1.0-0 || ^16.0.0-0"`, `"react": "^18.3 || ^19"`, `"sanity": "^4.22.0 || ^5"`).
  - Pin `sanity` and `@sanity/vision` to `^4.22.1` (which imports `useEffectEvent` from the `use-effect-event` ponyfill rather than directly from `'react'`, officially supports React 19, and compiles cleanly with Next.js 15 Webpack).
  - Retain `styled-components@^6.5.3` and `@sanity/image-url@^2.1.1`.
- **Consequences**:
  - Resolves dependency conflict with zero bypass flags (no `--force`, no `--legacy-peer-deps`).
  - `npm ls` reports 0 invalid peer dependencies across the entire tree.
  - `npm run build` succeeds cleanly with static generation of `/studio/[[...tool]]` (1.75 MB).
  - `http://localhost:3000/` and `http://localhost:3000/studio` return HTTP 200 at runtime.
  - Preserves all 141 tests in `npm test` without framework upgrade disruption.
- **Status**: APPROVED.
