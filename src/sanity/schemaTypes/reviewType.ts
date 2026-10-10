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

