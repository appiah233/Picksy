"use client";

import React, { useState } from "react";
import { Link2, ArrowRight, Clipboard, ShieldCheck, AlertCircle } from "lucide-react";
import type { ImporterFormState } from "./types";

interface UrlIngestionFormProps {
  initialForm?: ImporterFormState;
  isLoading: boolean;
  onSubmit: (form: ImporterFormState) => void;
}

export function UrlIngestionForm({
  initialForm = { sourceId: "partnerstack", productUrl: "" },
  isLoading,
  onSubmit,
}: UrlIngestionFormProps) {
  const [sourceId, setSourceId] = useState(initialForm.sourceId);
  const [productUrl, setProductUrl] = useState(initialForm.productUrl);
  const [clientError, setClientError] = useState<string | null>(null);

  const validateUrl = (val: string): boolean => {
    if (!val.trim()) {
      setClientError("Product URL is required.");
      return false;
    }
    try {
      const parsed = new URL(val.trim());
      if (parsed.protocol !== "https:") {
        setClientError("URL must use secure HTTPS protocol.");
        return false;
      }
      if (!parsed.hostname || parsed.hostname.includes(" ")) {
        setClientError("Invalid hostname format.");
        return false;
      }
      setClientError(null);
      return true;
    } catch {
      setClientError("Please enter a valid, well-formed HTTPS URL.");
      return false;
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        setProductUrl(text.trim());
        validateUrl(text.trim());
      }
    } catch {
      // Clipboard access denied or unavailable in environment
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateUrl(productUrl)) {
      onSubmit({ sourceId, productUrl: productUrl.trim() });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 shadow-xs"
      noValidate
    >
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">
            Import Product from Affiliate Source
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Enter the authorized product destination URL to retrieve normalized metadata and offers.
          </p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-50 border border-zinc-200/80 rounded-full px-2.5 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Server-Side SSRF Protected</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Source Selector */}
        <div className="sm:col-span-1">
          <label
            htmlFor="source-selector"
            className="block text-xs font-medium text-zinc-700 mb-1"
          >
            Affiliate Network / Source
          </label>
          <select
            id="source-selector"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            <option value="partnerstack">PartnerStack</option>
            <option value="impact">Impact Radius</option>
            <option value="shareasale">ShareASale</option>
            <option value="direct-feed">Direct Merchant Feed</option>
            <option value="custom">Generic Authorized Feed</option>
          </select>
        </div>

        {/* URL Input */}
        <div className="sm:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="product-url-input"
              className="block text-xs font-medium text-zinc-700"
            >
              Product Destination or Canonical URL
            </label>
            <button
              type="button"
              onClick={handlePaste}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-950 focus:outline-none focus:underline"
            >
              <Clipboard className="h-3 w-3" />
              <span>Paste from clipboard</span>
            </button>
          </div>
          <div className="relative rounded-lg shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Link2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </div>
            <input
              type="url"
              id="product-url-input"
              value={productUrl}
              onChange={(e) => {
                setProductUrl(e.target.value);
                if (clientError) validateUrl(e.target.value);
              }}
              onBlur={() => productUrl && validateUrl(productUrl)}
              disabled={isLoading}
              placeholder="Enter HTTPS destination URL (e.g. partner program link)..."
              aria-invalid={!!clientError}
              aria-describedby={clientError ? "url-error-hint" : "url-helper-hint"}
              className={`block w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 ${
                clientError
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20"
                  : "border-zinc-300 focus:border-zinc-950 focus:ring-zinc-950 bg-white"
              } disabled:bg-zinc-100 disabled:text-zinc-400`}
            />
          </div>
          {clientError ? (
            <p
              id="url-error-hint"
              role="alert"
              className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 font-medium"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{clientError}</span>
            </p>
          ) : (
            <p id="url-helper-hint" className="mt-1.5 text-[11px] text-zinc-500">
              Must be an authorized HTTPS URL from approved merchant hosts.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
        <button
          type="submit"
          disabled={isLoading || !productUrl.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all"
        >
          <span>{isLoading ? "Fetching Preview..." : "Fetch Product Preview"}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
