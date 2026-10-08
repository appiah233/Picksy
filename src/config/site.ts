import { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Picksy",
  tagline: "Helping businesses pick the right software with confidence.",
  description:
    "Picksy researches business software. Reviews appear here after their sources and claims are verified.",
  url: process.env.NEXT_PUBLIC_APP_URL || "",
  categories: [
    {
      id: "crm-automation",
      name: "CRM & Automation",
      slug: "crm-automation",
      description: "Customer lifecycle, sales funnels, pipeline tracking, and workflow automation.",
      iconName: "Workflow",
    },
    {
      id: "seo-tools",
      name: "SEO Tools",
      slug: "seo-tools",
      description:
        "Rank tracking, keyword intelligence, technical site auditing, and backlink analysis.",
      iconName: "Search",
    },
    {
      id: "email-marketing",
      name: "Email Marketing",
      slug: "email-marketing",
      description:
        "Broadcast delivery, automated nurturing sequences, segmentation, and deliverability.",
      iconName: "Mail",
    },
    {
      id: "course-platforms",
      name: "Course Platforms",
      slug: "course-platforms",
      description:
        "Learning management, digital product delivery, student communities, and checkout engines.",
      iconName: "GraduationCap",
    },
    {
      id: "managed-hosting",
      name: "Managed Hosting",
      slug: "managed-hosting",
      description:
        "High-availability cloud infrastructure, WordPress optimization, and edge networks.",
      iconName: "Server",
    },
    {
      id: "cybersecurity",
      name: "Cybersecurity",
      slug: "cybersecurity",
      description:
        "Endpoint protection, vulnerability scanning, password vaults, and data compliance.",
      iconName: "ShieldCheck",
    },
  ],
  mainNav: [
    { title: "Categories", href: "/#categories" },
    { title: "Why Picksy", href: "/#why-trust" },
    { title: "Newsletter", href: "/#newsletter" },
  ],
  footerNav: [
    {
      title: "Navigation",
      items: [
        { title: "Home", href: "/" },
        { title: "Categories", href: "/#categories" },
        { title: "Why Trust Picksy", href: "/#why-trust" },
        { title: "Newsletter", href: "/#newsletter" },
      ],
    },
    {
      title: "Resources",
      items: [
        { title: "Guides (Coming Soon)", href: "#", disabled: true },
        { title: "Reviews (Coming Soon)", href: "#", disabled: true },
        { title: "Comparisons (Coming Soon)", href: "#", disabled: true },
      ],
    },
    {
      title: "Legal & Standards",
      items: [
        { title: "Privacy Policy", href: "#" },
        { title: "Terms of Service", href: "#" },
        { title: "Affiliate Disclosure", href: "/#disclosure" },
        { title: "Editorial Guidelines", href: "#" },
      ],
    },
  ],
};
