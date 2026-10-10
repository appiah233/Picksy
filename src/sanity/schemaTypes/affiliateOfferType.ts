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

