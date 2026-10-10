import { defineType, defineField } from "sanity";

const hostnamePattern =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const isApprovedHostname = (value: unknown): value is string =>
  typeof value === "string" &&
  hostnamePattern.test(value) &&
  !value.split(".").every((label) => /^\d+$/.test(label));

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
              if (!isApprovedHostname(h)) {
                return `Host "${String(h)}" must be a lowercase DNS hostname without ports, wildcards, or trailing dots`;
              }
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
              validation: (Rule) => Rule.required().uri({ scheme: ["https"] }),
            }),
            defineField({
              name: "authorizationReference",
              title: "Authorization Reference",
              type: "string",
              description: "Editorial documentation proving permission/contract for this destination",
              validation: (Rule) => Rule.required().min(5),
            }),
          ],
          validation: (Rule) =>
            Rule.custom((destination, context) => {
              if (!destination || typeof destination !== "object") return true;
              const url = (destination as { url?: unknown }).url;
              if (typeof url !== "string") return true;
              try {
                const hostname = new URL(url).hostname;
                const hosts = (context.document as { approvedHosts?: unknown } | undefined)
                  ?.approvedHosts;
                return Array.isArray(hosts) && hosts.includes(hostname)
                  ? true
                  : "Destination hostname must exactly match an approved merchant hostname";
              } catch {
                return true;
              }
            }),
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
