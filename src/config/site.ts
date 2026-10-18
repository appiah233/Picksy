import { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Picksy",
  tagline: "Discover what's worth buying.",
  description:
    "Explore products through thoughtful reviews and clear merchant links. Discover what fits your life, then choose where to shop.",
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
    { title: "Home", href: "/" },
    { title: "Discover", href: "/#products" },
    { title: "Our approach", href: "/#our-approach" },
  ],
  footerNav: [
    {
      title: "Navigation",
      items: [
        { title: "Home", href: "/" },
        { title: "Products", href: "/#products" },
        { title: "Our approach", href: "/#our-approach" },
      ],
    },
    { title: "Transparency", items: [{ title: "Affiliate disclosure", href: "/#disclosure" }] },
  ],
};
