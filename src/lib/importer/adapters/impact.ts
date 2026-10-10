import type { AffiliateSourceAdapter, RawProductPayload } from "./types.ts";

export const IMPACT_APPROVED_HOSTS = [
  "impact.com",
  "api.impact.com",
  "app.impact.com",
  "member.impact.com",
  "irmp.com",
] as const;

export class ImpactAdapter implements AffiliateSourceAdapter {
  readonly sourceId = "impact" as const;
  readonly approvedHosts = IMPACT_APPROVED_HOSTS;

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
        externalProductId: options.mockData.externalProductId ?? this.extractProductIdFromUrl(url),
        name: options.mockData.name ?? "Impact Imported Software",
        description: options.mockData.description ?? "Imported SaaS product via Impact partner network.",
        price: options.mockData.price ?? "49.00",
        currency: options.mockData.currency ?? "USD",
        categoryId: options.mockData.categoryId ?? null,
        merchantName: options.mockData.merchantName ?? "Impact Merchant",
        merchantDomain: options.mockData.merchantDomain ?? "merchant.example",
        officialSource: options.mockData.officialSource ?? "https://merchant.example",
        affiliateUrl: options.mockData.affiliateUrl ?? url,
        destinationUrl: options.mockData.destinationUrl ?? "https://merchant.example/offer",
        imageUrl: options.mockData.imageUrl ?? null,
        intendedUser: options.mockData.intendedUser ?? "B2B Marketing & Sales Teams",
        intendedWorkflow: options.mockData.intendedWorkflow ?? "Automated campaign and affiliate workflow management.",
        rawAttributes: options.mockData.rawAttributes ?? {},
      };
    }

    const parsed = new URL(url);
    const productId = this.extractProductIdFromUrl(url);
    const merchantSlug = parsed.searchParams.get("merchant") ?? "impact-merchant";

    return {
      sourceId: this.sourceId,
      sourceUrl: url,
      canonicalUrl: `${parsed.origin}${parsed.pathname}`,
      externalProductId: productId,
      name: `Impact Product ${productId ?? "Catalog Item"}`,
      description: "Extracted software listing from Impact Radius catalog.",
      price: null,
      currency: "USD",
      categoryId: null,
      merchantName: merchantSlug,
      merchantDomain: `${merchantSlug}.com`,
      officialSource: `https://${merchantSlug}.com`,
      affiliateUrl: url,
      destinationUrl: `https://${merchantSlug}.com/product/${productId ?? ""}`,
      imageUrl: null,
      intendedUser: "Digital marketers and growth teams",
      intendedWorkflow: "Campaign orchestration and lead management",
      rawAttributes: {
        rawUrl: url,
        hostname: parsed.hostname,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  private extractProductIdFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      const queryId = parsed.searchParams.get("productId") ?? parsed.searchParams.get("id");
      if (queryId) return queryId;

      const segments = parsed.pathname.split("/").filter(Boolean);
      const prodIdx = segments.findIndex((s) => s.toLowerCase() === "products" || s.toLowerCase() === "catalog");
      if (prodIdx !== -1 && segments[prodIdx + 1]) {
        return segments[prodIdx + 1];
      }

      return segments[segments.length - 1] ?? null;
    } catch {
      return null;
    }
  }
}
