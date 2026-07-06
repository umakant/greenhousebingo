"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/form-builder/signature-pad";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


export type DrugTestingConsentValue = {
  signatureCanvas: string;
  consentAcknowledged: boolean;
};

export const EMPTY_DRUG_TESTING_CONSENT: DrugTestingConsentValue = {
  signatureCanvas: "",
  consentAcknowledged: false,
};

export function normalizeDrugTestingConsentValue(v: unknown): DrugTestingConsentValue {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ...EMPTY_DRUG_TESTING_CONSENT };
  const d = v as Record<string, unknown>;
  return {
    signatureCanvas: typeof d.signatureCanvas === "string" ? d.signatureCanvas : "",
    consentAcknowledged: Boolean(d.consentAcknowledged),
  };
}

function hasSignatureInk(dataUrl: string): boolean {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image") && dataUrl.length > 80;
}

export function isDrugTestingConsentComplete(value: unknown): boolean {
  const v = normalizeDrugTestingConsentValue(value);
  return hasSignatureInk(v.signatureCanvas) && v.consentAcknowledged;
}

export function getDrugTestingPdfUrl(options: unknown): string | null {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const u = (options as { pdfUrl?: unknown }).pdfUrl;
  return typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")) ? u : null;
}

interface DrugTestingConsentFieldProps {
  label: string;
  options: unknown;
  value: unknown;
  onChange: (v: DrugTestingConsentValue) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DrugTestingConsentField({
  label,
  options,
  value,
  onChange,
  error,
  required,
  disabled,
}: DrugTestingConsentFieldProps) {
  const v = React.useMemo(() => normalizeDrugTestingConsentValue(value), [value]);

  function patch(p: Partial<DrugTestingConsentValue>) {
    onChange({ ...v, ...p });
  }

  function onViewPdf() {
    const url = getDrugTestingPdfUrl(options);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    toast.info(t("Add a PDF URL in field options (pdfUrl), or share the consent document from your HR team."));
  }

  function clearSignature() {
    patch({ signatureCanvas: "", consentAcknowledged: false });
  }

  return (
    <div className="space-y-3 col-span-full">
      <p className="text-sm font-medium text-slate-900">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </p>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {t("Pre-employment authorization")}
            </span>
            <span className="shrink-0 rounded border border-slate-400 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
              {t("Confidential")}
            </span>
          </div>
          <h4 className="text-lg font-bold text-slate-900 mt-3">
            {t("Authorization and Consent for Drug Screening")}
          </h4>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-3 mt-3">
            <p>
              {t(
                "I understand that as a condition of employment or continued employment, I may be required to submit to drug and/or alcohol screening under the employer’s substance abuse policy and applicable law.",
              )}
            </p>
            <p>
              {t(
                "I consent to the collection of specimens (such as urine, hair, or oral fluid) and to laboratory testing as directed. I authorize the release of results to the employer and its designated representatives for employment-related decisions.",
              )}
            </p>
            <p>
              {t(
                "I understand that a confirmed positive or adulterated result, or refusal to test when required, may affect my employment offer or continued employment, consistent with policy and law.",
              )}
            </p>
            <p>
              {t(
                "I have read this authorization and consent voluntarily. I will schedule any required screening appointment as instructed by HR.",
              )}
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground px-4 py-3 border-b border-slate-100">
          {t(
            "This form is confidential. For internal HR use only. Retention: 1 year post-employment.",
          )}
        </p>

        <div className="mx-4 mb-4 mt-4 rounded-lg border-2 border-emerald-400/80 bg-emerald-50/60 p-4 space-y-3">
          <p className="text-sm font-medium text-emerald-800">
            {t("Sign below to submit your Pre-Employment Drug Testing document.")}
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
                toast.success(t("Drug testing consent recorded. Submit the full packet when ready."));
              }}
            >
              <FileText className="h-4 w-4" />
              {t("Sign & Submit Drug Testing")}
            </Button>
          </div>
          {v.consentAcknowledged && (
            <p className="text-xs text-green-700 font-medium">✓ {t("Consent signed and acknowledged.")}</p>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
