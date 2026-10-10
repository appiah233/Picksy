import { Building2, FileCheck2, FileClock, FolderOpen, Layers, PackageSearch, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DashboardItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge: string;
}

export const workflows: DashboardItem[] = [
  {
    title: "Affiliate Product Importer",
    description: "Ingest affiliate software candidates via approved network feeds. Features SSRF-protected URL validation, automatic metadata extraction, duplicate detection, and candidate staging.",
    href: "/studio/product-importer", icon: Layers, badge: "Interactive Tool",
  },
  {
    title: "Review Staged Drafts",
    description: "Inspect staged candidate documents in the Content Lake. Review provenance data, verify merchant destination authorization, and execute deliberate publication through the editorial checklist.",
    href: "/studio/structure/importDraft", icon: FileClock, badge: "Gate 3 Staging",
  },
];

export const structureSections: DashboardItem[] = [
  { title: "Products", description: "Curate software products, official source links, target workflows, and review status.", href: "/studio/structure/product", icon: PackageSearch, badge: "Schema: product" },
  { title: "Categories", description: "Organize software categories, descriptions, audience targeting, and display orders.", href: "/studio/structure/category", icon: FolderOpen, badge: "Schema: category" },
  { title: "Merchants & Destinations", description: "Maintain authorized merchants, verified host allowlists, and affiliate tracking destinations.", href: "/studio/structure/merchant", icon: Building2, badge: "Schema: merchant" },
  { title: "Editorial Reviews", description: "Curate hands-on evaluations, methodology, dates, strengths, limitations, and conclusions.", href: "/studio/structure/review", icon: FileCheck2, badge: "Schema: review" },
  { title: "Affiliate Offers", description: "Manage active affiliate offers, disclosures, rates, and merchant tracking parameters.", href: "/studio/structure/affiliateOffer", icon: Percent, badge: "Schema: affiliateOffer" },
  { title: "Import Drafts (Staging)", description: "Inspect staged candidate records awaiting editorial validation before publication.", href: "/studio/structure/importDraft", icon: FileClock, badge: "Schema: importDraft" },
];
