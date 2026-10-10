import type { ProductImportCandidate, ProvenanceRecord } from "../importer-types.ts";
import type { RawProductPayload } from "./adapters/types.ts";

/**
 * Strips HTML tags, script markers, event handlers, and decodes common entities.
 */
export function sanitizeText(input: unknown): { text: string; hadHtml: boolean } {
  if (typeof input !== "string") {
    return { text: "", hadHtml: false };
  }

  const raw = input.trim();
  const hadHtml = /<[^>]+>|javascript:|on\w+=/i.test(raw);

  const cleaned = raw
    // Strip script and style blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Strip HTML tags
    .replace(/<[^>]+>/g, " ")
    // Remove unsafe script protocol indicators
    .replace(/javascript:/gi, "")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse consecutive whitespaces
    .replace(/\s+/g, " ")
    .trim();

  return { text: cleaned, hadHtml };
}

/**
 * Generates a valid slug matching /^[a-z0-9]+(?:-[a-z0-9]+)*$/
 */
export function slugify(text: string): string {
  const sanitized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens

  return sanitized || "software-product";
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "crm-automation": ["crm", "automation", "pipeline", "funnel", "sales", "leads", "lead", "deal"],
  "seo-tools": ["seo", "rank", "keyword", "backlink", "audit", "serp", "traffic", "google"],
  "email-marketing": ["email", "newsletter", "broadcast", "deliverability", "subscriber", "mail"],
  "course-platforms": ["course", "lms", "student", "curriculum", "lecture", "academy", "training"],
  "managed-hosting": ["hosting", "server", "cloud", "wordpress", "vps", "uptime", "deploy"],
  "cybersecurity": ["security", "firewall", "antivirus", "malware", "vault", "vpn", "compliance", "threat"],
};

export function inferCategoryId(name: string, description: string): string | null {
  const combined = `${name} ${description}`.toLowerCase();
  let bestCategory: string | null = null;
  let highestScore = 0;

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        score++;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestCategory = catId;
    }
  }

  return bestCategory;
}

/**
 * Normalizes raw affiliate product payload into standard ProductImportCandidate.
 */
export function normalizeCandidate(payload: RawProductPayload): ProductImportCandidate {
  const retrievedAt = new Date().toISOString();
  const warnings: string[] = [];
  const provenance: Record<string, ProvenanceRecord> = {};

  const recordProvenance = (field: string) => {
    provenance[field] = {
      sourceUrl: payload.sourceUrl,
      retrievedAt,
    };
  };

  // Name sanitization
  const nameSanitized = sanitizeText(payload.name || "Untitled Software");
  if (nameSanitized.hadHtml) {
    warnings.push("Sanitized HTML tags from product name.");
  }
  const name = nameSanitized.text || "Untitled Software";
  recordProvenance("name");

  // Slug generation
  const slug = slugify(payload.slug || name);
  recordProvenance("slug");

  // Summary / Description sanitization
  const descSanitized = sanitizeText(payload.description || "");
  if (descSanitized.hadHtml) {
    warnings.push("Sanitized HTML tags from product description.");
  }
  let summary = descSanitized.text;
  if (!summary) {
    summary = `${name} business software platform.`;
    warnings.push("Summary was missing and was automatically generated from product name.");
  }
  if (summary.length > 280) {
    summary = `${summary.slice(0, 277)}...`;
  }
  recordProvenance("summary");

  // Merchant name & domain
  const merchantNameSanitized = sanitizeText(payload.merchantName || name);
  const merchantName = merchantNameSanitized.text || name;
  recordProvenance("merchantName");

  let merchantDomain = "";
  try {
    const destUrl = payload.destinationUrl || payload.canonicalUrl || payload.sourceUrl;
    merchantDomain = new URL(destUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    merchantDomain = "merchant.example";
    warnings.push("Could not determine merchant domain from destination URL.");
  }
  recordProvenance("merchantDomain");

  // Canonical URL & Destination URL
  let canonicalUrl = payload.canonicalUrl || payload.sourceUrl;
  try {
    const parsed = new URL(canonicalUrl);
    parsed.hash = ""; // strip fragments
    canonicalUrl = parsed.href;
  } catch {
    warnings.push("Canonical URL could not be cleanly parsed.");
  }
  recordProvenance("canonicalUrl");

  const destinationUrl = payload.destinationUrl || canonicalUrl;
  recordProvenance("destinationUrl");

  const affiliateUrl = payload.affiliateUrl || payload.sourceUrl;
  recordProvenance("affiliateUrl");

  const officialSource = payload.officialSource || destinationUrl;
  recordProvenance("officialSource");

  // Category inference
  let categoryId = payload.categoryId ?? null;
  if (!categoryId) {
    categoryId = inferCategoryId(name, summary);
    if (categoryId) {
      warnings.push(`Category inferred as "${categoryId}" based on product text.`);
    } else {
      warnings.push("Category could not be inferred automatically; manual assignment required.");
    }
  }
  recordProvenance("categoryId");

  // Price & Currency
  let price: string | null = null;
  if (payload.price !== undefined && payload.price !== null) {
    const rawPrice = String(payload.price).replace(/[^0-9.]/g, "");
    if (rawPrice && !isNaN(Number(rawPrice))) {
      price = Number(rawPrice).toFixed(2);
    }
  }
  if (!price) {
    warnings.push("Price information was not provided by the source.");
  }
  recordProvenance("price");

  const currency = payload.currency || "USD";
  recordProvenance("currency");

  // Intended user and workflow
  const intendedUserSanitized = sanitizeText(payload.intendedUser || "Business operators and teams");
  const intendedUser = intendedUserSanitized.text || "Business operators and teams";
  recordProvenance("intendedUser");

  const intendedWorkflowSanitized = sanitizeText(payload.intendedWorkflow || "Operational software workflow");
  const intendedWorkflow = intendedWorkflowSanitized.text || "Operational software workflow";
  recordProvenance("intendedWorkflow");

  // External product ID
  const externalProductId = payload.externalProductId || null;
  recordProvenance("externalProductId");

  // Image URL
  const imageUrl = payload.imageUrl || null;
  recordProvenance("imageUrl");

  return {
    sourceId: payload.sourceId,
    canonicalUrl,
    externalProductId,
    name,
    slug,
    categoryId,
    merchantName,
    merchantDomain,
    officialSource,
    summary,
    intendedUser,
    intendedWorkflow,
    price,
    currency,
    affiliateUrl,
    destinationUrl,
    imageUrl,
    retrievedAt,
    warnings,
    provenance,
  };
}
