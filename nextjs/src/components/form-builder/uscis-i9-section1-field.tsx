"use client";

import * as React from "react";
import { Eye, FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/form-builder/signature-pad";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


export type UscisI9Attestation = "1" | "2" | "3" | "4" | "";

export type UscisI9Section1Value = {
  lastName: string;
  firstName: string;
  middleInitial: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  ssn: string;
  email: string;
  phone: string;
  attestation: UscisI9Attestation;
  alienRegistrationNo: string;
  workAuthorizedUntil: string;
  signatureCanvas: string;
  typedSignature: string;
  signatureDate: string;
  /** User clicked “Sign & Submit Section 1” to attest completion */
  section1Acknowledged: boolean;
};

export const EMPTY_USCIS_I9_SECTION1: UscisI9Section1Value = {
  lastName: "",
  firstName: "",
  middleInitial: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  dob: "",
  ssn: "",
  email: "",
  phone: "",
  attestation: "",
  alienRegistrationNo: "",
  workAuthorizedUntil: "",
  signatureCanvas: "",
  typedSignature: "",
  signatureDate: "",
  section1Acknowledged: false,
};

export function normalizeUscisI9Section1Value(v: unknown): UscisI9Section1Value {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ...EMPTY_USCIS_I9_SECTION1 };
  const d = v as Record<string, unknown>;
  const att = String(d.attestation ?? "");
  const attOk = att === "1" || att === "2" || att === "3" || att === "4" ? att : "";
  return {
    lastName: String(d.lastName ?? ""),
    firstName: String(d.firstName ?? ""),
    middleInitial: String(d.middleInitial ?? ""),
    address: String(d.address ?? ""),
    city: String(d.city ?? ""),
    state: String(d.state ?? ""),
    zip: String(d.zip ?? ""),
    dob: String(d.dob ?? ""),
    ssn: String(d.ssn ?? ""),
    email: String(d.email ?? ""),
    phone: String(d.phone ?? ""),
    attestation: attOk as UscisI9Attestation,
    alienRegistrationNo: String(d.alienRegistrationNo ?? ""),
    workAuthorizedUntil: String(d.workAuthorizedUntil ?? ""),
    signatureCanvas: typeof d.signatureCanvas === "string" ? d.signatureCanvas : "",
    typedSignature: String(d.typedSignature ?? ""),
    signatureDate: String(d.signatureDate ?? ""),
    section1Acknowledged: Boolean(d.section1Acknowledged),
  };
}

function strOk(s: string): boolean {
  return s.trim().length > 0;
}

function hasCanvasInk(dataUrl: string): boolean {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image") && dataUrl.length > 80;
}

/** True when all Section 1 employee fields, attestation, signature, and acknowledgment are satisfied. */
export function isUscisI9Section1Complete(value: unknown): boolean {
  const v = normalizeUscisI9Section1Value(value);
  if (
    !strOk(v.lastName) ||
    !strOk(v.firstName) ||
    !strOk(v.address) ||
    !strOk(v.city) ||
    !strOk(v.state) ||
    !strOk(v.zip) ||
    !strOk(v.dob) ||
    !strOk(v.ssn) ||
    !strOk(v.email) ||
    !strOk(v.phone)
  ) {
    return false;
  }
  if (v.attestation !== "1" && v.attestation !== "2" && v.attestation !== "3" && v.attestation !== "4") {
    return false;
  }
  if (v.attestation === "3" && !strOk(v.alienRegistrationNo)) return false;
  if (v.attestation === "4" && !strOk(v.workAuthorizedUntil)) return false;
  if (!strOk(v.typedSignature) || !strOk(v.signatureDate)) return false;
  if (!hasCanvasInk(v.signatureCanvas)) return false;
  if (!v.section1Acknowledged) return false;
  return true;
}

type FieldProps = {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

function FieldShell({ label, required, className, children }: FieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label className="text-[10px] font-bold uppercase tracking-wide text-slate-600 leading-tight mb-1 block">
        {label}
        {required && <span className="text-blue-600 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

const inputClass =
  "rounded-md border border-slate-300 bg-white text-sm h-9 shadow-sm focus-visible:ring-blue-500";

interface UscisI9Section1FieldProps {
  label: string;
  value: unknown;
  onChange: (v: UscisI9Section1Value) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function UscisI9Section1Field({
  label,
  value,
  onChange,
  error,
  required,
  disabled,
}: UscisI9Section1FieldProps) {
  const v = React.useMemo(() => normalizeUscisI9Section1Value(value), [value]);
  const sigRef = React.useRef<HTMLDivElement>(null);

  function patch(p: Partial<UscisI9Section1Value>) {
    onChange({ ...v, ...p });
  }

  function scrollToSignature() {
    sigRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onViewPdf() {
    window.open("https://www.uscis.gov/i-9", "_blank", "noopener,noreferrer");
    toast.info(t("Open the official USCIS Form I-9 instructions and PDF in a new tab."));
  }

  return (
    <div className="space-y-3 col-span-full">
      <div className="flex items-start gap-2">
        <p className="text-sm font-medium text-slate-900 flex-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Action header */}
        <div className="bg-[#1e40af] text-white px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
              <FileText className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">
                {t("USCIS Form I-9 — Employment Eligibility Verification")}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
            {t("Action required")}
          </span>
        </div>

        <div className="bg-slate-100/80 p-4 sm:p-5">
          {/* Mini form header */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4 pb-3 border-b border-slate-200/80">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {t("Form I-9 Employment Eligibility Verification")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
                {t(
                  "SECTION 1. EMPLOYEE INFORMATION AND ATTESTATION — Complete all fields. Your electronic signature is collected below.",
                )}
              </p>
            </div>
            <div className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">
              {t("Section 1")}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <FieldShell label={t("Last name (family name)")} required className="sm:col-span-4">
                <Input
                  className={inputClass}
                  disabled={disabled}
                  value={v.lastName}
                  onChange={(e) => patch({ lastName: e.target.value })}
                />
              </FieldShell>
              <FieldShell label={t("First name (given name)")} required className="sm:col-span-4">
                <Input
                  className={inputClass}
                  disabled={disabled}
                  value={v.firstName}
                  onChange={(e) => patch({ firstName: e.target.value })}
                />
              </FieldShell>
              <FieldShell label={t("Middle initial")} className="sm:col-span-4">
                <Input
                  className={inputClass}
                  disabled={disabled}
                  maxLength={1}
                  value={v.middleInitial}
                  onChange={(e) => patch({ middleInitial: e.target.value })}
                />
              </FieldShell>
            </div>

            <FieldShell label={t("Address (street name and number)")} required>
              <Input
                className={inputClass}
                disabled={disabled}
                value={v.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </FieldShell>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <FieldShell label={t("City or town")} required className="sm:col-span-4">
                <Input
                  className={inputClass}
                  disabled={disabled}
                  value={v.city}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </FieldShell>
              <FieldShell label={t("State")} required className="sm:col-span-3">
                <Input
                  className={inputClass}
                  disabled={disabled}
                  value={v.state}
                  onChange={(e) => patch({ state: e.target.value })}
                />
              </FieldShell>
              <FieldShell label={t("ZIP code")} required className="sm:col-span-5">
                <Input
                  className={inputClass}
                  disabled={disabled}
                  value={v.zip}
                  onChange={(e) => patch({ zip: e.target.value })}
                />
              </FieldShell>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <FieldShell label={t("Date of birth")} required className="sm:col-span-3">
                <Input
                  type="date"
                  className={inputClass}
                  disabled={disabled}
                  value={v.dob}
                  onChange={(e) => patch({ dob: e.target.value })}
                />
              </FieldShell>
              <FieldShell label={t("U.S. Social Security number")} required className="sm:col-span-3">
                <Input
                  className={inputClass}
                  disabled={disabled}
                  value={v.ssn}
                  onChange={(e) => patch({ ssn: e.target.value })}
                  autoComplete="off"
                />
              </FieldShell>
              <FieldShell label={t("Employee's email address")} required className="sm:col-span-3">
                <Input
                  type="email"
                  className={inputClass}
                  disabled={disabled}
                  value={v.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </FieldShell>
              <FieldShell label={t("Employee's telephone number")} required className="sm:col-span-3">
                <PhoneInput
                  className={inputClass}
                  disabled={disabled}
                  value={v.phone}
                  onChange={(phone) => patch({ phone })}
                />
              </FieldShell>
            </div>

            {/* Attestation */}
            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-2">
                {t("Attestation — I attest, under penalty of perjury, that I am (check one):")}
              </p>
              <div className="space-y-2">
                {(
                  [
                    ["1", t("A citizen of the United States.")],
                    ["2", t("A noncitizen national of the United States.")],
                    ["3", t("A lawful permanent resident.")],
                    ["4", t("An alien authorized to work until an expiration date.")],
                  ] as const
                ).map(([val, text]) => (
                  <label
                    key={val}
                    className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="i9-attestation"
                      className="mt-1 accent-blue-600"
                      disabled={disabled}
                      checked={v.attestation === val}
                      onChange={() => patch({ attestation: val })}
                    />
                    <span>
                      <span className="font-medium text-slate-900">{val}.</span> {text}
                    </span>
                  </label>
                ))}
              </div>
              {v.attestation === "3" && (
                <div className="mt-3 max-w-md">
                  <FieldShell label={t("Alien Registration No. / USCIS No.")} required>
                    <Input
                      className={inputClass}
                      disabled={disabled}
                      value={v.alienRegistrationNo}
                      onChange={(e) => patch({ alienRegistrationNo: e.target.value })}
                    />
                  </FieldShell>
                </div>
              )}
              {v.attestation === "4" && (
                <div className="mt-3 max-w-xs">
                  <FieldShell label={t("Expiration date (authorized to work until)")} required>
                    <Input
                      type="date"
                      className={inputClass}
                      disabled={disabled}
                      value={v.workAuthorizedUntil}
                      onChange={(e) => patch({ workAuthorizedUntil: e.target.value })}
                    />
                  </FieldShell>
                </div>
              )}
            </div>

            {/* Signature block */}
            <div
              ref={sigRef}
              className="rounded-lg border-2 border-amber-300/90 bg-amber-50/50 p-4 space-y-3 mt-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
                  onClick={scrollToSignature}
                  disabled={disabled}
                >
                  <PenLine className="h-4 w-4" />
                  {t("Sign here")}
                </Button>
                <p className="text-xs text-slate-700 flex-1 min-w-[200px]">
                  {t(
                    "I attest, under penalty of perjury, that this information is true and correct. Draw your signature below and type your full legal name.",
                  )}
                </p>
              </div>
              <SignaturePad
                value={v.signatureCanvas}
                onChange={(dataUrl) => patch({ signatureCanvas: dataUrl })}
                disabled={disabled}
                clearLabel={t("Clear Signature")}
                clearButtonClassName="text-red-600 hover:text-red-700 hover:bg-red-50 border-0 shadow-none"
                clearButtonVariant="ghost"
              />
              <FieldShell label={t("Signature of employee (type full legal name)")} required>
                <Input
                  className={cn(inputClass, "bg-amber-100/80 border-amber-200")}
                  disabled={disabled}
                  value={v.typedSignature}
                  onChange={(e) => patch({ typedSignature: e.target.value })}
                />
              </FieldShell>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldShell label={t("Today's date")} required>
                  <Input
                    type="date"
                    className={cn(inputClass, "bg-amber-100/80 border-amber-200")}
                    disabled={disabled}
                    value={v.signatureDate}
                    onChange={(e) => patch({ signatureDate: e.target.value })}
                  />
                </FieldShell>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onViewPdf}
                disabled={disabled}
              >
                <Eye className="h-4 w-4" />
                {t("View PDF")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={disabled}
                onClick={() => {
                  patch({ section1Acknowledged: true });
                  toast.success(t("Section 1 marked complete. Submit the full packet when ready."));
                }}
              >
                <FileText className="h-4 w-4" />
                {t("Sign & Submit Section 1")}
              </Button>
            </div>
            {v.section1Acknowledged && (
              <p className="text-xs text-green-700 font-medium">✓ {t("Section 1 signed and acknowledged.")}</p>
            )}

            <p className="text-[10px] text-muted-foreground pt-1">
              {t("Form I-9 (Rev. 08/01/23) — Employment Eligibility Verification (demo layout).")}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
