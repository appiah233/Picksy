import crypto from "node:crypto";
import type { ImportDraft, ProductImportCandidate } from "../importer-types.ts";

export interface UpdateDraftResult {
  ok: boolean;
  draft?: ImportDraft;
  code?: "CONFLICT" | "NOT_FOUND";
  message?: string;
}

export interface ImportDraftStore {
  createDraft(
    candidate: ProductImportCandidate,
    edits?: Partial<ProductImportCandidate>
  ): Promise<{ draft: ImportDraft; isExisting: boolean }>;
  getDraft(id: string): Promise<ImportDraft | null>;
  findDraftBySourceUrl(sourceId: string, canonicalUrl: string): Promise<ImportDraft | null>;
  findDraftByExternalId(sourceId: string, externalProductId: string): Promise<ImportDraft | null>;
  updateDraft(
    id: string,
    edits: Partial<ProductImportCandidate>,
    expectedVersion: number
  ): Promise<UpdateDraftResult>;
  listDrafts(filter?: { state?: "draft" | "published"; sourceId?: string }): Promise<ImportDraft[]>;
  deleteDraft(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

export class MemoryDraftStore implements ImportDraftStore {
  private drafts = new Map<string, ImportDraft>();

  async createDraft(
    candidate: ProductImportCandidate,
    edits: Partial<ProductImportCandidate> = {}
  ): Promise<{ draft: ImportDraft; isExisting: boolean }> {
    // Check if draft already exists with exact same (sourceId, canonicalUrl)
    const existing = await this.findDraftBySourceUrl(candidate.sourceId, candidate.canonicalUrl);
    if (existing) {
      return { draft: existing, isExisting: true };
    }

    const now = new Date().toISOString();
    const id = `draft_${crypto.randomUUID().slice(0, 12)}`;

    const newDraft: ImportDraft = {
      id,
      sourceId: candidate.sourceId,
      canonicalUrl: candidate.canonicalUrl,
      externalProductId: candidate.externalProductId,
      state: "draft",
      candidate,
      edits,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.drafts.set(id, newDraft);
    return { draft: newDraft, isExisting: false };
  }

  async getDraft(id: string): Promise<ImportDraft | null> {
    const draft = this.drafts.get(id);
    return draft ? { ...draft } : null;
  }

  async findDraftBySourceUrl(sourceId: string, canonicalUrl: string): Promise<ImportDraft | null> {
    const cleanUrl = canonicalUrl.replace(/\/$/, "").toLowerCase();
    for (const draft of this.drafts.values()) {
      if (
        draft.sourceId === sourceId &&
        draft.canonicalUrl.replace(/\/$/, "").toLowerCase() === cleanUrl
      ) {
        return { ...draft };
      }
    }
    return null;
  }

  async findDraftByExternalId(sourceId: string, externalProductId: string): Promise<ImportDraft | null> {
    for (const draft of this.drafts.values()) {
      if (draft.sourceId === sourceId && draft.externalProductId === externalProductId) {
        return { ...draft };
      }
    }
    return null;
  }

  async updateDraft(
    id: string,
    edits: Partial<ProductImportCandidate>,
    expectedVersion: number
  ): Promise<UpdateDraftResult> {
    const draft = this.drafts.get(id);
    if (!draft) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: `Draft with ID "${id}" was not found.`,
      };
    }

    // Optimistic Concurrency Control
    if (draft.version !== expectedVersion) {
      return {
        ok: false,
        code: "CONFLICT",
        message: `Version conflict: Draft has been modified (current version: ${draft.version}, expected: ${expectedVersion}). Please refresh and reapply your changes.`,
      };
    }

    const updated: ImportDraft = {
      ...draft,
      edits: {
        ...draft.edits,
        ...edits,
      },
      version: draft.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.drafts.set(id, updated);
    return { ok: true, draft: { ...updated } };
  }

  async listDrafts(filter?: { state?: "draft" | "published"; sourceId?: string }): Promise<ImportDraft[]> {
    let list = Array.from(this.drafts.values());
    if (filter?.state) {
      list = list.filter((d) => d.state === filter.state);
    }
    if (filter?.sourceId) {
      list = list.filter((d) => d.sourceId === filter.sourceId);
    }
    // Return newest first
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((d) => ({ ...d }));
  }

  async deleteDraft(id: string): Promise<boolean> {
    return this.drafts.delete(id);
  }

  async clear(): Promise<void> {
    this.drafts.clear();
  }
}

// Global runtime draft store instance
export const draftStore = new MemoryDraftStore();
