"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/form-builder/signature-pad";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


export type BackgroundCheckConsentValue = {
  /** User opts out of background check authorization */
  decline: boolean;
  signatureCanvas: string;
  /** User clicked Sign & Submit after signing (not required if decline) */
  consentAcknowledged: boolean;
};

export const EMPTY_BACKGROUND_CHECK_CONSENT: BackgroundCheckConsentValue = {
  decline: false,
  signatureCanvas: "",
  consentAcknowledged: false,
};

export function normalizeBackgroundCheckConsentValue(v: unknown): BackgroundCheckConsentValue {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ...EMPTY_BACKGROUND_CHECK_CONSENT };
  const d = v as Record<string, unknown>;
  return {
    decline: Boolean(d.decline),
    signatureCanvas: typeof d.signatureCanvas === "string" ? d.signatureCanvas : "",
    consentAcknowledged: Boolean(d.consentAcknowledged),
  };
}

export function backgroundCheckHasSignatureInk(dataUrl: string): boolean {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image") && dataUrl.length > 80;
}

/** Complete if user declined, or signed and acknowledged consent. */
export function isBackgroundCheckConsentComplete(value: unknown): boolean {
  const v = normalizeBackgroundCheckConsentValue(value);
  if (v.decline) return true;
  return backgroundCheckHasSignatureInk(v.signatureCanvas) && v.consentAcknowledged;
}

export function getBackgroundCheckPdfUrl(options: unknown): string | null {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const u = (options as { pdfUrl?: unknown }).pdfUrl;
  return typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")) ? u : null;
}

interface BackgroundCheckConsentFieldProps {
  label: string;
  options: unknown;
  value: unknown;
  onChange: (v: BackgroundCheckConsentValue) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function BackgroundCheckConsentField({
  label,
  options,
  value,
  onChange,
  error,
  required,
  disabled,
}: BackgroundCheckConsentFieldProps) {
  const v = React.useMemo(() => normalizeBackgroundCheckConsentValue(value), [value]);

  function patch(p: Partial<BackgroundCheckConsentValue>) {
    onChange({ ...v, ...p });
  }

  function onDeclineChange(checked: boolean) {
    if (checked) {
      patch({ decline: true, signatureCanvas: "", consentAcknowledged: false });
    } else {
      patch({ decline: false });
    }
  }

  function onViewPdf() {
    const url = getBackgroundCheckPdfUrl(options);
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
        <div className="flex items-center justify-between gap-2 px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{t("Authorization")}</span>
          <span>{t("Confidential")}</span>
        </div>

        <div className="px-4 pb-4 pt-1 space-y-3">
          <h4 className="text-lg font-bold text-slate-900">{t("Background Check Consent")}</h4>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              {t(
                "By signing below, you authorize the employer and its designated agents to obtain consumer reports and investigative consumer reports (including criminal history) about you for employment purposes, as permitted by applicable law. Information may be obtained from public and private sources.",
              )}
            </p>
            <p>
              {t(
                "Your HR team completes the employer portion of the process first. After review, you may sign this consent to proceed, or use the decline option if you choose not to authorize a background check at this time.",
              )}
            </p>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="bg-decline"
              checked={v.decline}
              onCheckedChange={(c) => onDeclineChange(c === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <Label htmlFor="bg-decline" className="text-sm font-normal leading-snug cursor-pointer">
              {t("I elect not to provide authorization for a background check at this time.")}
            </Label>
          </div>
        </div>

        <div
          className={cn(
            "mx-4 mb-4 rounded-lg border-2 border-emerald-400/80 bg-emerald-50/60 p-4 space-y-3",
            v.decline && "opacity-60",
          )}
        >
          <p className="text-sm font-medium text-emerald-800">
            {t(
              "Sign below to submit your Background Check consent (or use the decline option above).",
            )}
          </p>
          <SignaturePad
            value={v.signatureCanvas}
            onChange={(dataUrl) => patch({ signatureCanvas: dataUrl, consentAcknowledged: false })}
            disabled={disabled || v.decline}
            hideClearButton
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <button
                type="button"
                className="text-red-600 hover:underline shrink-0"
                onClick={onViewPdf}
                disabled={disabled}
              >
                {t("View PDF")}
              </button>
              <button
                type="button"
                className="text-red-600 hover:underline shrink-0"
                onClick={clearSignature}
                disabled={disabled || v.decline}
              >
                {t("Clear Signature")}
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              disabled={disabled || v.decline || !backgroundCheckHasSignatureInk(v.signatureCanvas)}
              onClick={() => {
                patch({ consentAcknowledged: true });
                toast.success(t("Background check consent recorded. Submit the full packet when ready."));
              }}
            >
              <FileText className="h-4 w-4" />
              {t("Sign & Submit Background Check")}
            </Button>
          </div>
          {v.consentAcknowledged && !v.decline && (
            <p className="text-xs text-green-700 font-medium">✓ {t("Consent signed and acknowledged.")}</p>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
