/**
 * Frontend types for Picksy Admin Product Importer
 * Owned by Gemini (Frontend & Design Owner)
 */

import type {
  ProductImportCandidate,
  DuplicateCheckResult,
  ImportDraft,
  EditorialReviewInput,
  ImporterErrorCode,
} from "@/lib/importer-types";

export type ImporterViewMode =
  | "idle"
  | "fetching"
  | "preview"
  | "saving"
  | "saved"
  | "publishing"
  | "published"
  | "error";

export type ImporterProgressStep = "validating" | "fetching" | "normalizing";

/**
 * The 20 formal states of the Picksy Affiliate Product Importer
 */
export type ImporterStateName =
  | "IDLE"
  | "VALIDATING URL"
  | "FETCHING AUTHORIZED SOURCE"
  | "NORMALIZING"
  | "DUPLICATE DETECTED"
  | "CANDIDATE READY"
  | "EDITING"
  | "SAVING DRAFT"
  | "DRAFT SAVED"
  | "SAVE FAILURE"
  | "UNAUTHORIZED SOURCE"
  | "INVALID URL"
  | "SOURCE UNAVAILABLE"
  | "VALIDATION FAILURE"
  | "CONFLICT"
  | "RATE LIMITED"
  | "READY FOR REVIEW"
  | "PUBLISHING"
  | "PUBLISHED"
  | "PUBLICATION FAILURE";

export interface ImporterFormState {
  sourceId: string;
  productUrl: string;
}

export interface CandidateFormState {
  name: string;
  slug: string;
  categoryId: string;
  summary: string;
  intendedUser: string;
  intendedWorkflow: string;
  price: string;
  currency: string;
  officialSource: string;
  destinationUrl: string;
  offerLabel: string;
  disclosure: string;
}

export interface EditorialReviewFormState extends EditorialReviewInput {
  confirmed: boolean;
}

export interface ImporterUiState {
  mode: ImporterViewMode;
  progressStep: ImporterProgressStep | null;
  form: ImporterFormState;
  previewToken: string | null;
  candidate: ProductImportCandidate | null;
  duplicate: DuplicateCheckResult | null;
  draft: ImportDraft | null;
  activeDraftId: string | null;
  activeDraftVersion: number;
  publishedProductId: string | null;
  errorMessage: string | null;
  errorCode: ImporterErrorCode | null;
  errorField: string | null;
  isPublishModalOpen: boolean;
  isEditing: boolean;
  lastActionContext: "ingest" | "save" | "publish" | null;
}

/**
 * Canonical initial UI state for Picksy Product Importer
 */
export const INITIAL_IMPORTER_UI_STATE: ImporterUiState = {
  mode: "idle",
  progressStep: null,
  form: { sourceId: "partnerstack", productUrl: "" },
  previewToken: null,
  candidate: null,
  duplicate: null,
  draft: null,
  activeDraftId: null,
  activeDraftVersion: 1,
  publishedProductId: null,
  errorMessage: null,
  errorCode: null,
  errorField: null,
  isPublishModalOpen: false,
  isEditing: false,
  lastActionContext: null,
};

/**
 * Computes the active formal state among the 20 required importer states
 */
export function getActiveImporterState(state: ImporterUiState): ImporterStateName {
  if (state.mode === "published") return "PUBLISHED";
  if (state.mode === "publishing") return "PUBLISHING";
  if (state.isPublishModalOpen) return "READY FOR REVIEW";

  if (state.mode === "error") {
    if (state.lastActionContext === "publish") return "PUBLICATION FAILURE";
    if (state.lastActionContext === "save") return "SAVE FAILURE";
    if (state.errorCode === "SOURCE_NOT_AUTHORIZED") return "UNAUTHORIZED SOURCE";
    if (state.errorCode === "INVALID_URL") return "INVALID URL";
    if (state.errorCode === "SOURCE_UNAVAILABLE") return "SOURCE UNAVAILABLE";
    if (state.errorCode === "CONFLICT") return "CONFLICT";
    if (state.errorCode === "RATE_LIMITED") return "RATE LIMITED";
    if (state.errorCode === "VALIDATION_FAILED") return "VALIDATION FAILURE";
    return "SOURCE UNAVAILABLE";
  }

  if (state.mode === "saving") return "SAVING DRAFT";
  if (state.mode === "saved") return "DRAFT SAVED";

  if (state.mode === "fetching") {
    if (state.progressStep === "validating") return "VALIDATING URL";
    if (state.progressStep === "normalizing") return "NORMALIZING";
    return "FETCHING AUTHORIZED SOURCE";
  }

  if (state.duplicate?.isDuplicate) return "DUPLICATE DETECTED";

  if (state.candidate) {
    if (state.isEditing) return "EDITING";
    return "CANDIDATE READY";
  }

  return "IDLE";
}
