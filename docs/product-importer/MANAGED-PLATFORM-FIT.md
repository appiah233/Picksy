# Managed administration and newsletter fit assessment

**Date:** 2026-10-10  **Status:** SANITY APPROVED; BREVO EVALUATED - NOT APPROVED

## Product Owner Architectural Decision
- **SANITY: APPROVED**. Sanity is the ONLY third-party platform approved for Picksy, serving as the managed administrative and content control plane.
- **BREVO: EVALUATED - NOT APPROVED**. Brevo must not be implemented. Zero vendor code or endpoints for Brevo shall be introduced.
- **NEWSLETTER: VALID (PLATFORM-AGNOSTIC)**. The newsletter requirement for visitors to subscribe to deal alerts remains valid as an application requirement, but no third-party delivery vendor is approved.
- **CORE STACK INVARIANT**: React remains the UI library, Next.js remains the application framework, and TypeScript remains the implementation language. Sanity does NOT replace React or Next.js.

## Picksy baseline

Picksy's public catalogue currently reads the empty, validated repository catalogue in `src/content/catalog.ts`. This is transitional; Sanity Content Lake is the approved target authority. The importer has URL and normalization code, but no source has documented retrieval permission, and production persistence/publication is unverified. The custom `/admin` UI and Auth.js work: **Status: SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY**; **Disposition: PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT**. Preserve them without treating them as the chosen control plane.

## Sanity for catalogue and editorial administration (APPROVED)

**Status: APPROVED for vertical integration.** [Sanity Studio](https://www.sanity.io/docs/studio) provides schema-driven editing for products, categories and editorial content; [custom Studio tools](https://www.sanity.io/docs/studio/custom-studio-tool) and [document actions](https://www.sanity.io/docs/studio/document-actions-api) put importer review directly into the editorial workflow. [Content Lake Actions](https://www.sanity.io/docs/content-lake/dispatch-actions) support draft and publication operations. Sanity hosts the Studio or embeds it cleanly, eliminating the need for Picksy to maintain a large custom `/admin` application.

**Target Architecture:**
`Sanity -> Affiliate Product Importer -> ProductImportCandidate -> Sanity Draft -> Human Review -> Publish -> Picksy Catalogue Adapter -> Next.js -> React UI -> Affiliate Merchant`

1. A custom Sanity Studio Tool invokes a protected Picksy importer service for validation and permitted retrieval.
2. The service returns a `ProductImportCandidate` with provenance and SSRF validation.
3. A reviewed candidate becomes a Sanity draft (`drafts.<id>`) through a server-only, narrowly scoped write integration (`SANITY_API_WRITE_TOKEN`).
4. Human review and publication remain distinct human actions in Sanity Studio.
5. The public site reads validated published records from Sanity Content Lake through an explicit `Picksy Catalogue Adapter`, enforcing `validateCatalog` from `src/lib/catalog-validation.ts`.
6. The current repository catalogue remains the transitional runtime source until that path passes all existing publication gates and public regression tests; Sanity Content Lake is the target authority.

**Security boundary — CHANGES REQUIRED:** Sanity authenticates Studio editors and enforces dataset roles, but a separate Picksy importer service must verify the individual editor's identity and permission. A reusable robot or shared token in browser-executed Studio code is prohibited. Server-only robot write credentials are limited to service-to-Content-Lake mutations. The exact supported editor credential handoff needs a live proof; see the [SecurityAgent threat review](SANITY-SECURITY-REVIEW.md).

**Material limits and cost:** [Sanity pricing](https://www.sanity.io/pricing) Free tier ($0) includes 20 seats, 10,000 documents, and Administrator/Viewer roles; Growth tier ($15/seat/mo) adds Editor/Contributor roles. Free tier is suitable for MVP.

## Newsletter Requirement Disposition

**Brevo Evaluation: Status: EVALUATED - NOT APPROVED**  
**Newsletter Capability: Status: REQUIRED - DELIVERY ARCHITECTURE NOT APPROVED**

- The product owner confirmed that Brevo is **NOT approved** and must not be implemented.
- The user-facing requirement that visitors must be able to subscribe to receive curated software discounts remains valid.
- The frontend UX/UI specification (WCAG 2.2 AA accessibility, clear opt-in, mobile-first design, client honeypot `b_comment`, instant syntax validation, status announcements) remains a standard for future newsletter intake.
- Any future delivery or storage mechanism will be addressed under separate product-owner direction without third-party vendor assumptions.

## Decision gates

1. Gemini packages `ProductImporter` React components as a custom Sanity Studio Tool; Codex implements the Sanity Draft mutation and the Picksy Catalogue Adapter reading published records with `validateCatalog`.
2. Prove a single permitted-source candidate can become a reviewed Sanity draft and a validated published catalogue record without bypassing Gate 3. Source permission remains blocked until actual terms/credentials are provided.
3. Keep the transitional public catalogue in `src/content/catalog.ts` empty until Gate 3 authorization and a validated Sanity cutover.
4. Retire or reuse custom `/admin` and Auth.js once the Sanity Studio integration is verified.

**Current verdict:** Sanity is APPROVED as Picksy's managed control plane. Vertical integration proceeds immediately. Brevo is EVALUATED - NOT APPROVED.



