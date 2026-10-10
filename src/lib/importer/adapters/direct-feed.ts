import type { AffiliateSourceAdapter, RawProductPayload } from "./types.ts";

export const DIRECT_FEED_APPROVED_HOSTS = [
  "feeds.picksy.dev",
  "cdn.picksy.dev",
  "feed.example.com",
  "merchant.example",
  "seranking.com",
  "gohighlevel.com",
  "systeme.io",
] as const;

export class DirectFeedAdapter implements AffiliateSourceAdapter {
  readonly sourceId = "direct-feed" as const;
  readonly approvedHosts = DIRECT_FEED_APPROVED_HOSTS;

  async fetchCandidate(
    url: string,
    options?: {
      credentials?: Record<string, string>;
      mockData?: Partial<RawProductPayload>;
    }
  ): Promise<RawProductPayload> {
    if (options?.mockData) {
      return {
        sourceId: this.sourceId,
        sourceUrl: url,
        canonicalUrl: options.mockData.canonicalUrl ?? url,
        externalProductId: options.mockData.externalProductId ?? "feed-item-1",
        name: options.mockData.name ?? "Direct Feed SaaS",
        description: options.mockData.description ?? "Product imported via direct structured merchant feed.",
        price: options.mockData.price ?? "29.00",
        currency: options.mockData.currency ?? "USD",
        categoryId: options.mockData.categoryId ?? null,
        merchantName: options.mockData.merchantName ?? "Direct Feed Merchant",
        merchantDomain: options.mockData.merchantDomain ?? "merchant.example",
        officialSource: options.mockData.officialSource ?? "https://merchant.example",
        affiliateUrl: options.mockData.affiliateUrl ?? url,
        destinationUrl: options.mockData.destinationUrl ?? "https://merchant.example",
        imageUrl: options.mockData.imageUrl ?? null,
        intendedUser: options.mockData.intendedUser ?? "Direct business operators",
        intendedWorkflow: options.mockData.intendedWorkflow ?? "Core operational software workflow",
        rawAttributes: options.mockData.rawAttributes ?? {},
      };
    }

    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    const cleanName = domain.split(".")[0];
    const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    return {
      sourceId: this.sourceId,
      sourceUrl: url,
      canonicalUrl: `${parsed.origin}${parsed.pathname}`,
      externalProductId: parsed.searchParams.get("item") ?? cleanName,
      name: `${capitalized} Platform`,
      description: `Official direct catalog listing for ${capitalized}.`,
      price: null,
      currency: "USD",
      categoryId: null,
      merchantName: capitalized,
      merchantDomain: domain,
      officialSource: parsed.origin,
      affiliateUrl: url,
      destinationUrl: parsed.origin,
      imageUrl: null,
      intendedUser: "Professionals and enterprise teams",
      intendedWorkflow: "Cloud productivity and execution",
      rawAttributes: {
        feedSource: url,
        importedAt: new Date().toISOString(),
      },
    };
  }
}
