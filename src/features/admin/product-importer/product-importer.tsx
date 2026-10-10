"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Activity,
} from "lucide-react";
import type {
  ProductImportCandidate,
  ImportDraft,
  EditorialReviewInput,
  ImporterErrorCode,
  ImportPreviewResponse,
  ApiErrorResponse,
} from "@/lib/importer-types";
import {
  type ImporterUiState,
  type ImporterFormState,
  type ImporterStateName,
  getActiveImporterState,
  INITIAL_IMPORTER_UI_STATE,
} from "./types";
import { UrlIngestionForm } from "./url-ingestion-form";
import { ImporterProgress } from "./importer-progress";
import { DuplicateAlert } from "./duplicate-alert";
import { CandidateEditor } from "./candidate-editor";
import { PublicationModal } from "./publication-modal";

const ERROR_DESCRIPTIONS: Record<ImporterErrorCode, { title: string; hint: string }> = {
  INVALID_URL: {
    title: "Invalid Destination URL",
    hint: "Ensure the URL is a reachable, valid HTTPS web address. Localhost, private RFC1918 IPs, and nonstandard ports are rejected.",
  },
  SOURCE_NOT_AUTHORIZED: {
    title: "Source Network Not Authorized",
    hint: "This affiliate network or merchant hostname is not configured or lacks written partnership authorization.",
  },
  SOURCE_UNAVAILABLE: {
    title: "Affiliate Service Unavailable",
    hint: "The remote affiliate network or feed timed out. Please verify provider connectivity and retry.",
  },
  DUPLICATE: {
    title: "Existing Product Detected",
    hint: "A draft or published product with this destination or external identifier already exists.",
  },
  VALIDATION_FAILED: {
    title: "Catalog Validation Error",
    hint: "One or more required fields do not satisfy catalog editorial invariants.",
  },
  CONFLICT: {
    title: "Concurrency Conflict",
    hint: "This draft has been modified by another session. Please reload to review the latest changes.",
  },
  RATE_LIMITED: {
    title: "Rate Limit Exceeded",
    hint: "Too many import requests have been dispatched recently. Please wait a moment before trying again.",
  },
  UNAUTHORIZED: {
    title: "Authentication Required",
    hint: "Please log in with an administrator account to perform product imports.",
  },
  FORBIDDEN: {
    title: "Insufficient Permissions",
    hint: "Your account does not possess catalog administrator privileges.",
  },
  NOT_FOUND: {
    title: "Draft Not Found",
    hint: "The specified import draft could not be found or has been removed.",
  },
};

interface ProductImporterProps {
  initialState?: Partial<ImporterUiState>;
  onStateChange?: (state: ImporterStateName) => void;
}

export function ProductImporter({
  initialState,
  onStateChange,
}: ProductImporterProps = {}) {
  const [state, setState] = useState<ImporterUiState>({
    ...INITIAL_IMPORTER_UI_STATE,
    ...initialState,
  });

  const activeFormalState = getActiveImporterState(state);

  useEffect(() => {
    onStateChange?.(activeFormalState);
  }, [activeFormalState, onStateChange]);

  // Action: Ingest product URL
  const handleFetchPreview = async (form: ImporterFormState) => {
    setState((prev) => ({
      ...prev,
      mode: "fetching",
      progressStep: "validating",
      form,
      errorMessage: null,
      errorCode: null,
      errorField: null,
      lastActionContext: "ingest",
      isEditing: false,
    }));

    try {
      // Step: Validating URL
      setState((prev) => ({ ...prev, progressStep: "fetching" }));

      const res = await fetch("/api/admin/imports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json().catch(() => ({
          error: {
            code: "SOURCE_UNAVAILABLE" as ImporterErrorCode,
            message: `Server returned error status ${res.status}`,
          },
        }));
        setState((prev) => ({
          ...prev,
          mode: "error",
          progressStep: null,
          errorCode: errorData.error.code,
          errorMessage: errorData.error.message,
          errorField: errorData.error.field || null,
          lastActionContext: "ingest",
        }));
        return;
      }

      // Step: Normalizing payload
      setState((prev) => ({ ...prev, progressStep: "normalizing" }));

      const data: ImportPreviewResponse = await res.json();
      setState((prev) => ({
        ...prev,
        mode: "preview",
        progressStep: null,
        previewToken: data.previewToken,
        candidate: data.candidate,
        duplicate: data.duplicate,
        lastActionContext: "ingest",
        isEditing: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error occurred.";
      setState((prev) => ({
        ...prev,
        mode: "error",
        progressStep: null,
        errorCode: "SOURCE_UNAVAILABLE",
        errorMessage: message,
        lastActionContext: "ingest",
      }));
    }
  };

  // Action: Save Draft
  const handleSaveDraft = async (edits: Partial<ProductImportCandidate>) => {
    setState((prev) => ({
      ...prev,
      mode: "saving",
      lastActionContext: "save",
    }));

    try {
      const isExisting = !!state.activeDraftId;
      const endpoint = isExisting
        ? `/api/admin/imports/${state.activeDraftId}`
        : "/api/admin/imports";
      const method = isExisting ? "PATCH" : "POST";
      const body = isExisting
        ? { edits, version: state.activeDraftVersion }
        : { previewToken: state.previewToken, edits };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json().catch(() => ({
          error: {
            code: "VALIDATION_FAILED" as ImporterErrorCode,
            message: "Failed to persist draft to storage.",
          },
        }));
        setState((prev) => ({
          ...prev,
          mode: "error",
          errorCode: errorData.error.code,
          errorMessage: errorData.error.message,
          lastActionContext: "save",
        }));
        return;
      }

      const data: { draft: ImportDraft } = await res.json();
      setState((prev) => ({
        ...prev,
        mode: "saved",
        draft: data.draft,
        activeDraftId: data.draft.id,
        activeDraftVersion: data.draft.version,
        candidate: { ...prev.candidate!, ...edits } as ProductImportCandidate,
        lastActionContext: "save",
        isEditing: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to persist draft.";
      setState((prev) => ({
        ...prev,
        mode: "error",
        errorCode: "VALIDATION_FAILED",
        errorMessage: message,
        lastActionContext: "save",
      }));
    }
  };

  // Action: Publish to Catalog
  const handleConfirmPublish = async (reviewData: EditorialReviewInput) => {
    if (!state.activeDraftId) return;

    setState((prev) => ({
      ...prev,
      mode: "publishing",
      lastActionContext: "publish",
    }));

    try {
      const res = await fetch(`/api/admin/imports/${state.activeDraftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: state.activeDraftVersion,
          editorialReview: reviewData,
        }),
      });

      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json().catch(() => ({
          error: {
            code: "VALIDATION_FAILED" as ImporterErrorCode,
            message: "Catalog publication failed.",
          },
        }));
        setState((prev) => ({
          ...prev,
          mode: "error",
          errorCode: errorData.error.code,
          errorMessage: errorData.error.message,
          isPublishModalOpen: false,
          lastActionContext: "publish",
        }));
        return;
      }

      const data: { productId: string; state: "published" } = await res.json();
      setState((prev) => ({
        ...prev,
        mode: "published",
        publishedProductId: data.productId,
        isPublishModalOpen: false,
        lastActionContext: "publish",
        isEditing: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Publication failed.";
      setState((prev) => ({
        ...prev,
        mode: "error",
        errorCode: "VALIDATION_FAILED",
        errorMessage: message,
        isPublishModalOpen: false,
        lastActionContext: "publish",
      }));
    }
  };

  const handleReset = () => {
    setState({
      ...INITIAL_IMPORTER_UI_STATE,
      form: state.form,
    });
  };

  return (
    <div
      data-testid="product-importer-container"
      data-importer-state={activeFormalState}
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8"
    >
      {/* Importer Header */}
      <div className="border-b border-zinc-200/80 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 mb-2">
              <Download className="h-3 w-3 text-zinc-900" />
              <span>Catalog Administration</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Affiliate Product Importer
            </h1>
            <p className="mt-1 text-sm text-zinc-600 max-w-2xl">
              Securely ingest B2B software listings from authorized affiliate networks, normalize product metadata, and edit draft evaluations with provenance tracking.
            </p>
          </div>

          {/* Quick status pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* 20-State Formal Status Pill */}
            <div
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-3 py-1 rounded-full border bg-zinc-100 text-zinc-800 border-zinc-300"
            >
              <Activity className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
              <span>State: <span className="text-zinc-950 font-bold">{activeFormalState}</span></span>
            </div>

            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Gate 3 Enforced</span>
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {state.errorMessage && state.errorCode && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 text-rose-950 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-rose-100 p-1 text-rose-700">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold text-rose-900">
                {ERROR_DESCRIPTIONS[state.errorCode]?.title || "Import Error"}
              </h3>
              <p className="text-sm text-rose-800 leading-relaxed">
                {state.errorMessage}
              </p>
              <p className="text-xs text-rose-700/80 pt-1">
                {ERROR_DESCRIPTIONS[state.errorCode]?.hint}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saved Draft Confirmation Banner */}
      {state.mode === "saved" && state.draft && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900">
                Draft successfully saved! Draft ID: <span className="font-mono">{state.draft.id}</span> (version {state.draft.version})
              </p>
              <p className="text-xs text-emerald-700">
                Draft records stay isolated from the public catalog until published with verified editorial evidence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Published Confirmation Banner */}
      {state.mode === "published" && state.publishedProductId && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-300 bg-emerald-100/90 p-5 text-emerald-950 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-700 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-950">
                  Product Successfully Published!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Published to catalog with verified editorial review and active offer binding.
                </p>
              </div>
            </div>
            <a
              href={`/products/${state.publishedProductId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-950"
            >
              <span>View Product Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Ingestion Input Form */}
      <UrlIngestionForm
        initialForm={state.form}
        isLoading={state.mode === "fetching"}
        onSubmit={handleFetchPreview}
      />

      {/* Async Loading Status */}
      {state.mode === "fetching" && (
        <ImporterProgress
          step={state.progressStep || "validating"}
          message={
            state.progressStep === "validating"
              ? "Validating URL syntax, ports, and SSRF security policies..."
              : state.progressStep === "fetching"
              ? "Querying authorized affiliate provider endpoint and fetching product feed..."
              : "Normalizing payload fields, sanitizing content, and assembling provenance..."
          }
        />
      )}

      {/* Duplicate Warning */}
      {state.duplicate?.isDuplicate && (
        <DuplicateAlert
          duplicate={state.duplicate}
          onProceedAnyway={() => {
            setState((prev) => ({
              ...prev,
              duplicate: { ...prev.duplicate!, isDuplicate: false },
            }));
          }}
        />
      )}

      {/* Candidate Editor */}
      {state.candidate && state.mode !== "fetching" && (
        <CandidateEditor
          candidate={state.candidate}
          isSaving={state.mode === "saving"}
          isPublishing={state.mode === "publishing"}
          draftId={state.activeDraftId}
          draftVersion={state.activeDraftVersion}
          onEditingChange={(isEditing) => setState((prev) => ({ ...prev, isEditing }))}
          onSaveDraft={handleSaveDraft}
          onRequestPublish={() => setState((prev) => ({ ...prev, isPublishModalOpen: true }))}
          onReset={handleReset}
        />
      )}

      {/* Publication Modal */}
      {state.candidate && (
        <PublicationModal
          isOpen={state.isPublishModalOpen}
          isPublishing={state.mode === "publishing"}
          candidate={state.candidate}
          onClose={() => setState((prev) => ({ ...prev, isPublishModalOpen: false }))}
          onConfirmPublish={handleConfirmPublish}
        />
      )}
    </div>
  );
}
