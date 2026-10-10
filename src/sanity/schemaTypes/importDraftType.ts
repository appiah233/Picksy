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

