# Shared Data Contract — CONTRACT STATUS: FROZEN

> **Architecture amendment, 2026-10-10:** `ProductImportCandidate`, provenance and Picksy catalogue validation shapes remain frozen. Sanity Content Lake is the approved target content store; `src/content/catalog.ts` is transitional. Imported candidates must become Sanity drafts and require human publication. The `ImportDraft` shape below is the existing interface, not evidence that Neon/Prisma or the Sanity mapping is operational. Any schema, ID or revision mapping change requires Gemini/Codex contract review. The public path is published Sanity content -> Picksy Catalogue Adapter -> `validateCatalog` -> Picksy domain model -> Next.js -> React UI -> validated merchant destination.

**Status**: FROZEN (Agreed by Gemini & Codex on 2026-10-10)  
**Lead Coordinator**: Gemini  
**Backend & Security Owner**: Codex  

---

## 1. ProductImportCandidate (Shared Candidate Model)

```ts
export interface ProvenanceRecord {
  sourceUrl: string;
  retrievedAt: string; // ISO 8601 UTC
}

export interface ProductImportCandidate {
  sourceId: string;
  canonicalUrl: string;
  externalProductId: string | null;
  name: string;
  slug: string;
  categoryId: string | null;
  merchantName: string;
  merchantDomain: string;
  officialSource: string;
  summary: string;
  intendedUser: string;
  intendedWorkflow: string;
  price: string | null;
  currency: string | null;
  affiliateUrl: string;
  destinationUrl: string;
  imageUrl: string | null;
  retrievedAt: string; // ISO 8601 UTC
  warnings: string[];
  provenance: Record<string, ProvenanceRecord>;
}

// Backward-compatible alias
export type NormalizedPreview = ProductImportCandidate;
```

---

## 2. Duplicate Detection Model

```ts
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingDraftId: string | null;
  existingProductId: string | null;
  matchField: "canonicalUrl" | "externalProductId" | "slug" | null;
  message: string | null;
}
```

---

## 3. Import Draft Model

```ts
export interface ImportDraft {
  id: string;
  sourceId: string;
  canonicalUrl: string;
  externalProductId: string | null;
  state: "draft" | "published";
  candidate: ProductImportCandidate;
  edits: Partial<ProductImportCandidate>;
  version: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Editorial Review Input (for Publication)

```ts
export interface EditorialReviewInput {
  author: string;
  evaluatedOn: string;
  publishedOn: string;
  reviewedOn: string;
  methodology: string;
  sources: string[];
  strengths: string[];
  limitations: string[];
  suitableFor: string;
  notSuitableFor: string;
  conclusion: string;
  authorizationReference: string;
  offerLabel: string;
  disclosure: string;
}
```

---

## 5. Storage Constraints & Catalog Invariants

1. **Uniqueness Constraints**:
   - `(sourceId, externalProductId)` when `externalProductId` is present.
   - `(sourceId, canonicalUrl)` for all drafts.
   - `slug` within the published product catalog.
2. **Catalog Invariants**:
   - Draft records remain strictly isolated from the public catalog.
   - An import draft cannot become a public product without satisfying `validateCatalog` from `src/lib/catalog-validation.ts`.
   - Destination URLs must match `merchant.approvedHosts` and contain a valid `authorizationReference`.
3. **Managed Content Storage Target (Sanity)**:
   - Per product-owner decision, Sanity is the ONLY approved third-party platform. Drafts map to Sanity Content Lake documents (`_type: 'product'`, `_id: 'drafts.<id>'`).
   - The frozen models (`ProductImportCandidate`, `ImportDraft`, `DuplicateCheckResult`) remain the authoritative contracts between the Picksy importer engine and Sanity Studio.

