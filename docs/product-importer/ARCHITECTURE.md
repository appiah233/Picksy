# Approved Platform Architecture

## Sole Approved Third-Party Platform

Sanity is the only third-party business platform approved for Picksy.

Sanity provides Picksy's managed content and administrative control plane.

Picksy's public application remains a React application implemented with
Next.js and TypeScript.

## Target Architecture

```text
Sanity Studio
    |
    | Administrative content operations
    | Product Importer workflow
    | Draft review and publication
    v
Sanity Content Lake
    |
    | Validated product and editorial content
    v
Picksy Catalogue Adapter
    |
    v
validateCatalog
    |
    v
Picksy domain model
    |
    v
Next.js Application
    |
    v
React Customer Experience
    |
    v
Validated Affiliate Merchant Destination
```

Sanity is approved for:
- administrative content operations;
- affiliate product catalogue administration;
- product records, descriptions, and images;
- categories, merchants, and merchant destinations;
- editorial reviews, comparison content, and deal content;
- product-import review, draft management, and human publication;
- content revision history and appropriate administrative access control.

Sanity must not replace:
- the public React experience;
- Next.js routing and rendering;
- TypeScript application contracts;
- backend importer security, affiliate-link validation, SSRF protections, normalization, provenance, and duplicate detection;
- public catalogue validation (`validateCatalog`);
- safe merchant redirects.

`src/content/catalog.ts` is the transitional runtime source, not the permanent target authority. Sanity Content Lake is the target. Imported products enter Sanity as drafts and require explicit human publication before the adapter can consider them. The standalone Studio-to-Picksy importer identity handoff is unresolved; browser-held reusable robot/shared credentials are prohibited by the [SecurityAgent review](SANITY-SECURITY-REVIEW.md).

## Historical Importer Proposal — Superseded for Admin Content Operations


The earlier custom `/admin`, Auth.js and Neon architecture below is preserved for traceability and safe reuse/removal assessment. It is not the active production direction.

The existing public site reads a validated repository catalog at build time. Prisma is only a blueprint. An admin importer therefore needs an explicit storage and publication integration before it can affect public pages.

1. An authenticated admin submits a source ID and HTTPS product URL to the server.
2. The server checks that the source is configured and authorized, validates the URL and redirects against source-specific hosts, and retrieves data through that source's permitted API or feed. No generic merchant-page scraper is assumed.
3. A source adapter maps permitted fields into a normalized preview. Every field retains provenance. Imported copy is untrusted and never auto-publishes.
4. The admin edits and saves a draft. Canonical merchant/product identity and source URL have unique constraints so repeated imports return the existing draft or a duplicate result.
5. Publication is a separate admin operation. It must pass the existing catalog validation plus editorial source, review, merchant destination and disclosure checks. The publication adapter must update the public catalog atomically or use an approved deployment workflow.

Adapter interface: `preview(input, context) -> NormalizedPreview`; adapters are registered by source ID, with source-specific URL allowlists, credentials and permission references. Network, parsing and storage code stays server-only.

No live adapter, endpoint or migration should be deployed until the source, identity, storage and publication decisions are accepted. The empty repository catalogue remains the transitional runtime source until a validated Sanity cutover.

## Managed Administration Control Plane Architecture (Sanity - APPROVED)

Sanity is the **ONLY** third-party platform currently approved for Picksy.

### Target Architecture
```text
Sanity
  │
  ▼
Affiliate Product Importer
  │
  ▼
ProductImportCandidate
  │
  ▼
Sanity Draft
  │
  ▼
Human Review
  │
  ▼
Publish
  │
  ▼
Picksy Catalogue Adapter
  │
  ▼
Next.js
  │
  ▼
React UI
  │
  ▼
Affiliate Merchant
```

### Core Technology Stack Invariants
- **React** remains part of Picksy (UI layer and custom Sanity Studio Tool component views).
- **Next.js** remains Picksy's React application framework.
- **TypeScript** remains the implementation language.
- **Sanity does NOT replace React or Next.js**; it acts strictly as the managed administrative/content control plane.

### 1. Control Plane & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│ Sanity Studio (standalone sibling application)         │
│  - Products, Categories, Editorial Reviews, Taxonomy   │
│  - Managed Auth (Google, GitHub, SSO, Email) + RBAC    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Custom Importer Studio Tool / Document Action     │  │
│  │  (Reuses Picksy Importer React Components)       │  │
│  └──────────────────────┬───────────────────────────┘  │
└─────────────────────────┼──────────────────────────────┘
                          │
                          │ HTTPS + individually verified editor authorization
                          ▼
┌────────────────────────────────────────────────────────┐
│ Picksy Backend Importer Engine                         │
│  - URL Syntax & SSRF Protection (DNS / Private IP)     │
│  - Permitted Affiliate Source Adapters (Impact, etc.) │
│  - Normalizer & Provenance Extraction                  │
│  - Duplicate Detection against Sanity / Catalog        │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼ Sanity Mutations API (@sanity/client)
┌────────────────────────────────────────────────────────┐
│ Sanity Content Lake                                    │
│  - Document Drafts: Sanity-generated document identity │
│  - Editorial Verification & Review Flow                │
│  - Publish Action -> Published Records                 │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼ GROQ / CDN Read + ISR / Webhook
┌────────────────────────────────────────────────────────┐
│ Picksy Public Web Application (Next.js 15)             │
│  - Catalog Validation Invariant (catalog-validation.ts)│
│  - Read-only Public Caching & Static Generation        │
│  - Empty Catalog Invariant preserved until Gate 3      │
└────────────────────────────────────────────────────────┘
```

### 2. Disposition of Custom Admin & Auth.js
- **Status: SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY. Disposition: PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT.** The previously proposed Auth.js GitLab OAuth foundation (`src/auth.ts`, `src/lib/admin-auth/**`, `/api/auth/**`) and custom `/admin` page routes (`src/app/admin/imports/**`) are paused.
- They are preserved in the repository without deletion to allow reuse of frontend components inside the Sanity Studio Tool.
- Studio editor authentication is delegated to Sanity. Any independent Picksy importer API still requires server-side caller authorization; the exact handoff remains to be verified.

---

## Newsletter Requirement — Delivery Architecture Not Approved

Brevo was **EVALUATED - NOT APPROVED** and must not be implemented. No other newsletter provider or custom bulk-email delivery platform is approved.

The requirement for visitors to subscribe to curated discount deals remains valid as a functional requirement:
- Direct opt-in consent without automatic account creation.
- Privacy-conscious intake with client honeypot and rate limiting.
- Accessible (WCAG 2.2 AA) frontend form interface.
- Zero third-party vendor integration with Brevo is authorized.
- Delivery infrastructure will be determined under separate product-owner direction.

