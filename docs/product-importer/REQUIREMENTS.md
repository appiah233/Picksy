# Picksy Affiliate Product Importer — Requirements & Specification

**Phase**: Affiliate Product Importer  
**Lead Coordinator & Frontend Owner**: Gemini  
**Backend & Security Owner**: Codex  
**Status**: APPROVED / IN PROGRESS

---

## 1. Executive Summary & Objective

Picksy requires an administrative Affiliate Product Importer that enables verified administrators to import SaaS and B2B software products directly from permitted affiliate networks and merchant feeds, normalize untrusted product data, edit metadata, detect duplicate entries, manage draft lifecycles, and securely publish records into the Picksy catalog adhering to Gate 2/3 editorial and link invariants.

---

## 2. Personas & Roles

- **System Administrator / Catalog Editor**:
  - Authenticated staff member managing product curation.
  - Reviews source provenance, pricing, claims, and categorization.
  - Ensures compliance with editorial guidelines and affiliate disclosure rules.
  - Authorizes publication into the catalog.

---

## 3. Administrator Import Journey & Workflows

### Journey Overview
The administrator import workflow consists of 6 core phases:
1. **Source & URL Ingestion**: Admin enters a product URL or selects an authorized affiliate network adapter.
2. **Validation & SSRF Protection**: Backend verifies URL syntax, protocol (`https`), allowed merchant hosts, resolves DNS against private/restricted subnets, and confirms source permissions.
3. **Extraction & Normalization**: Backend fetches product data via permitted source adapter / API, normalizes the payload into a `ProductImportCandidate`, and extracts candidate fields with provenance.
4. **Duplicate Detection & Conflict Warning**: System queries existing drafts and published products for canonical URL or external product ID matches; flags existing records with non-blocking or blocking warnings.
5. **Editable Candidate Preview**: Admin inspects extracted data (name, slug, category, summary, intended user, intended workflow, price, currency, official source, merchant destination, disclosure), overrides/edits fields, selects category, and resolves warnings.
6. **Persistence & Publication Gate**:
   - **Save as Draft**: Persists draft with versioning and audit trail.
   - **Publish**: Validates against strict catalog requirements (`catalog-validation.ts`), creates/updates verified catalog records, binds verified merchant destinations, and locks active offers.

---

## 4. UI / UX State Requirements

The importer interface must provide responsive, accessible (WCAG 2.2 AA target) states:

1. **Initial / Idle State**:
   - Source selector (Auto-detect, Impact, PartnerStack, Direct Merchant Feed).
   - URL input with instant syntactic client validation, clear helper text, and paste button.
   - Primary CTA: "Fetch Product Preview".
2. **Loading / Ingestion State**:
   - Accessible progress indicator / skeleton preview (`aria-busy="true"`).
   - Status messages: "Validating destination host...", "Retrieving normalized product data...".
   - Disabled controls to prevent double submissions.
3. **Validation / Fetch Error State**:
   - Clear, actionable alerts mapping stable error codes (`INVALID_URL`, `UNAUTHORIZED_HOST`, `SOURCE_UNAVAILABLE`, `RATE_LIMITED`).
   - Remediation guidance for the administrator.
4. **Duplicate Detected State**:
   - Visual warning banner indicating existing draft or published catalog product.
   - Direct link to view/edit existing draft or published product.
   - Option to "Update Existing Draft" or "Import as New Variant" (with slug disambiguation).
5. **Candidate Review & Edit State**:
   - Split-view / clean form: Raw source evidence vs. editable catalog fields.
   - Field editors with character counters and validation cues:
     - Name & Auto-generated Slug
     - Category Selector (from approved taxonomy)
     - Summary & Editorial Focus
     - Intended User & Intended Workflow
     - Price, Billing Frequency, Currency
     - Official Source URL & Merchant Destination URL
     - Affiliate Offer Label & Mandatory Disclosure Statement
   - Source Provenance Badges: Displays where each field was extracted from.
6. **Saving Draft State**:
   - Submitting changes to `/api/admin/imports`.
   - Optimistic concurrency conflict check.
7. **Draft Saved / Publication Ready State**:
   - Success banner with Draft ID and last updated timestamp.
   - "Publish to Catalog" CTA with checklist verification (Editorial Review, Destination Authorization Reference, Disclosure Compliance).
8. **Published State**:
   - Confirmation badge with direct link to the product preview.

---

## 5. Non-Functional Requirements

- **Security**: Strict SSRF prevention, zero browser-side merchant fetching, no credentials in payloads, CSRF tokens on mutations.
- **Accessibility**: Keyboard navigable (Tab, Esc, Enter), ARIA live regions for async state announcements, high-contrast focus rings, color-blind friendly warning palettes.
- **Responsiveness**: Mobile (360px+), Tablet (768px+), and Desktop (1280px+) fluid layouts.
- **Performance**: Sub-500ms client state transitions; non-blocking background adapter fetches with 8s timeouts.
- **Integrity**: Zero bypass of `catalog-validation.ts`; empty production catalog invariant maintained while Gate 3 is unauthorized.
 
---
 
## 6. Managed Administration & Sanity Studio Integration Requirements (APPROVED)

- **Sanity Approved as Managed Control Plane**:
  - Sanity is the **ONLY** third-party platform currently approved for Picksy.
  - Primary product curation, taxonomy/category definitions, editorial reviews, and publishing workflows are managed in Sanity.
  - Core Stack Invariant: React remains part of Picksy (UI layer and Studio components); Next.js remains the application framework; TypeScript remains the implementation language. Sanity does NOT replace React or Next.js.
- **Target Flow**:
  `Sanity -> Affiliate Product Importer -> ProductImportCandidate -> Sanity Draft -> Human Review -> Publish -> Picksy Catalogue Adapter -> Next.js -> React UI -> Affiliate Merchant`
- **Product Importer Embedding**:
  - The Product Importer workflow (`UrlIngestionForm`, `CandidateEditor`, `ProvenanceBadge`, `DuplicateAlert`) is packaged as a custom Sanity Studio Tool.
  - The Studio Tool invokes the Picksy server-side importer engine (`/api/admin/imports/preview`) to perform URL validation, SSRF checks, and adapter normalization.
  - Saving creates or updates a Sanity draft through an authorized boundary; the Studio browser must not receive a reusable service/write secret. Ordinary document IDs are generated by Sanity and retained for edits.
  - Publication invokes Sanity document publish actions guarded by catalog validation rules (`validateCatalog`).
- **Catalogue Adapter**:
  - `Picksy Catalogue Adapter` reads published records from Sanity Content Lake.
  - All records must pass `validateCatalog` before being rendered by the Next.js React UI.
  - `src/content/catalog.ts` is transitional and remains empty until Gate 3 authorization; Sanity Content Lake is the target content authority. The adapter maps published documents through `validateCatalog` into the Picksy domain model before public rendering.

---

## 7. Public Newsletter Requirements

- **Current Status**: **REQUIRED - DELIVERY ARCHITECTURE NOT APPROVED**
- **Historical Platform Evaluation (Brevo)**: **Status: EVALUATED - NOT APPROVED**
- **Platform Invariant**:
  - Brevo is NOT approved and must NOT be implemented.
  - Zero third-party vendor code or endpoints for Brevo or any other newsletter provider shall be introduced.
- **Functional Objective**:
  - Provide public visitors with an accessible mechanism to subscribe to curated software discounts and deal alert newsletters.
  - No Picksy user accounts or authentication required for newsletter subscribers.
  - Delivery infrastructure will be determined under separate product-owner direction.
  - Confirmation and unsubscribe behavior require a later delivery architecture decision; signup must never imply confirmed delivery before that behavior is implemented.

- **Opt-In & Privacy Invariants**:
  - Explicit, unambiguous opt-in statement: "Subscribe to receive curated software discounts and deal alerts. Unsubscribe at any time."
  - Record consent metadata (timestamp, policy version, anonymized client hash).
  - Clear link to Privacy Policy.
  - Handle duplicate and invalid addresses, provider failure and unsubscribe without revealing whether a specific address is already subscribed.
- **Abuse & Bot Prevention**:
  - Client-side honeypot field (`b_comment`, hidden from assistive technology and sighted users).
  - Server-side IP rate limiting.
- **Accessibility & Responsiveness (WCAG 2.2 AA)**:
  - Fully keyboard operable with clear visual focus outlines.
  - Explicit `<label>` for the email input.
  - Live regions (`aria-live="polite"`) for async status updates.
  - Mobile-first responsive styling fitting cleanly in site footer, deal cards, and home banner.
  - Touch target sizes >= 44x44px.


