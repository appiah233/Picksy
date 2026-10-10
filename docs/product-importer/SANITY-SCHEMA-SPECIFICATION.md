# Picksy Sanity Studio Schema & Studio Tool Specification

**Lead Coordinator & Frontend Owner:** Gemini  
**Backend & Security Owner:** Codex  
**Target Studio Project:** `0tozsrrx`  
**Target Dataset:** `production`  
**Status:** SPECIFIED — READY FOR CODEX CROSS-REVIEW  

---

## 1. Architectural Overview & Context

Following the authoritative product-owner decision (ADR-008), **Sanity is the ONLY approved third-party platform** for Picksy. Sanity provides the managed administrative content control plane, replacing a large custom `/admin` dashboard while keeping React, Next.js, and TypeScript as Picksy's core application stack.

### Target Architecture Flow:
```
Sanity Studio Tool (React 19)
       │
       ▼ (HTTPS with Editor Identity Proof)
Picksy Importer Service (src/lib/importer)
  - SSRF URL Validation & DNS Pinning
  - Source Adapters (impact, partnerstack, direct-feed)
  - Field Provenance & Normalization
  - Duplicate Detection
       │
       ▼ (ProductImportCandidate)
Sanity Draft Mutation (Server-side SANITY_API_WRITE_TOKEN)
  - importDraft document in Content Lake
       │
       ▼
Human Editorial Review in Sanity Studio
  - Category, Review, Merchant, AffiliateOffer enrichment
       │
       ▼
Sanity Publication Action
       │
       ▼ (Published documents in Content Lake)
Picksy Catalogue Adapter (GROQ query with perspective: 'published')
       │
       ▼
validateCatalog() Gate 3 Enforcement (src/lib/catalog-validation.ts)
       │
       ▼
Next.js App Router & React UI (src/app, src/content)
       │
       ▼
Affiliate Merchant Destination (safe outbound link)
```

---

## 2. Sanity Content Lake Document Schemas

All schemas align directly with Picksy's frozen domain models in `src/lib/catalog-types.ts` and `src/lib/importer-types.ts`.

### 2.1 Category Schema (`schemaTypes/categoryType.ts`)
```typescript
import { defineType, defineField } from "sanity";

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          if (!slug?.current) return "Slug is required";
          return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.current)
            ? true
            : "Slug must be lowercase alphanumeric with hyphens";
        }),
    }),
    defineField({
      name: "name",
      title: "Category Name",
      type: "string",
      validation: (Rule) => Rule.required().min(2).max(100),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().min(10).max(500),
    }),
    defineField({
      name: "audience",
      title: "Target Audience",
      type: "string",
      validation: (Rule) => Rule.required().min(3).max(200),
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "slug.current",
    },
  },
});
```

### 2.2 Merchant Schema (`schemaTypes/merchantType.ts`)
```typescript
import { defineType, defineField } from "sanity";

export const merchantType = defineType({
  name: "merchant",
  title: "Merchant",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Merchant Name",
      type: "string",
      validation: (Rule) => Rule.required().min(2).max(100),
    }),
    defineField({
      name: "approvedHosts",
      title: "Approved Hostnames",
      type: "array",
      of: [{ type: "string" }],
      description: "Exact hostnames allowed for affiliate redirects (e.g. merchant.com)",
      validation: (Rule) =>
        Rule.required()
          .min(1)
          .custom((hosts) => {
            if (!hosts || !Array.isArray(hosts)) return "At least one host is required";
            for (const h of hosts) {
              if (h !== h.toLowerCase()) return `Host "${h}" must be lowercase`;
              if (h.split(".").length < 2) return `Host "${h}" must have at least two segments`;
            }
            return true;
          }),
    }),
    defineField({
      name: "approvedDestinations",
      title: "Approved Destinations",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "destinationId",
              title: "Destination ID",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "url",
              title: "Destination URL",
              type: "url",
              validation: (Rule) =>
                Rule.required().uri({ scheme: ["https"] }),
            }),
            defineField({
              name: "authorizationReference",
              title: "Authorization Reference",
              type: "string",
              description: "Editorial documentation proving permission/contract for this destination",
              validation: (Rule) => Rule.required().min(5),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "approvedHosts.0",
    },
  },
});
```

### 2.3 Product Schema (`schemaTypes/productType.ts`)
```typescript
import { defineType, defineField } from "sanity";

export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Product Name",
      type: "string",
      validation: (Rule) => Rule.required().min(2).max(150),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          if (!slug?.current) return "Slug is required";
          return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.current)
            ? true
            : "Slug must be lowercase alphanumeric with hyphens";
        }),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "officialSource",
      title: "Official Source URL",
      type: "url",
      validation: (Rule) => Rule.required().uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().min(20).max(600),
    }),
    defineField({
      name: "intendedUser",
      title: "Intended User",
      type: "string",
      validation: (Rule) => Rule.required().min(5).max(250),
    }),
    defineField({
      name: "intendedWorkflow",
      title: "Intended Workflow",
      type: "string",
      validation: (Rule) => Rule.required().min(5).max(250),
    }),
    defineField({
      name: "importProvenance",
      title: "Import Provenance (Audit Record)",
      type: "object",
      fields: [
        defineField({ name: "sourceId", type: "string" }),
        defineField({ name: "canonicalUrl", type: "string" }),
        defineField({ name: "externalProductId", type: "string" }),
        defineField({ name: "retrievedAt", type: "datetime" }),
        defineField({ name: "sourceNotes", type: "string" }),
      ],
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "category.name",
    },
  },
});
```

### 2.4 Editorial Review Schema (`schemaTypes/reviewType.ts`)
```typescript
import { defineType, defineField } from "sanity";

export const reviewType = defineType({
  name: "review",
  title: "Editorial Review",
  type: "document",
  fields: [
    defineField({
      name: "product",
      title: "Reviewed Product",
      type: "reference",
      to: [{ type: "product" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "author",
      title: "Reviewer / Editor",
      type: "string",
      validation: (Rule) => Rule.required().min(2),
    }),
    defineField({
      name: "evaluatedOn",
      title: "Evaluated Date",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "publishedOn",
      title: "Published Date",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "reviewedOn",
      title: "Reviewed Date",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "methodology",
      title: "Testing Methodology",
      type: "text",
      rows: 4,
      validation: (Rule) => Rule.required().min(20),
    }),
    defineField({
      name: "sources",
      title: "Investigation Sources (HTTPS)",
      type: "array",
      of: [{ type: "url", validation: (Rule) => Rule.uri({ scheme: ["https"] }) }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "strengths",
      title: "Strengths (Pros)",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "limitations",
      title: "Limitations (Cons)",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "suitableFor",
      title: "Suitable For",
      type: "string",
      validation: (Rule) => Rule.required().min(5),
    }),
    defineField({
      name: "notSuitableFor",
      title: "Not Suitable For",
      type: "string",
      validation: (Rule) => Rule.required().min(5),
    }),
    defineField({
      name: "conclusion",
      title: "Verdict & Conclusion",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().min(10),
    }),
  ],
  preview: {
    select: {
      title: "product.name",
      subtitle: "author",
    },
  },
});
```

### 2.5 Affiliate Offer Schema (`schemaTypes/affiliateOfferType.ts`)
```typescript
import { defineType, defineField } from "sanity";

export const affiliateOfferType = defineType({
  name: "affiliateOffer",
  title: "Affiliate Offer",
  type: "document",
  fields: [
    defineField({
      name: "product",
      title: "Product",
      type: "reference",
      to: [{ type: "product" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "merchant",
      title: "Merchant",
      type: "reference",
      to: [{ type: "merchant" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "approvedDestinationId",
      title: "Approved Destination ID",
      type: "string",
      description: "Must match an approvedDestination.destinationId on the referenced merchant",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "label",
      title: "Offer Label",
      type: "string",
      description: "Must contain merchant name for consumer clarity",
      validation: (Rule) => Rule.required().min(3),
    }),
    defineField({
      name: "disclosure",
      title: "Affiliate Disclosure Statement",
      type: "text",
      rows: 2,
      validation: (Rule) => Rule.required().min(10),
    }),
    defineField({
      name: "state",
      title: "Offer State",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Inactive", value: "inactive" },
        ],
        layout: "radio",
      },
      initialValue: "active",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "label",
      subtitle: "state",
    },
  },
});
```

### 2.6 Import Draft Schema (`schemaTypes/importDraftType.ts`)
```typescript
import { defineType, defineField } from "sanity";

export const importDraftType = defineType({
  name: "importDraft",
  title: "Product Import Draft",
  type: "document",
  fields: [
    defineField({
      name: "sourceId",
      title: "Source Adapter",
      type: "string",
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "canonicalUrl",
      title: "Canonical URL",
      type: "url",
      readOnly: true,
      validation: (Rule) => Rule.required().uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "externalProductId",
      title: "External Product ID",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "candidateJson",
      title: "Candidate Payload (Frozen JSON)",
      type: "text",
      readOnly: true,
      description: "Original ProductImportCandidate JSON snapshot with full provenance",
    }),
    defineField({
      name: "editedCandidateJson",
      title: "Edited Candidate (JSON)",
      type: "text",
      description: "Curator modifications before entity instantiation",
    }),
    defineField({
      name: "importStatus",
      title: "Import Status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Approved & Instantiated", value: "instantiated" },
          { title: "Rejected", value: "rejected" },
        ],
        layout: "radio",
      },
      initialValue: "draft",
    }),
    defineField({
      name: "version",
      title: "Optimistic Version",
      type: "number",
      initialValue: 1,
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "canonicalUrl",
      subtitle: "sourceId",
    },
  },
});
```

---

## 3. Product Importer Sanity Studio Tool Plugin

The custom Studio Tool wraps the existing React 19 components in `src/features/admin/product-importer/`.

### 3.1 Studio Plugin Definition
```typescript
// in studio-picksy/src/plugins/productImporterPlugin.ts
import { definePlugin } from "sanity";
import { DownloadIcon } from "@sanity/icons";
import { ProductImporterToolView } from "./ProductImporterToolView";

export const productImporterPlugin = definePlugin({
  name: "picksy-product-importer",
  tools: (prev) => [
    ...prev,
    {
      name: "product-importer",
      title: "Affiliate Importer",
      icon: DownloadIcon,
      component: ProductImporterToolView,
    },
  ],
});
```

### 3.2 Studio Tool Component Integration Wrapper
The `ProductImporterToolView` mounts the proven frontend component tree:
- `UrlIngestionForm` (URL submission & client validation)
- `ImporterProgress` (accessible loading progress)
- `DuplicateAlert` (duplicate warning presentation)
- `CandidateEditor` (curator review & field editing)
- `ProvenanceBadge` (data origin auditing)
- `PublicationModal` (editorial checklist & disclosure verification)

### 3.3 Security & API Transport Boundary
1. **Zero Browser Robot Tokens**: The Studio Tool runs in the curator's browser and **never** possesses the Sanity Content Lake write token (`SANITY_API_WRITE_TOKEN`) or affiliate credentials.
2. **Editor Identity Proof**: Requests from the Studio Tool to the Picksy importer API include the curator's verified Sanity session token or forward requests through a trusted backend route.
3. **Draft Instantiation**: The Picksy backend importer engine validates the input, extracts the product via the adapter, checks for duplicates, and writes the `importDraft` document into Sanity Content Lake using the server-held `SANITY_API_WRITE_TOKEN`.
4. **CORS Restrictions**: Picksy importer endpoints enforce strict CORS restricted to the exact Sanity Studio origin (e.g., `http://localhost:3333` in dev, `https://picksy.sanity.studio` in production).

---

## 4. Picksy Public Catalogue Adapter

The catalogue adapter (`src/lib/sanity-catalog-adapter.ts`) bridges Sanity Content Lake to Picksy's public Next.js application while strictly enforcing Gate 3 isolation.

### 4.1 GROQ Query Specification
```groq
*[_type == "product" && !(_id in path("drafts.**"))] {
  "id": _id,
  "slug": slug.current,
  "categoryId": category._ref,
  "name": name,
  "officialSource": officialSource,
  "summary": summary,
  "intendedUser": intendedUser,
  "intendedWorkflow": intendedWorkflow,
  "state": "published"
}
```

### 4.2 Adapter Contract & Validation
The adapter queries:
- Published `categories`
- Published `products`
- Published `reviews`
- Published `merchants`
- Published `affiliateOffers`

Before returning `CatalogRecords`, the adapter passes the entire aggregated record set to `validateCatalog()` (`src/lib/catalog-validation.ts`):
```typescript
const result = validateCatalog(records);
if (!result.valid) {
  // Fail closed: reject any published record set that violates Gate 3 rules
  console.error("Sanity catalog validation failed:", result.errors);
  return { categories: [], products: [], reviews: [], merchants: [], offers: [] };
}
```
If any reference is broken, any date is invalid, any URL is non-HTTPS, or any affiliate offer destination is unauthorized, the adapter **fails closed** and emits zero invalid records to the public React UI.

