import type { AffiliateSourceAdapter, RawProductPayload } from "./types.ts";

export const PARTNERSTACK_APPROVED_HOSTS = [
  "partnerstack.com",
  "app.partnerstack.com",
  "dash.partnerstack.com",
  "api.partnerstack.com",
] as const;

export class PartnerStackAdapter implements AffiliateSourceAdapter {
  readonly sourceId = "partnerstack" as const;
  readonly approvedHosts = PARTNERSTACK_APPROVED_HOSTS;

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
        externalProductId: options.mockData.externalProductId ?? this.extractProgramKey(url),
        name: options.mockData.name ?? "PartnerStack Software Item",
        description: options.mockData.description ?? "Product verified via PartnerStack program.",
        price: options.mockData.price ?? "97.00",
        currency: options.mockData.currency ?? "USD",
        categoryId: options.mockData.categoryId ?? null,
        merchantName: options.mockData.merchantName ?? "PartnerStack Vendor",
        merchantDomain: options.mockData.merchantDomain ?? "vendor.example",
        officialSource: options.mockData.officialSource ?? "https://vendor.example",
        affiliateUrl: options.mockData.affiliateUrl ?? url,
        destinationUrl: options.mockData.destinationUrl ?? "https://vendor.example/signup",
        imageUrl: options.mockData.imageUrl ?? null,
        intendedUser: options.mockData.intendedUser ?? "Agencies and Growth Marketers",
        intendedWorkflow: options.mockData.intendedWorkflow ?? "Partner relationship management and revenue attribution",
        rawAttributes: options.mockData.rawAttributes ?? {},
      };
    }

    const parsed = new URL(url);
    const programKey = this.extractProgramKey(url) ?? "saas-tool";

    return {
      sourceId: this.sourceId,
      sourceUrl: url,
      canonicalUrl: `${parsed.origin}${parsed.pathname}`,
      externalProductId: programKey,
      name: `PartnerStack Program ${programKey}`,
      description: "PartnerStack ecosystem SaaS listing.",
      price: null,
      currency: "USD",
      categoryId: null,
      merchantName: programKey,
      merchantDomain: `${programKey}.com`,
      officialSource: `https://${programKey}.com`,
      affiliateUrl: url,
      destinationUrl: `https://${programKey}.com`,
      imageUrl: null,
      intendedUser: "SaaS operations teams",
      intendedWorkflow: "Channel distribution and customer acquisition",
      rawAttributes: {
        rawUrl: url,
        programKey,
      },
    };
  }

  private extractProgramKey(url: string): string | null {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split("/").filter(Boolean);
      const progIdx = segments.findIndex((s) => s.toLowerCase() === "programs" || s.toLowerCase() === "p");
      if (progIdx !== -1 && segments[progIdx + 1]) {
        return segments[progIdx + 1];
      }
      return segments[segments.length - 1] ?? null;
    } catch {
      return null;
    }
  }
}
