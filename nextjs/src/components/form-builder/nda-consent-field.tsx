"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/form-builder/signature-pad";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


export type NdaConsentValue = {
  signatureCanvas: string;
  consentAcknowledged: boolean;
};

export const EMPTY_NDA_CONSENT: NdaConsentValue = {
  signatureCanvas: "",
  consentAcknowledged: false,
};

export function normalizeNdaConsentValue(v: unknown): NdaConsentValue {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ...EMPTY_NDA_CONSENT };
  const d = v as Record<string, unknown>;
  return {
    signatureCanvas: typeof d.signatureCanvas === "string" ? d.signatureCanvas : "",
    consentAcknowledged: Boolean(d.consentAcknowledged),
  };
}

function hasSignatureInk(dataUrl: string): boolean {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image") && dataUrl.length > 80;
}

export function isNdaConsentComplete(value: unknown): boolean {
  const v = normalizeNdaConsentValue(value);
  return hasSignatureInk(v.signatureCanvas) && v.consentAcknowledged;
}

export function getNdaPdfUrl(options: unknown): string | null {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const u = (options as { pdfUrl?: unknown }).pdfUrl;
  return typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")) ? u : null;
}

function NdaDocumentBody({ documentRef }: { documentRef: string }) {
  return (
    <div className="font-serif text-[13px] leading-relaxed text-slate-800 px-5 py-6 sm:px-8 sm:py-8 max-h-[min(70vh,520px)] overflow-y-auto border-b border-slate-200 bg-white">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700">
        {t("Strictly confidential")}
      </p>
      <h3 className="text-center text-lg font-bold text-slate-900 mt-2 mb-1">
        {t("Non-Disclosure and Confidentiality Agreement")}
      </h3>
      <p className="text-center text-[11px] text-slate-500 mb-4">{documentRef}</p>
      <hr className="border-slate-200 mb-5" />

      <p className="font-bold uppercase text-center text-sm mb-4">
        {t("Non-Disclosure and Confidentiality Agreement")}
      </p>

      <p className="mb-3">
        <span className="font-bold">{t("WHEREAS")}</span>, {t("the Company possesses certain confidential and proprietary information; and")}
      </p>
      <p className="mb-3">
        <span className="font-bold">{t("WHEREAS")}</span>,{" "}
        {t(
          "the Employee may receive access to such information in connection with employment or engagement; and",
        )}
      </p>
      <p className="mb-5">
        <span className="font-bold">{t("WHEREAS")}</span>, {t("the parties wish to protect such information.")}
      </p>
      <p className="mb-4 font-bold">{t("NOW, THEREFORE, the parties agree as follows:")}</p>

      <section className="mb-4">
        <h4 className="font-bold text-slate-900 mb-2">{t("1. DEFINITION OF CONFIDENTIAL INFORMATION")}</h4>
        <p className="mb-2">
          {t(
            '"Confidential Information" means all non-public information disclosed by the Company or its affiliates, whether oral, written, electronic, or visual, including but not limited to:',
          )}
        </p>
        <ul className="list-none space-y-1 pl-1">
          <li>{t("(a) business plans, financial data, and pricing;")}</li>
          <li>{t("(b) customer lists, vendor information, and marketing strategies;")}</li>
          <li>{t("(c) software, inventions, processes, and technical know-how.")}</li>
        </ul>
      </section>

      <section className="mb-4">
        <h4 className="font-bold text-slate-900 mb-2">{t("2. OBLIGATIONS OF RECEIVING PARTY")}</h4>
        <p className="mb-2">
          {t(
            "The Employee shall hold Confidential Information in strict confidence, use it solely for legitimate business purposes, and not disclose it to any third party without prior written consent.",
          )}
        </p>
      </section>

      <section className="mb-4">
        <h4 className="font-bold text-slate-900 mb-2">{t("3. EXCLUSIONS")}</h4>
        <p>
          {t(
            "Confidential Information does not include information that is publicly available through no breach of this Agreement, was rightfully known prior to disclosure, or is independently developed without use of Confidential Information.",
          )}
        </p>
      </section>

      <section className="mb-4">
        <h4 className="font-bold text-slate-900 mb-2">{t("4. NO LICENSE")}</h4>
        <p>
          {t(
            "Nothing in this Agreement grants the Employee any license or ownership interest in Confidential Information.",
          )}
        </p>
      </section>

      <section className="mb-4">
        <h4 className="font-bold text-slate-900 mb-2">{t("5. RETURN OF MATERIALS")}</h4>
        <p>
          {t(
            "Upon termination of employment or upon request, the Employee shall return or destroy all materials containing Confidential Information and certify destruction if requested.",
          )}
        </p>
      </section>

      <section className="mb-4">
        <h4 className="font-bold text-slate-900 mb-2">{t("6. REMEDIES")}</h4>
        <p>
          {t(
            "The Employee acknowledges that breach may cause irreparable harm. The Company may seek injunctive relief in addition to other remedies available at law or in equity.",
          )}
        </p>
      </section>

      <section className="mb-4">
        <h4 className="font-bold text-slate-900 mb-2">{t("7. GOVERNING LAW")}</h4>
        <p>
          {t(
            "This Agreement shall be governed by the laws of the state in which the Employee is employed, without regard to conflict-of-law principles.",
          )}
        </p>
      </section>

      <section className="mb-6">
        <h4 className="font-bold text-slate-900 mb-2">{t("8. ENTIRE AGREEMENT")}</h4>
        <p>
          {t(
            "This Agreement constitutes the entire understanding regarding confidentiality and supersedes prior oral or written agreements on this subject.",
          )}
        </p>
      </section>

      <h4 className="font-bold text-slate-900 mb-4 text-center uppercase tracking-wide text-xs">
        {t("Execution — Signatures")}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
        <div>
          <div className="min-h-[52px] border-b border-slate-800 mb-1" />
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{t("Employee signature")}</p>
        </div>
        <div>
          <div className="min-h-[52px] border-b border-slate-800 mb-1 flex items-end text-sm text-slate-600">
            {/* Placeholder line for date — actual date captured with e-sign below */}
          </div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{t("Date")}</p>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-500 space-y-0.5 pt-2 border-t border-slate-100">
        <p>{t("NDA_STANDARD_V1.0")}</p>
        <p>{t("Confidential — For internal use only")}</p>
        <p>{t("Page 1 of 1")}</p>
      </div>
    </div>
  );
}

interface NdaConsentFieldProps {
  label: string;
  options: unknown;
  value: unknown;
  onChange: (v: NdaConsentValue) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function NdaConsentField({
  label,
  options,
  value,
  onChange,
  error,
  required,
  disabled,
}: NdaConsentFieldProps) {
  const v = React.useMemo(() => normalizeNdaConsentValue(value), [value]);

  const documentRef = React.useMemo(() => {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      return t("Document Reference: NDA_STANDARD_V1.0 — April 2026");
    }
    const r = (options as { documentRef?: unknown }).documentRef;
    if (typeof r === "string" && r.trim()) return r.trim();
    return t("Document Reference: NDA_STANDARD_V1.0 — April 2026");
  }, [options]);

  function patch(p: Partial<NdaConsentValue>) {
    onChange({ ...v, ...p });
  }

  function onViewPdf() {
    const url = getNdaPdfUrl(options);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    toast.info(t("Add a PDF URL in field options (pdfUrl), or attach your organization’s NDA."));
  }

  function clearSignature() {
    patch({ signatureCanvas: "", consentAcknowledged: false });
  }

  return (
    <div className="space-y-3 col-span-full">
      <p className="text-sm font-medium text-slate-900 font-sans">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </p>

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 shadow-sm overflow-hidden">
        <NdaDocumentBody documentRef={documentRef} />

        <div className="mx-4 mb-4 mt-4 rounded-lg border-2 border-emerald-400/80 bg-emerald-50/60 p-4 space-y-3 font-sans">
          <p className="text-sm font-medium text-emerald-800">
            {t("Sign below to submit your Non-Disclosure Agreement.")}
          </p>
          <SignaturePad
            value={v.signatureCanvas}
            onChange={(dataUrl) => patch({ signatureCanvas: dataUrl, consentAcknowledged: false })}
            disabled={disabled}
            hideClearButton
          />
          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 pt-1">
            <button
              type="button"
              className="text-sm text-red-600 hover:underline shrink-0"
              onClick={onViewPdf}
              disabled={disabled}
            >
              {t("View PDF")}
            </button>
            <button
              type="button"
              className="text-sm text-red-600 hover:underline shrink-0"
              onClick={clearSignature}
              disabled={disabled}
            >
              {t("Clear Signature")}
            </button>
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              disabled={disabled || !hasSignatureInk(v.signatureCanvas)}
              onClick={() => {
                patch({ consentAcknowledged: true });
                toast.success(t("NDA consent recorded. Submit the full packet when ready."));
              }}
            >
              <FileText className="h-4 w-4" />
              {t("Sign & Submit NDA")}
            </Button>
          </div>
          {v.consentAcknowledged && (
            <p className="text-xs text-green-700 font-medium">✓ {t("Agreement signed and acknowledged.")}</p>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-sans">{error}</p>}
    </div>
  );
}
