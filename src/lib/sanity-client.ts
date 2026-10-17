/** Server transport: never import this module into browser-executed code. */
export interface SanityConfig {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  revalidate?: number;
}

export const DEFAULT_PUBLIC_SANITY_CONFIG: SanityConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "0tozsrrx",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || process.env.SANITY_API_VERSION || "v2024-01-01",
  token: undefined, // Public reads NEVER carry a write token
  revalidate: 60, // 60-second ISR for public storefront queries
};

export const DEFAULT_SANITY_CONFIG: SanityConfig = {
  projectId: process.env.SANITY_PROJECT_ID || "0tozsrrx",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: process.env.SANITY_API_VERSION || "v2024-01-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
};

export type SanityMutation =
  | { create: Record<string, unknown> }
  | { createOrReplace: Record<string, unknown> }
  | { patch: { id: string; set?: Record<string, unknown>; inc?: Record<string, number>; ifRevisionID?: string } }
  | { delete: { id: string } };
export interface SanityMutationResponse { results: Array<{ id: string; operation: string }>; }
export type SanityPerspective = "published" | "raw" | "drafts";
export interface SanityQueryResponse<T> { result: T; ms: number; }

export class SanityHttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Sanity request failed (${status}).`);
    this.name = "SanityHttpError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class SanityClient {
  private config: SanityConfig;
  private fetch: typeof fetch;
  constructor(config: Partial<SanityConfig> = {}) {
    this.config = { ...DEFAULT_SANITY_CONFIG, ...config };
    const { projectId, dataset, apiVersion, timeoutMs = 10_000 } = this.config;
    // Restrict authority and path components before attaching any credential.
    if (!/^[a-z0-9]+$/.test(projectId) || !/^[a-z0-9_-]{1,64}$/.test(dataset) ||
        !/^v\d{4}-\d{2}-\d{2}$/.test(apiVersion) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
      throw new Error("Invalid Sanity configuration.");
    }
    this.fetch = config.fetchFn ?? globalThis.fetch;
  }
  get baseUrl(): string {
    return `https://${this.config.projectId}.api.sanity.io/${this.config.apiVersion}`;
  }

  private async request(url: string, options: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10_000);
    try {
      const fetchOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
        ...options,
        redirect: "error",
        signal: controller.signal,
      };
      if (typeof this.config.revalidate === "number" && this.config.revalidate > 0) {
        fetchOptions.next = { revalidate: this.config.revalidate, tags: ["catalog"] };
      } else {
        fetchOptions.cache = "no-store";
      }
      const response = await this.fetch(url, fetchOptions);
      if (!response.ok) throw new SanityHttpError(response.status);
      return await response.json();
    } catch (error) {
      if (error instanceof SanityHttpError) throw error;
      // Remote response bodies and network messages may contain credentials or data.
      throw new Error("Sanity request could not be completed.");
    } finally {
      clearTimeout(deadline);
    }
  }

  async query<T>(groqQuery: string, params: Record<string, unknown> = {}, perspective: SanityPerspective = "published"): Promise<T> {
    const { dataset, token } = this.config;
    const url = new URL(`${this.baseUrl}/data/query/${dataset}`);
    url.searchParams.set("query", groqQuery);
    url.searchParams.set("perspective", perspective);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(`$${key}`, JSON.stringify(value));
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const data = await this.request(url.toString(), { method: "GET", headers });
    if (!isRecord(data) || !Object.hasOwn(data, "result") || data.result === undefined) {
      throw new Error("Sanity returned an invalid query response.");
    }
    return data.result as T;
  }

  async mutate(mutations: SanityMutation[]): Promise<SanityMutationResponse> {
    const { dataset, token } = this.config;
    if (!token?.trim()) throw new Error("SANITY_API_WRITE_TOKEN is required for Content Lake mutations. Public read client cannot perform mutations.");
    const data = await this.request(`${this.baseUrl}/data/mutate/${dataset}?returnIds=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations }),
    });
    if (!isRecord(data) || !Array.isArray(data.results) || data.results.length !== mutations.length ||
        !data.results.every(result => isRecord(result) && typeof result.id === "string" && result.id.length > 0 &&
          typeof result.operation === "string" && ["create", "update", "delete", "none"].includes(result.operation))) {
      throw new Error("Sanity returned an invalid mutation response.");
    }
    return data as unknown as SanityMutationResponse;
  }
}
export const publicSanityClient = new SanityClient(DEFAULT_PUBLIC_SANITY_CONFIG);
export const sanityClient = new SanityClient();

export function createPublicSanityClient(config: Partial<SanityConfig> = {}): SanityClient {
  return new SanityClient({ ...DEFAULT_PUBLIC_SANITY_CONFIG, ...config, token: undefined });
}
