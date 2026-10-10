# Picksy Sanity Schema Adversarial Review
## Multi-Agent Governance Assessment: ArchitectAgent, ProductAgent, DatabaseAgent, SecurityAgent

**Date:** 2026-10-10  
**Phase:** Affiliate Product Importer — Sanity Managed Control Plane  
**Target:** Sanity Studio Content Schemas (`src/sanity/schemaTypes/*`)  
**Status:** ADVERSARIALLY AUDITED & APPROVED WITH INVARIANTS  

---

### 1. Executive Summary

A cross-discipline adversarial review was conducted across all six Sanity document schemas:
1. `category` ([`categoryType.ts`](file:///c:/Users/EricAppiahOwusu/Videos/Picksy/src/sanity/schemaTypes/categoryType.ts))
2. `merchant` ([`merchantType.ts`](file:///c:/Users/EricAppiahOwusu/Videos/Picksy/src/sanity/schemaTypes/merchantType.ts))
3. `product` ([`productType.ts`](file:///c:/Users/EricAppiahOwusu/Videos/Picksy/src/sanity/schemaTypes/productType.ts))
4. `review` ([`reviewType.ts`](file:///c:/Users/EricAppiahOwusu/Videos/Picksy/src/sanity/schemaTypes/reviewType.ts))
5. `affiliateOffer` ([`affiliateOfferType.ts`](file:///c:/Users/EricAppiahOwusu/Videos/Picksy/src/sanity/schemaTypes/affiliateOfferType.ts))
6. `importDraft` ([`importDraftType.ts`](file:///c:/Users/EricAppiahOwusu/Videos/Picksy/src/sanity/schemaTypes/importDraftType.ts))

The fundamental principle governing this review is **Picksy’s affiliate marketplace business model**:
> Picksy is an independent software recommendation and review platform. Picksy does **NOT** own inventory, does **NOT** process e-commerce transactions, does **NOT** maintain dynamic merchant pricing, and must **NEVER** present itself as the seller. All outbound merchant clicks must be transparent, disclaimed, and verified against contractual authorization.

---

### 2. Document-by-Document Adversarial Audit

---

#### 2.1 `category` Document Schema

| Field | Question | Adversarial Finding & Verdict |
| :--- | :--- | :--- |
| `slug` | Required by Picksy? | **Yes**. Core route parameter (`/categories/[slug]`). Regex-enforced (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`). |
| `name` | Who owns it? | **Editorial**. Picksy editors define category taxonomy (e.g. "CRM", "Email Marketing"). |
| `description` | Legitimate storage? | **Yes**. Editorial copy describing software classification to guide consumer evaluation. |
| `audience` | Can it become stale? | **Low risk**. Target audience descriptions change infrequently. Editorial review during annual audits. |

- **ArchitectAgent Assessment:** Fully aligns with `Category` interface in `src/lib/catalog-types.ts`.
- **SecurityAgent Assessment:** Slugs strictly sanitized; no script tags or unsafe path characters permitted.
- **DatabaseAgent Assessment:** Unique slug requirement ensures deterministic 1:1 mapping.

---

#### 2.2 `merchant` Document Schema

| Field | Question | Adversarial Finding & Verdict |
| :--- | :--- | :--- |
| `name` | Does Picksy own this? | **No**. Represents third-party merchant/vendor entity (e.g. "HubSpot", "Slack"). |
| `approvedHosts` | Who validates this? | **Security-Critical**. Explicit array of lowercase hostnames (min 2 segments, e.g. `hubspot.com`). Validates destination redirect targets. |
| `approvedDestinations` | What validates it? | **Contractual Authorization**. Array of `{ destinationId, url, authorizationReference }`. Every destination URL must be HTTPS, on an approved host, and contain a verifiable affiliate agreement reference (`authorizationReference`). |

- **SecurityAgent Assessment:** **CRITICAL INVARIANT**. Prohibits open redirects and rogue merchant subdomains. An imported URL cannot self-authorize; authorization requires human curation of `authorizationReference`.
- **ProductAgent Assessment:** Clear separation between merchant identity and affiliate offer links.

---

#### 2.3 `product` Document Schema

| Field | Question | Adversarial Finding & Verdict |
| :--- | :--- | :--- |
| `name` | Required? | **Yes**. Canonical software product title. |
| `slug` | Required? | **Yes**. Route identifier (`/products/[slug]`). |
| `category` | Unpublished reference risk? | **Reference to `category`**. Sanity draft products can reference draft categories, but `SanityCatalogAdapter` queries strictly with `perspective: 'published'`, and `validateCatalog` rejects any product referencing an unlisted category. |
| `officialSource` | What validates it? | **URI scheme**. Must be valid HTTPS URL pointing to the vendor’s primary home/domain. |
| `summary` | Who owns it? | **Editorial**. Independent Picksy product summary. |
| `intendedUser` | Stale risk? | **Low risk**. Target user persona (e.g., "SMB sales teams"). |
| `intendedWorkflow` | Stale risk? | **Low risk**. Target business process (e.g., "Inbound pipeline tracking"). |
| `importProvenance` | Operational audit? | **Read-only audit record**. Captures `sourceId`, `canonicalUrl`, `externalProductId`, `retrievedAt`. Proves data provenance without exposing secrets. |
| *Price / Inventory* | **Why omitted?** | **INTENTIONALLY EXCLUDED**. Picksy does not sell products or hold inventory. Dynamic pricing scraping leads to stale data and regulatory liability. Curation focuses on evaluation and reviews. |

- **ProductAgent Assessment:** Omission of pricing and stock fields preserves trust and avoids deceptive pricing claims.
- **DatabaseAgent Assessment:** Category reference is strictly typed (`to: [{ type: "category" }]`).

---

#### 2.4 `review` Document Schema

| Field | Question | Adversarial Finding & Verdict |
| :--- | :--- | :--- |
| `product` | Reference integrity? | Reference to `product`. Enforces 1:1 review-to-product association. |
| `author` | Ownership? | **Editorial**. Named staff reviewer or editorial team member. |
| `dates` (`evaluatedOn`, `publishedOn`, `reviewedOn`) | Invariant checks? | Validated by `isCompleteReview()` in `src/lib/catalog-validation.ts`. Invariant: `evaluatedOn <= publishedOn <= reviewedOn <= today`. |
| `methodology` | Required? | **Yes**. Required for Donald Knuth-level rigor and consumer trust. |
| `sources` | HTTPS required? | **Yes**. Array of HTTPS evidence links. Non-HTTPS links fail closed. |
| `strengths` / `limitations` | Balanced critique? | **Yes**. Mandatory arrays of pros and cons. A product cannot be published without limitations. |
| `suitableFor` / `notSuitableFor` | Objective guidance? | **Yes**. Identifies when software is *not* recommended. |
| `conclusion` | Verdict? | **Yes**. Clear editorial recommendation. |

- **ArchitectAgent Assessment:** Directly matches `Review` domain model in `src/lib/catalog-types.ts`.
- **SecurityAgent Assessment:** Review source links are validated against HTTPS and tagged as external in the UI.

---

#### 2.5 `affiliateOffer` Document Schema

| Field | Question | Adversarial Finding & Verdict |
| :--- | :--- | :--- |
| `product` | Reference? | Reference to `product`. |
| `merchant` | Reference? | Reference to `merchant`. |
| `approvedDestinationId` | Authorization binding? | Must match an existing `approvedDestination.destinationId` on the referenced merchant. Validated by `isRenderSafeOffer()`. |
| `label` | Deceptive advertising risk? | Label must explicitly contain merchant name (e.g. "Visit HubSpot"). Validated by `catalog-validation.ts`. |
| `disclosure` | FTC compliance? | **Mandatory text**. Clear affiliate commission disclosure statement rendered adjacent to CTA. |
| `state` | Active / Inactive? | Allows immediate suspension of expired or terminated affiliate campaigns without deleting records. |

- **SecurityAgent Assessment:** Enforces Gate 3 invariant: at most **one** active offer per product; destination must match merchant's approved host; label must mention merchant; disclosure must be present.
- **ProductAgent Assessment:** Eliminates consumer confusion. Picksy never masquerades as merchant checkout.

---

#### 2.6 `importDraft` Document Schema

| Field | Question | Adversarial Finding & Verdict |
| :--- | :--- | :--- |
| `sourceId` | Internal staging? | Stores adapter key (`impact`, `partnerstack`, etc.). Read-only. |
| `canonicalUrl` | Ingestion source? | Normalized external product URL. |
| `externalProductId` | Identity tracking? | Merchant affiliate network identifier. |
| `candidateJson` | Audit preservation? | Complete frozen JSON of `ProductImportCandidate` including field-level provenance. |
| `editedCandidateJson` | Human modifications? | Stores curator revisions before final document instantiation. |
| `importStatus` | Public catalog exposure? | **ZERO EXPOSURE**. Staging documents are never queried by `SanityCatalogAdapter`. |
| `version` | Concurrency safety? | Integer incremented on update. Optimistic locking rejects stale writes with `409 CONFLICT`. |

- **DatabaseAgent Assessment:** Isolated from public catalogue. Acts as durable, version-locked staging buffer.

---

### 3. Multi-Agent Verdict & Certification

1. **ArchitectAgent:**
   - Schemas accurately mirror frozen domain models (`CatalogRecords`, `ProductImportCandidate`).
   - Clean projection boundaries established for GROQ queries.
2. **ProductAgent:**
   - Excludes dynamic pricing and inventory to prevent stale data and consumer deception.
   - Enforces FTC affiliate disclosures and merchant branding on all outbound calls to action.
3. **DatabaseAgent:**
   - Enforces relational referential integrity (`product -> category`, `review -> product`, `affiliateOffer -> product, merchant`).
   - Implements optimistic locking on drafts.
4. **SecurityAgent:**
   - Hostname allowlists prevent arbitrary open redirects.
   - Fail-closed catalog adapter prevents malformed or unverified records from ever reaching public pages.
   - Zero secrets stored in document schemas.

**Status:** **APPROVED & CERTIFIED ACROSS ALL 4 GOVERNANCE DOMAINS**.

