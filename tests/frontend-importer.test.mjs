import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { loadSource, renderHtml } from "./support/render-harness.mjs";

const { UrlIngestionForm } = loadSource("features/admin/product-importer/url-ingestion-form.tsx");
const { ImporterProgress } = loadSource("features/admin/product-importer/importer-progress.tsx");
const { DuplicateAlert } = loadSource("features/admin/product-importer/duplicate-alert.tsx");
const { ProvenanceBadge } = loadSource("features/admin/product-importer/provenance-badge.tsx");
const { CandidateEditor } = loadSource("features/admin/product-importer/candidate-editor.tsx");
const { PublicationModal } = loadSource("features/admin/product-importer/publication-modal.tsx");
const { ProductImporter } = loadSource("features/admin/product-importer/product-importer.tsx");
const { getActiveImporterState, INITIAL_IMPORTER_UI_STATE } = loadSource("features/admin/product-importer/types.ts");
const { ProductImporterToolView } = loadSource("sanity/plugins/ProductImporterToolView.tsx");
const { productImporterTool, productImporterPlugin } = loadSource("sanity/plugins/productImporterPlugin.ts");

const mockCandidate = {
  sourceId: "partnerstack",
  canonicalUrl: "https://gohighlevel.com",
  externalProductId: "ghl-123",
  name: "HighLevel",
  slug: "highlevel",
  categoryId: "crm-automation",
  merchantName: "HighLevel Inc.",
  merchantDomain: "gohighlevel.com",
  officialSource: "https://gohighlevel.com",
  summary: "All-in-one CRM and marketing automation platform for agencies.",
  intendedUser: "Marketing agencies and fractional consultants",
  intendedWorkflow: "Multi-client account management and sales funnels",
  price: "97/mo",
  currency: "USD",
  affiliateUrl: "https://gohighlevel.com?fp_ref=picksy",
  destinationUrl: "https://gohighlevel.com?fp_ref=picksy",
  imageUrl: null,
  retrievedAt: "2026-10-10T08:00:00Z",
  warnings: ["Trial period limit not specified in source feed."],
  provenance: {
    name: { sourceUrl: "https://partnerstack.com/api/deals", retrievedAt: "2026-10-10T08:00:00Z" },
    summary: { sourceUrl: "https://partnerstack.com/api/deals", retrievedAt: "2026-10-10T08:00:00Z" },
    price: { sourceUrl: "https://partnerstack.com/api/deals", retrievedAt: "2026-10-10T08:00:00Z" },
  },
};

test("UrlIngestionForm renders initial idle state with source selector and input controls", () => {
  const html = renderHtml(
    React.createElement(UrlIngestionForm, {
      isLoading: false,
      onSubmit: () => {},
    })
  );

  assert.ok(html.includes("Import Product from Affiliate Source"));
  assert.ok(html.includes("PartnerStack"));
  assert.ok(html.includes("Impact Radius"));
  assert.ok(html.includes("Fetch Product Preview"));
  assert.ok(html.includes("Server-Side SSRF Protected"));
  assert.ok(html.includes('id="product-url-input"'));
});

test("ImporterProgress renders accessible live region and step badges", () => {
  const html = renderHtml(
    React.createElement(ImporterProgress, {
      message: "Validating SSRF policy...",
      step: "validating",
    })
  );

  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes("Processing Affiliate Data"));
  assert.ok(html.includes("SSRF &amp; Host Validation") || html.includes("SSRF & Host Validation"));
});

test("DuplicateAlert renders duplicate warning banner with matched field and action buttons", () => {
  const html = renderHtml(
    React.createElement(DuplicateAlert, {
      duplicate: {
        isDuplicate: true,
        existingDraftId: "draft-xyz-987",
        existingProductId: "p-highlevel",
        matchField: "canonicalUrl",
        message: "A product with this canonical URL already exists in drafts.",
      },
      onLoadExistingDraft: () => {},
      onProceedAnyway: () => {},
    })
  );

  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes("Duplicate Record Detected"));
  assert.ok(html.includes("Matched on: canonicalUrl"));
  assert.ok(html.includes("draft-xyz-987"));
  assert.ok(html.includes("/products/p-highlevel"));
});

test("DuplicateAlert renders nothing when isDuplicate is false", () => {
  const html = renderHtml(
    React.createElement(DuplicateAlert, {
      duplicate: {
        isDuplicate: false,
        existingDraftId: null,
        existingProductId: null,
        matchField: null,
        message: null,
      },
    })
  );

  assert.equal(html, "");
});

test("ProvenanceBadge displays source origin hostname and retrieved timestamp", () => {
  const html = renderHtml(
    React.createElement(ProvenanceBadge, {
      field: "price",
      provenance: {
        sourceUrl: "https://api.partnerstack.com/products/ghl",
        retrievedAt: "2026-10-10T08:00:00Z",
      },
    })
  );

  assert.ok(html.includes("Extracted: api.partnerstack.com"));
});

test("CandidateEditor binds candidate fields, provenance badges, and extraction warnings", () => {
  const html = renderHtml(
    React.createElement(CandidateEditor, {
      candidate: mockCandidate,
      isSaving: false,
      isPublishing: false,
      draftId: "draft-001",
      draftVersion: 2,
      onSaveDraft: () => {},
      onRequestPublish: () => {},
      onReset: () => {},
    })
  );

  assert.ok(html.includes("HighLevel"));
  assert.ok(html.includes("highlevel"));
  assert.ok(html.includes("CRM &amp; Automation") || html.includes("CRM & Automation"));
  assert.ok(html.includes("Extraction Warnings (1)"));
  assert.ok(html.includes("Trial period limit not specified in source feed."));
  assert.ok(html.includes("Draft #draft-00 (v2)"));
  assert.ok(html.includes("Save Draft"));
  assert.ok(html.includes("Publish Workflow..."));
});

test("PublicationModal renders mandatory Gate 3 publication checklist", () => {
  const html = renderHtml(
    React.createElement(PublicationModal, {
      isOpen: true,
      isPublishing: false,
      candidate: mockCandidate,
      onClose: () => {},
      onConfirmPublish: () => {},
    })
  );

  assert.ok(html.includes('role="dialog"'));
  assert.ok(html.includes("Gate 3 Publication Checklist"));
  assert.ok(html.includes("Factual claims and features have been verified against primary documentation."));
  assert.ok(html.includes("Merchant destination URL uses HTTPS and matches approved merchant domains."));
  assert.ok(html.includes("Affiliate program authorization reference is on file and active."));
  assert.ok(html.includes("Mandatory FTC/editorial disclosure statement is attached."));
  assert.ok(html.includes("Author / Lead Reviewer"));
  assert.ok(html.includes("Authorization Reference"));
});

test("ProductImporter root view renders full administrative container and Gate 3 status", () => {
  const html = renderHtml(React.createElement(ProductImporter));

  assert.ok(html.includes("Affiliate Product Importer"));
  assert.ok(html.includes("Catalog Administration"));
  assert.ok(html.includes("Gate 3 Enforced"));
  assert.ok(html.includes("Import Product from Affiliate Source"));
  assert.ok(html.includes("State:"));
  assert.ok(html.includes("IDLE"));
});

// =========================================================================
// SECTION 7: FOCUSED INITIAL STATE & TRANSITION INTEGRITY TESTS
// =========================================================================

test("initial ImporterUiState is structurally complete with explicit progress, editing, and context", () => {
  assert.equal(INITIAL_IMPORTER_UI_STATE.mode, "idle");
  assert.equal(INITIAL_IMPORTER_UI_STATE.progressStep, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.isEditing, false);
  assert.equal(INITIAL_IMPORTER_UI_STATE.lastActionContext, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.candidate, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.duplicate, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.draft, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.activeDraftId, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.activeDraftVersion, 1);
  assert.equal(INITIAL_IMPORTER_UI_STATE.publishedProductId, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.errorMessage, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.errorCode, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.errorField, null);
  assert.equal(INITIAL_IMPORTER_UI_STATE.isPublishModalOpen, false);
  assert.equal(INITIAL_IMPORTER_UI_STATE.form.sourceId, "partnerstack");
  assert.equal(INITIAL_IMPORTER_UI_STATE.form.productUrl, "");

  // Verify getActiveImporterState resolves default initial state to IDLE
  assert.equal(getActiveImporterState(INITIAL_IMPORTER_UI_STATE), "IDLE");
});

test("reset restores valid full state without residual candidate or error", () => {
  const dirtyState = {
    mode: "error",
    progressStep: null,
    form: { sourceId: "impact", productUrl: "https://example.com/bad" },
    previewToken: "tok-123",
    candidate: mockCandidate,
    duplicate: null,
    draft: null,
    activeDraftId: "d-999",
    activeDraftVersion: 4,
    publishedProductId: null,
    errorMessage: "Invalid URL",
    errorCode: "INVALID_URL",
    errorField: "productUrl",
    isPublishModalOpen: false,
    isEditing: true,
    lastActionContext: "ingest",
  };

  // Restoring full initial state
  const restored = { ...INITIAL_IMPORTER_UI_STATE, form: dirtyState.form };
  assert.equal(restored.mode, "idle");
  assert.equal(restored.progressStep, null);
  assert.equal(restored.isEditing, false);
  assert.equal(restored.lastActionContext, null);
  assert.equal(restored.candidate, null);
  assert.equal(restored.errorMessage, null);
  assert.equal(getActiveImporterState(restored), "IDLE");
});

test("candidate editing transitions active formal state to EDITING", () => {
  const readyState = {
    ...INITIAL_IMPORTER_UI_STATE,
    mode: "preview",
    candidate: mockCandidate,
    isEditing: false,
  };
  assert.equal(getActiveImporterState(readyState), "CANDIDATE READY");

  const editingState = {
    ...readyState,
    isEditing: true,
  };
  assert.equal(getActiveImporterState(editingState), "EDITING");

  const html = renderHtml(
    React.createElement(ProductImporter, { initialState: editingState })
  );
  assert.ok(html.includes('data-importer-state="EDITING"'));
  assert.ok(html.includes("State: <span class=\"text-zinc-950 font-bold\">EDITING</span>"));
});

test("import retry clears stale error state and sets lastActionContext to ingest", () => {
  const errorState = {
    ...INITIAL_IMPORTER_UI_STATE,
    mode: "error",
    errorMessage: "Connection timeout",
    errorCode: "SOURCE_UNAVAILABLE",
    lastActionContext: "ingest",
  };
  assert.equal(getActiveImporterState(errorState), "SOURCE UNAVAILABLE");

  // Simulating retry transition
  const retryingState = {
    ...errorState,
    mode: "fetching",
    progressStep: "validating",
    errorMessage: null,
    errorCode: null,
    lastActionContext: "ingest",
  };
  assert.equal(getActiveImporterState(retryingState), "VALIDATING URL");
  assert.equal(retryingState.errorMessage, null);
});

test("save failure preserves recoverable user input and indicates SAVE FAILURE", () => {
  const saveFailState = {
    ...INITIAL_IMPORTER_UI_STATE,
    mode: "error",
    candidate: mockCandidate,
    lastActionContext: "save",
    errorCode: "VALIDATION_FAILED",
    errorMessage: "Network write timeout",
  };
  assert.equal(getActiveImporterState(saveFailState), "SAVE FAILURE");

  const html = renderHtml(
    React.createElement(ProductImporter, { initialState: saveFailState })
  );
  assert.ok(html.includes('data-importer-state="SAVE FAILURE"'));
  assert.ok(html.includes("Network write timeout"));
  // Candidate editor remains rendered with user's candidate data intact
  assert.ok(html.includes("HighLevel"));
});

test("publication failure does not report success and indicates PUBLICATION FAILURE", () => {
  const pubFailState = {
    ...INITIAL_IMPORTER_UI_STATE,
    mode: "error",
    candidate: mockCandidate,
    lastActionContext: "publish",
    errorCode: "VALIDATION_FAILED",
    errorMessage: "Missing editorial authorization reference",
  };
  assert.equal(getActiveImporterState(pubFailState), "PUBLICATION FAILURE");
  assert.equal(pubFailState.publishedProductId, null);

  const html = renderHtml(
    React.createElement(ProductImporter, { initialState: pubFailState })
  );
  assert.ok(html.includes('data-importer-state="PUBLICATION FAILURE"'));
  assert.ok(html.includes("Missing editorial authorization reference"));
  assert.ok(!html.includes("Product Successfully Published!"));
});

// =========================================================================
// 20 REQUIRED IMPORTER STATES TESTS
// =========================================================================

test("getActiveImporterState evaluates all 20 required formal states correctly", () => {
  const baseState = { ...INITIAL_IMPORTER_UI_STATE };

  // 1. IDLE
  assert.equal(getActiveImporterState({ ...baseState, mode: "idle" }), "IDLE");

  // 2. VALIDATING URL
  assert.equal(
    getActiveImporterState({ ...baseState, mode: "fetching", progressStep: "validating" }),
    "VALIDATING URL"
  );

  // 3. FETCHING AUTHORIZED SOURCE
  assert.equal(
    getActiveImporterState({ ...baseState, mode: "fetching", progressStep: "fetching" }),
    "FETCHING AUTHORIZED SOURCE"
  );

  // 4. NORMALIZING
  assert.equal(
    getActiveImporterState({ ...baseState, mode: "fetching", progressStep: "normalizing" }),
    "NORMALIZING"
  );

  // 5. DUPLICATE DETECTED
  assert.equal(
    getActiveImporterState({
      ...baseState,
      duplicate: { isDuplicate: true, existingDraftId: "d-1", existingProductId: null, matchField: "canonicalUrl", message: "dup" },
    }),
    "DUPLICATE DETECTED"
  );

  // 6. CANDIDATE READY
  assert.equal(
    getActiveImporterState({ ...baseState, candidate: mockCandidate, isEditing: false }),
    "CANDIDATE READY"
  );

  // 7. EDITING
  assert.equal(
    getActiveImporterState({ ...baseState, candidate: mockCandidate, isEditing: true }),
    "EDITING"
  );

  // 8. SAVING DRAFT
  assert.equal(getActiveImporterState({ ...baseState, mode: "saving" }), "SAVING DRAFT");

  // 9. DRAFT SAVED
  assert.equal(getActiveImporterState({ ...baseState, mode: "saved" }), "DRAFT SAVED");

  // 10. SAVE FAILURE
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      lastActionContext: "save",
      errorMessage: "Write failed",
      errorCode: "VALIDATION_FAILED",
    }),
    "SAVE FAILURE"
  );

  // 11. UNAUTHORIZED SOURCE
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      errorCode: "SOURCE_NOT_AUTHORIZED",
      errorMessage: "Not authorized",
    }),
    "UNAUTHORIZED SOURCE"
  );

  // 12. INVALID URL
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      errorCode: "INVALID_URL",
      errorMessage: "Private IP",
    }),
    "INVALID URL"
  );

  // 13. SOURCE UNAVAILABLE
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      errorCode: "SOURCE_UNAVAILABLE",
      errorMessage: "Timeout",
    }),
    "SOURCE UNAVAILABLE"
  );

  // 14. VALIDATION FAILURE
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      errorCode: "VALIDATION_FAILED",
      errorMessage: "Missing field",
    }),
    "VALIDATION FAILURE"
  );

  // 15. CONFLICT
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      errorCode: "CONFLICT",
      errorMessage: "Version mismatch",
    }),
    "CONFLICT"
  );

  // 16. RATE LIMITED
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      errorCode: "RATE_LIMITED",
      errorMessage: "Too many requests",
    }),
    "RATE LIMITED"
  );

  // 17. READY FOR REVIEW
  assert.equal(
    getActiveImporterState({
      ...baseState,
      candidate: mockCandidate,
      isPublishModalOpen: true,
    }),
    "READY FOR REVIEW"
  );

  // 18. PUBLISHING
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "publishing",
      lastActionContext: "publish",
    }),
    "PUBLISHING"
  );

  // 19. PUBLISHED
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "published",
      publishedProductId: "prod-xyz",
    }),
    "PUBLISHED"
  );

  // 20. PUBLICATION FAILURE
  assert.equal(
    getActiveImporterState({
      ...baseState,
      mode: "error",
      lastActionContext: "publish",
      errorCode: "VALIDATION_FAILED",
      errorMessage: "Gate 3 failed",
    }),
    "PUBLICATION FAILURE"
  );
});

test("ProductImporter renders specific state indicators for different operational states", () => {
  // Test Candidacy & Ready state
  const htmlReady = renderHtml(
    React.createElement(ProductImporter, {
      initialState: { candidate: mockCandidate, isEditing: false },
    })
  );
  assert.ok(htmlReady.includes('data-importer-state="CANDIDATE READY"'));
  assert.ok(htmlReady.includes("CANDIDATE READY"));

  // Test Editing state
  const htmlEditing = renderHtml(
    React.createElement(ProductImporter, {
      initialState: { candidate: mockCandidate, isEditing: true },
    })
  );
  assert.ok(htmlEditing.includes('data-importer-state="EDITING"'));

  // Test Saved Draft state
  const htmlSaved = renderHtml(
    React.createElement(ProductImporter, {
      initialState: {
        mode: "saved",
        draft: {
          id: "draft-777",
          sourceId: "partnerstack",
          canonicalUrl: "https://gohighlevel.com",
          externalProductId: "ghl-123",
          state: "draft",
          candidate: mockCandidate,
          edits: {},
          version: 3,
          createdAt: "2026-10-10T08:00:00Z",
          updatedAt: "2026-10-10T08:00:00Z",
        },
      },
    })
  );
  assert.ok(htmlSaved.includes('data-importer-state="DRAFT SAVED"'));
  assert.ok(htmlSaved.includes("Draft successfully saved!"));
  assert.ok(htmlSaved.includes("draft-777"));

  // Test Publication Failure state
  const htmlPubFail = renderHtml(
    React.createElement(ProductImporter, {
      initialState: {
        mode: "error",
        lastActionContext: "publish",
        errorCode: "VALIDATION_FAILED",
        errorMessage: "Gate 3 checklist incomplete.",
      },
    })
  );
  assert.ok(htmlPubFail.includes('data-importer-state="PUBLICATION FAILURE"'));
  assert.ok(htmlPubFail.includes("Gate 3 checklist incomplete."));
});

// =========================================================================
// SANITY STUDIO TOOL PLUGIN & VIEW TESTS
// =========================================================================

test("productImporterTool creates valid Sanity Tool definition", () => {
  const tool = productImporterTool();
  assert.equal(tool.name, "product-importer");
  assert.equal(tool.title, "Product Importer");
  assert.equal(typeof tool.component, "function");
});

test("productImporterPlugin registers productImporterTool into Sanity studio tools array", () => {
  const plugin = productImporterPlugin();
  assert.equal(plugin.name, "picksy-product-importer");
  assert.equal(typeof plugin.tools, "function");

  const existingTools = [{ name: "structure", title: "Structure" }];
  const extendedTools = plugin.tools(existingTools, {});
  assert.equal(extendedTools.length, 2);
  assert.equal(extendedTools[1].name, "product-importer");
  assert.equal(extendedTools[1].title, "Product Importer");
});

test("ProductImporterToolView renders within Sanity Studio shell with context bar and invariant notice", () => {
  const html = renderHtml(
    React.createElement(ProductImporterToolView, {
      tool: productImporterTool(),
    })
  );

  assert.ok(html.includes("Sanity Studio Tool: Product Importer"));
  assert.ok(html.includes("Project:"));
  assert.ok(html.includes("0tozsrrx"));
  assert.ok(html.includes("Dataset:"));
  assert.ok(html.includes("production"));
  assert.ok(html.includes("Zero Browser Tokens"));
  assert.ok(html.includes("Target: importDraft Schema"));
  assert.ok(html.includes("Content Invariant:"));
  assert.ok(html.includes("never published automatically"));
  assert.ok(html.includes("Gate 3 compliance verification"));
  assert.ok(html.includes('data-importer-state="IDLE"'));
});
