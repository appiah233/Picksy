import type { ImportDraft, ProductImportCandidate } from "./importer-types.ts";
import type { ImportDraftStore, UpdateDraftResult } from "./importer/draft-store.ts";
import { SanityClient, SanityHttpError, sanityClient } from "./sanity-client.ts";

interface SanityImportDraftDoc {
  _id?: string;
  _rev?: string;
  _type: "importDraft";
  _createdAt?: string;
  _updatedAt?: string;
  sourceId: string;
  canonicalUrl: string;
  externalProductId?: string | null;
  candidateJson: string;
  editedCandidateJson?: string;
  importStatus: "draft" | "instantiated" | "rejected";
  version: number;
}

export class SanityDraftStore implements ImportDraftStore {
  private client: SanityClient;

  constructor(client: SanityClient = sanityClient) {
    this.client = client;
  }

  async createDraft(
    candidate: ProductImportCandidate,
    edits: Partial<ProductImportCandidate> = {}
  ): Promise<{ draft: ImportDraft; isExisting: boolean }> {
    if (!validCandidateFields(candidate, false) || !validCandidateFields(edits, true)) {
      throw new Error("Invalid import draft payload.");
    }
    // Advisory duplicate lookup only; distributed uniqueness remains a production gate.
    // 1. Check if draft already exists with exact same sourceId and canonicalUrl
    const existing = await this.findDraftBySourceUrl(candidate.sourceId, candidate.canonicalUrl);
    if (existing) {
      return { draft: existing, isExisting: true };
    }

    const now = new Date().toISOString();

    const doc: SanityImportDraftDoc = {
      _type: "importDraft",
      sourceId: candidate.sourceId,
      canonicalUrl: candidate.canonicalUrl,
      externalProductId: candidate.externalProductId ?? null,
      candidateJson: JSON.stringify(candidate),
      editedCandidateJson: JSON.stringify(edits),
      importStatus: "draft",
      version: 1,
    };

    const mutation = await this.client.mutate([
      { create: doc as unknown as Record<string, unknown> },
    ]);
    const draftId = mutation.results[0]?.id;
    if (!draftId || mutation.results.length !== 1 || mutation.results[0].operation !== "create") {
      throw new Error("Sanity did not return the generated import draft ID.");
    }

    const draft: ImportDraft = {
      id: draftId,
      sourceId: candidate.sourceId,
      canonicalUrl: candidate.canonicalUrl,
      externalProductId: candidate.externalProductId ?? null,
      state: "draft",
      candidate,
      edits,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return { draft, isExisting: false };
  }

  async getDraft(id: string): Promise<ImportDraft | null> {
    const doc = await this.getDraftDocument(id);
    if (!doc) return null;
    return this.mapDocToDraft(doc);
  }

  async findDraftBySourceUrl(sourceId: string, canonicalUrl: string): Promise<ImportDraft | null> {
    const cleanUrl = canonicalUrl.replace(/\/$/, "");
    const doc = await this.client.query<SanityImportDraftDoc | null>(
      `*[_type == "importDraft" && sourceId == $sourceId && canonicalUrl in [$cleanUrl, $rawUrl]][0]`,
      { sourceId, cleanUrl, rawUrl: canonicalUrl },
      "raw"
    );
    if (!doc) return null;
    return this.mapDocToDraft(doc);
  }

  async findDraftByExternalId(sourceId: string, externalProductId: string): Promise<ImportDraft | null> {
    const doc = await this.client.query<SanityImportDraftDoc | null>(
      `*[_type == "importDraft" && sourceId == $sourceId && externalProductId == $externalProductId][0]`,
      { sourceId, externalProductId },
      "raw"
    );
    if (!doc) return null;
    return this.mapDocToDraft(doc);
  }

  async updateDraft(
    id: string,
    edits: Partial<ProductImportCandidate>,
    expectedVersion: number
  ): Promise<UpdateDraftResult> {
    const currentDoc = await this.getDraftDocument(id);
    if (!currentDoc) {
      return { ok: false, code: "NOT_FOUND", message: `Draft "${id}" not found in Sanity.` };
    }
    const current = this.mapDocToDraft(currentDoc);
    if (current.id !== id || typeof currentDoc._rev !== "string" || !currentDoc._rev.trim()) {
      throw new Error("Invalid Sanity import draft revision or identity.");
    }
    if (!validCandidateFields(edits, true)) throw new Error("Invalid import draft edits.");

    if (current.version !== expectedVersion) {
      return {
        ok: false,
        code: "CONFLICT",
        message: `Version conflict: Draft is at version ${current.version}, expected ${expectedVersion}.`,
      };
    }

    const mergedEdits = { ...current.edits, ...edits };
    const nextVersion = current.version + 1;

    try {
      const result = await this.client.mutate([
        {
          patch: {
            id,
            ifRevisionID: currentDoc._rev,
            set: {
              editedCandidateJson: JSON.stringify(mergedEdits),
              version: nextVersion,
            },
          },
        },
      ]);
      if (result.results.length !== 1 || result.results[0].id !== id || result.results[0].operation !== "update") {
        throw new Error("Sanity did not acknowledge the import draft update.");
      }
    } catch (error) {
      if (error instanceof SanityHttpError && error.status === 409) {
        return {
          ok: false,
          code: "CONFLICT",
          message: "Draft changed while saving. Refresh and reapply your changes.",
        };
      }
      throw error;
    }

    const updatedDraft: ImportDraft = {
      ...current,
      edits: mergedEdits,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    return { ok: true, draft: updatedDraft };
  }

  async listDrafts(filter?: { state?: "draft" | "published"; sourceId?: string }): Promise<ImportDraft[]> {
    let query = `*[_type == "importDraft"`;
    const params: Record<string, unknown> = {};

    if (filter?.sourceId) {
      query += ` && sourceId == $sourceId`;
      params.sourceId = filter.sourceId;
    }
    if (filter?.state === "published") {
      query += ` && importStatus == "instantiated"`;
    } else if (filter?.state === "draft") {
      query += ` && importStatus == "draft"`;
    }

    query += `] | order(_createdAt desc)`;

    const docs = await this.client.query<SanityImportDraftDoc[]>(query, params, "raw");
    if (!Array.isArray(docs)) throw new Error("Invalid Sanity import draft list.");
    return docs.map((doc) => this.mapDocToDraft(doc));
  }

  async deleteDraft(id: string): Promise<boolean> {
    try {
      await this.client.mutate([{ delete: { id } }]);
      return true;
    } catch (error) {
      if (error instanceof SanityHttpError && error.status === 404) return false;
      throw error;
    }
  }

  async clear(): Promise<void> {
    const docs = await this.client.query<Array<{ _id: string }>>(
      `*[_type == "importDraft"]{ _id }`,
      {},
      "raw"
    );
    if (docs && docs.length > 0) {
      await this.client.mutate(docs.map((d) => ({ delete: { id: d._id } })));
    }
  }

  private mapDocToDraft(doc: SanityImportDraftDoc): ImportDraft {
    if (!doc || typeof doc !== "object" || doc._type !== "importDraft" ||
      typeof doc._id !== "string" || !doc._id.trim() ||
      !Number.isSafeInteger(doc.version) || doc.version < 1 ||
      doc.version >= Number.MAX_SAFE_INTEGER ||
      !["draft", "instantiated", "rejected"].includes(doc.importStatus) ||
      typeof doc.sourceId !== "string" || typeof doc.canonicalUrl !== "string" ||
      typeof doc._createdAt !== "string" || !Number.isFinite(Date.parse(doc._createdAt))) {
      throw new Error("Invalid Sanity import draft metadata.");
    }
    let candidate: ProductImportCandidate;
    let edits: Partial<ProductImportCandidate>;
    try {
      const parsed: unknown = JSON.parse(doc.candidateJson);
      const parsedEdits: unknown = doc.editedCandidateJson === undefined ? {} : JSON.parse(doc.editedCandidateJson);
      if (!validCandidateFields(parsed, false) || !validCandidateFields(parsedEdits, true)) {
        throw new Error("Invalid payload");
      }
      candidate = parsed as ProductImportCandidate;
      edits = parsedEdits as Partial<ProductImportCandidate>;
      if (candidate.sourceId !== doc.sourceId || candidate.canonicalUrl !== doc.canonicalUrl ||
          candidate.externalProductId !== (doc.externalProductId ?? null)) throw new Error("Identity mismatch");
    } catch {
      throw new Error("Invalid Sanity import draft payload.");
    }

    return {
      id: doc._id!,
      sourceId: doc.sourceId,
      canonicalUrl: doc.canonicalUrl,
      externalProductId: doc.externalProductId ?? null,
      state: doc.importStatus === "instantiated" ? "published" : "draft",
      candidate,
      edits,
      version: doc.version,
      createdAt: doc._createdAt || new Date().toISOString(),
      updatedAt: doc._updatedAt || new Date().toISOString(),
    };
  }

  private async getDraftDocument(id: string): Promise<SanityImportDraftDoc | null> {
    return this.client.query<SanityImportDraftDoc | null>(
      `*[_type == "importDraft" && _id == $id][0]`,
      { id },
      "raw"
    );
  }
}

// Validate the frozen candidate shape without inventing missing source information.
function validCandidateFields(value: unknown, partial: boolean): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fields = value as Record<string, unknown>;
  const strings = ["sourceId", "canonicalUrl", "name", "slug", "merchantName", "merchantDomain",
    "officialSource", "summary", "intendedUser", "intendedWorkflow", "affiliateUrl", "destinationUrl", "retrievedAt"];
  const nullable = ["externalProductId", "categoryId", "price", "currency", "imageUrl"];
  for (const key of strings) {
    if (partial && !(key in fields)) continue;
    if (typeof fields[key] !== "string") return false;
  }
  for (const key of nullable) {
    if (partial && !(key in fields)) continue;
    if (fields[key] !== null && typeof fields[key] !== "string") return false;
  }
  if (!partial || "warnings" in fields) {
    if (!Array.isArray(fields.warnings) || !fields.warnings.every(item => typeof item === "string")) return false;
  }
  if (!partial || "provenance" in fields) {
    if (!fields.provenance || typeof fields.provenance !== "object" || Array.isArray(fields.provenance)) return false;
    for (const entry of Object.values(fields.provenance)) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
          typeof entry.sourceUrl !== "string" || typeof entry.retrievedAt !== "string") return false;
    }
  }
  return Object.keys(fields).every(key => [...strings, ...nullable, "warnings", "provenance"].includes(key));
}
