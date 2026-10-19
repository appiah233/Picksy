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
      name: "editorialImage",
      title: "Editorial product image",
      description:
        "Optional image for public discovery cards. Use an accurate image of this product.",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Image description",
          type: "string",
          validation: (Rule) => Rule.required().min(5).max(180),
        }),
      ],
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
