"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  Send,
  AlertTriangle,
  RotateCcw,
  Building,
  Globe,
  FileText,
} from "lucide-react";
import type { ProductImportCandidate } from "@/lib/importer-types";
import { ProvenanceBadge } from "./provenance-badge";

const APPROVED_CATEGORIES = [
  { id: "crm-automation", name: "CRM & Automation" },
  { id: "seo-software", name: "SEO Software" },
  { id: "email-marketing", name: "Email Marketing" },
  { id: "course-platforms", name: "Course Platforms" },
  { id: "managed-hosting", name: "Managed Hosting" },
  { id: "cybersecurity", name: "Cybersecurity" },
];

interface CandidateEditorProps {
  candidate: ProductImportCandidate;
  isSaving: boolean;
  isPublishing: boolean;
  draftId?: string | null;
  draftVersion?: number;
  onEditingChange?: (isEditing: boolean) => void;
  onSaveDraft: (edits: Partial<ProductImportCandidate>) => void;
  onRequestPublish: (edits: Partial<ProductImportCandidate>) => void;
  onReset: () => void;
}

export function CandidateEditor({
  candidate,
  isSaving,
  isPublishing,
  draftId,
  draftVersion,
  onEditingChange,
  onSaveDraft,
  onRequestPublish,
  onReset,
}: CandidateEditorProps) {
  const [formData, setFormData] = useState({
    name: candidate.name || "",
    slug: candidate.slug || "",
    categoryId: candidate.categoryId || "crm-automation",
    summary: candidate.summary || "",
    intendedUser: candidate.intendedUser || "",
    intendedWorkflow: candidate.intendedWorkflow || "",
    price: candidate.price || "",
    currency: candidate.currency || "USD",
    officialSource: candidate.officialSource || candidate.canonicalUrl || "",
    destinationUrl: candidate.destinationUrl || candidate.affiliateUrl || "",
    offerLabel: candidate.merchantName ? `Visit ${candidate.merchantName}` : "",
    disclosure:
      "Picksy may earn a commission when you register or purchase through our verified partner links at no extra cost to you.",
  });

  useEffect(() => {
    setFormData({
      name: candidate.name || "",
      slug: candidate.slug || "",
      categoryId: candidate.categoryId || "crm-automation",
      summary: candidate.summary || "",
      intendedUser: candidate.intendedUser || "",
      intendedWorkflow: candidate.intendedWorkflow || "",
      price: candidate.price || "",
      currency: candidate.currency || "USD",
      officialSource: candidate.officialSource || candidate.canonicalUrl || "",
      destinationUrl: candidate.destinationUrl || candidate.affiliateUrl || "",
      offerLabel: candidate.merchantName ? `Visit ${candidate.merchantName}` : "",
      disclosure:
        "Picksy may earn a commission when you register or purchase through our verified partner links at no extra cost to you.",
    });
    onEditingChange?.(false);
  }, [candidate, onEditingChange]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    onEditingChange?.(true);
  };

  const handleSlugify = () => {
    const slug = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({ ...prev, slug }));
    onEditingChange?.(true);
  };

  const handleSubmitSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDraft(formData);
  };

  const handleOpenPublish = () => {
    onRequestPublish(formData);
  };

  return (
    <div className="space-y-6">
      {/* Warnings Banner if candidate has extraction warnings */}
      {candidate.warnings && candidate.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-amber-950 uppercase tracking-wide">
                Extraction Warnings ({candidate.warnings.length})
              </h4>
              <ul className="mt-1 list-disc list-inside text-xs text-amber-800 space-y-0.5">
                {candidate.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Editor Form Card */}
      <form
        onSubmit={handleSubmitSave}
        className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 shadow-xs space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
              <span>Candidate Metadata Editor</span>
              {draftId && (
                <span className="text-xs font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                  Draft #{draftId.slice(0, 8)} (v{draftVersion ?? 1})
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Review and adjust extracted data. All fields must meet editorial requirements prior to publication.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={isSaving || isPublishing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              disabled={isSaving || isPublishing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 shadow-xs hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving Draft..." : "Save Draft"}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPublish}
              disabled={isSaving || isPublishing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Publish Workflow...</span>
            </button>
          </div>
        </div>

        {/* Section 1: Core Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Building className="h-3.5 w-3.5" />
            <span>Product Identity & Taxon</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="field-name" className="text-xs font-medium text-zinc-700">
                  Product Name *
                </label>
                <ProvenanceBadge field="name" provenance={candidate.provenance?.name} />
              </div>
              <input
                type="text"
                id="field-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="field-slug" className="text-xs font-medium text-zinc-700">
                  URL Slug *
                </label>
                <button
                  type="button"
                  onClick={handleSlugify}
                  className="text-[11px] text-zinc-500 hover:text-zinc-950 underline"
                >
                  Auto-generate from name
                </button>
              </div>
              <input
                type="text"
                id="field-slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 font-mono focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label htmlFor="field-category" className="text-xs font-medium text-zinc-700 mb-1 block">
                Target Category *
              </label>
              <select
                id="field-category"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              >
                {APPROVED_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="field-price" className="text-xs font-medium text-zinc-700">
                  Observed Price / Billing
                </label>
                <ProvenanceBadge field="price" provenance={candidate.provenance?.price} />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="field-price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g. 97/mo or Free Trial"
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
                <input
                  type="text"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  placeholder="USD"
                  className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-sm text-zinc-900 text-center uppercase focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Editorial & Target Audience */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Editorial Context & Scope</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="field-summary" className="text-xs font-medium text-zinc-700">
                Editorial Summary *
              </label>
              <ProvenanceBadge field="summary" provenance={candidate.provenance?.summary} />
            </div>
            <textarea
              id="field-summary"
              name="summary"
              rows={3}
              value={formData.summary}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="field-intendedUser" className="text-xs font-medium text-zinc-700">
                  Intended Audience / User *
                </label>
              </div>
              <input
                type="text"
                id="field-intendedUser"
                name="intendedUser"
                value={formData.intendedUser}
                onChange={handleChange}
                placeholder="e.g. Marketing agencies & fractional consultants"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="field-intendedWorkflow" className="text-xs font-medium text-zinc-700">
                  Intended Workflow *
                </label>
              </div>
              <input
                type="text"
                id="field-intendedWorkflow"
                name="intendedWorkflow"
                value={formData.intendedWorkflow}
                onChange={handleChange}
                placeholder="e.g. Multi-client account provisioning and CRM automation"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Links & Affiliate Compliance */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Globe className="h-3.5 w-3.5" />
            <span>Destination URLs & Disclosure Compliance</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="field-officialSource" className="text-xs font-medium text-zinc-700 mb-1 block">
                Official Merchant Source URL (HTTPS) *
              </label>
              <input
                type="url"
                id="field-officialSource"
                name="officialSource"
                value={formData.officialSource}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label htmlFor="field-destinationUrl" className="text-xs font-medium text-zinc-700 mb-1 block">
                Approved Destination / Affiliate URL *
              </label>
              <input
                type="url"
                id="field-destinationUrl"
                name="destinationUrl"
                value={formData.destinationUrl}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label htmlFor="field-offerLabel" className="text-xs font-medium text-zinc-700 mb-1 block">
                Call-to-Action Offer Label *
              </label>
              <input
                type="text"
                id="field-offerLabel"
                name="offerLabel"
                value={formData.offerLabel}
                onChange={handleChange}
                required
                placeholder="e.g. Visit HighLevel Official"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <label htmlFor="field-disclosure" className="text-xs font-medium text-zinc-700 mb-1 block">
                Mandatory Affiliate Disclosure *
              </label>
              <textarea
                id="field-disclosure"
                name="disclosure"
                rows={2}
                value={formData.disclosure}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
