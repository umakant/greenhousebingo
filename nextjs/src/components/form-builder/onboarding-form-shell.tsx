"use client";

import * as React from "react";
import { Calendar, Check, ChevronDown, ChevronUp, Circle, Mail, Save, User } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormFieldRenderer } from "@/components/form-builder/form-field-renderer";
import { getFieldGridCols, isStructuralFieldType } from "@/components/form-builder/form-field-types";
import { isLicenseDocumentsComplete } from "@/components/form-builder/license-documents-field";
import { isBackgroundCheckConsentComplete } from "@/components/form-builder/background-check-consent-field";
import { isDrugTestingConsentComplete } from "@/components/form-builder/drug-testing-consent-field";
import { isNdaConsentComplete } from "@/components/form-builder/nda-consent-field";
import { isUscisI9Section1Complete } from "@/components/form-builder/uscis-i9-section1-field";
import { isSignatureValueComplete } from "@/components/form-builder/signature-pad";
import { collectFieldErrors } from "@/lib/form-field-validation";
import { t } from "@/lib/admin-t";


/** Primary blue — progress, links, completion accents (matches reference UI). */
const OB_BLUE = "#0056b3";
/** Maroon — subsection headings, primary actions. */
const OB_MAROON = "#6b2d30";

export interface OnboardingField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options: unknown;
  order: number;
}

const GRID_CLASS: Record<2 | 3 | 4, string> = {
  2: "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5",
  3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5",
  4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5",
};

/** Select first options that mean “no choice yet” — must not count as progress. */
function isSelectPlaceholderValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const s = String(value).trim();
  if (s === "") return true;
  return s === "Select" || s === "Select...";
}

function hasFilledValue(value: unknown, type: string, required: boolean, options?: unknown): boolean {
  if (type === "select") {
    if (isSelectPlaceholderValue(value)) return !required;
    return true;
  }
  if (type === "license_documents") {
    if (!required) return true;
    return isLicenseDocumentsComplete(value, options);
  }
  if (type === "uscis_i9_section1") {
    if (!required) return true;
    return isUscisI9Section1Complete(value);
  }
  if (type === "background_check_consent") {
    if (!required) return true;
    return isBackgroundCheckConsentComplete(value);
  }
  if (type === "drug_testing_consent") {
    if (!required) return true;
    return isDrugTestingConsentComplete(value);
  }
  if (type === "nda_consent") {
    if (!required) return true;
    return isNdaConsentComplete(value);
  }
  if (type === "signature") {
    if (!required) return true;
    return isSignatureValueComplete(value);
  }
  if (type === "checkbox") {
    if (required) return value === true;
    return value === true || value === false;
  }
  if (value === undefined || value === null) return !required;
  if (typeof value === "string") return value.trim() !== "" || !required;
  return true;
}

export function groupFieldsBySection(fields: OnboardingField[], formName: string): { title: string; fields: OnboardingField[] }[] {
  const sorted = [...fields].sort((a, b) => a.order - b.order);
  const groups: { title: string; fields: OnboardingField[] }[] = [];
  let curTitle = formName;
  let cur: OnboardingField[] = [];

  for (const f of sorted) {
    if (f.type === "section") {
      if (cur.length > 0) {
        groups.push({ title: curTitle, fields: cur });
      }
      curTitle = f.label;
      cur = [];
    } else {
      cur.push(f);
    }
  }
  if (cur.length > 0 || groups.length === 0) {
    groups.push({ title: curTitle, fields: cur });
  }
  return groups;
}

/**
 * Section is complete when every required field is satisfied.
 * If nothing is marked required (legacy/custom forms), we do not guess completion from partial input —
 * that caused false progress (e.g. only Prefix or DOB filled). Mark fields required in the form builder
 * or use the onboarding template defaults.
 */
function sectionIsComplete(sectionFields: OnboardingField[], values: Record<string, unknown>): boolean {
  const dataFields = sectionFields.filter((f) => !isStructuralFieldType(f.type));
  if (dataFields.length === 0) return false;

  const requiredFields = dataFields.filter((f) => f.required);
  if (requiredFields.length === 0) return false;

  for (const f of requiredFields) {
    const v = values[`field_${f.id}`];
    if (!hasFilledValue(v, f.type, true, f.options)) return false;
  }
  return true;
}

function maxGridColsForSection(fields: OnboardingField[]): 2 | 3 | 4 {
  let maxN = 0;
  for (const f of fields) {
    const g = getFieldGridCols(f.options);
    if (g && g > maxN) maxN = g;
  }
  if (maxN === 2 || maxN === 3 || maxN === 4) return maxN;
  return 4;
}

interface OnboardingFormShellProps {
  formName: string;
  fields: OnboardingField[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: string, v: unknown) => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  children?: React.ReactNode;
  /** Shown in welcome line after the form name, e.g. first name → "Welcome to …, Jane!" */
  candidateFirstName?: string;
  /** Full override for the main H1 (skips default welcome pattern). */
  welcomeHeading?: string;
  /** ISO date string for “You were invited on …” (optional). */
  invitedAt?: string;
}

export function OnboardingFormShell({
  formName,
  fields,
  values,
  errors,
  onChange,
  setErrors,
  children,
  candidateFirstName,
  welcomeHeading,
  invitedAt,
}: OnboardingFormShellProps) {
  const groups = React.useMemo(() => groupFieldsBySection(fields, formName), [fields, formName]);
  /** Outer “Onboarding Packet” accordion — collapses all sections. */
  const [packetOpen, setPacketOpen] = React.useState(true);

  const welcomeLine =
    welcomeHeading?.trim() ||
    (candidateFirstName?.trim()
      ? `${t("Welcome to")} ${formName}, ${candidateFirstName.trim()}!`
      : `${t("Welcome to")} ${formName}`);

  const invitedLabel = React.useMemo(() => {
    if (!invitedAt?.trim()) return null;
    try {
      const d = new Date(invitedAt);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [invitedAt]);

  /** Completion is driven only by filled required fields (not by Save clicks). */
  const { completedSections, progressPct, sectionCompleteFlags } = React.useMemo(() => {
    const flags: boolean[] = [];
    let done = 0;
    groups.forEach((g) => {
      const complete = sectionIsComplete(g.fields, values);
      flags.push(complete);
      if (complete) done += 1;
    });
    const pct = groups.length ? Math.round((done / groups.length) * 100) : 0;
    return { completedSections: done, progressPct: pct, sectionCompleteFlags: flags };
  }, [groups, values]);

  function handleSectionSave(sectionFields: OnboardingField[]) {
    const dataFields = sectionFields.filter((f) => !isStructuralFieldType(f.type));
    const fieldErrors = collectFieldErrors(dataFields, values);
    const validationOk = Object.keys(fieldErrors).length === 0;
    const complete = sectionIsComplete(sectionFields, values);

    setErrors((prev) => {
      const next = { ...prev };
      for (const f of sectionFields) {
        if (isStructuralFieldType(f.type)) continue;
        delete next[`field_${f.id}`];
      }
      if (!validationOk) Object.assign(next, fieldErrors);
      return next;
    });

    if (!validationOk) {
      toast.error(t("Please fix the highlighted fields in this section."));
      return;
    }
    if (dataFields.length === 0) {
      toast.error(t("This section has no fields to save."));
      return;
    }
    if (!complete) {
      const reqN = dataFields.filter((f) => f.required).length;
      toast.error(
        reqN === 0
          ? t("This section has no required fields. Mark fields as required in the form builder to track progress.")
          : t("Complete all required fields in this section before saving."),
      );
      return;
    }
    toast.success(t("Section saved."));
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_min(340px,100%)] gap-8 lg:gap-10 items-start">
        {/* Main column */}
        <div className="space-y-4 min-w-0">
          {/* Hero — matches reference: welcome + full-width progress + invite row */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{welcomeLine}</h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                {t("Your all-in-one onboarding guide. Complete each step to be fully ready for your first day.")}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-sm">
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${progressPct}%`, backgroundColor: OB_BLUE }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="font-semibold text-slate-900">
                  {t("Progress")}{" "}
                  <span className="tabular-nums" style={{ color: OB_BLUE }}>
                    {progressPct}%
                  </span>
                </p>
                {invitedLabel ? (
                  <p className="text-muted-foreground text-sm">
                    {t("You were invited on")}{" "}
                    <span className="font-medium text-slate-800">{invitedLabel}</span>{" "}
                    <button type="button" className="font-medium hover:underline" style={{ color: OB_BLUE }}>
                      {t("Update")}
                    </button>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("You were invited on")}{" "}
                    <span className="font-medium text-slate-800">{t("—")}</span>{" "}
                    <span className="font-medium opacity-50" style={{ color: OB_BLUE }}>
                      {t("Update")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Outer packet accordion — wraps all section panels */}
          <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-md text-slate-900 dark:bg-white dark:text-slate-900">
            <Collapsible open={packetOpen} onOpenChange={setPacketOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 border-b border-slate-100 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50/80"
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm"
                    style={{
                      background: `linear-gradient(180deg, ${OB_BLUE} 0%, #004494 100%)`,
                      color: "white",
                    }}
                  >
                    <Circle className="h-3.5 w-3.5 fill-current opacity-90" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-slate-900">{formName}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {completedSections} {t("of")} {groups.length} {t("sections completed")}
                    </span>
                    <span className="mt-2 block text-sm text-slate-600">
                      {t("Complete all required employee information before your first day.")}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium hover:underline" style={{ color: OB_BLUE }}>
                    {packetOpen ? t("View less") : t("View more")}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 border-0 px-4 pb-6 pt-4 shadow-none sm:px-5">
                  {groups.map((g, idx) => (
                    <SectionPanel
                      key={`${g.title}-${idx}`}
                      title={g.title}
                      defaultOpen={idx === 0}
                      fields={g.fields}
                      values={values}
                      errors={errors}
                      onChange={onChange}
                      gridClassName={GRID_CLASS[maxGridColsForSection(g.fields)]}
                      done={!!sectionCompleteFlags[idx]}
                      onSaveSection={() => handleSectionSave(g.fields)}
                    />
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
            {children ? (
              <div className="border-t border-slate-100 bg-white px-4 py-5 sm:px-5">{children}</div>
            ) : null}
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white py-3 pl-4 pr-4">
              <CardTitle
                className="border-l-4 border-red-600 pl-3 text-xs font-bold uppercase tracking-wider text-slate-900"
              >
                {t("Important dates")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 text-sm">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Start date")}</p>
                <p className="mt-1 font-semibold text-slate-900 tabular-nums">{t("—")}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("Onboarding packet due")}
                </p>
                <p className="mt-1 font-semibold tabular-nums text-amber-700">{t("—")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 border-2 bg-white font-medium shadow-none hover:bg-slate-50"
                style={{ borderColor: OB_BLUE, color: OB_BLUE }}
                disabled
              >
                <Calendar className="h-4 w-4" />
                {t("View calendar")}
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white py-3 pl-4 pr-4">
              <CardTitle className="border-l-4 border-red-600 pl-3 text-xs font-bold uppercase tracking-wider text-slate-900">
                {t("Your HR team")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${OB_BLUE}18`, color: OB_BLUE }}
                >
                  <User className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{t("Sarah Mitchell")}</p>
                  <p className="text-xs text-muted-foreground">{t("HR Coordinator")}</p>
                  <p className="text-xs text-muted-foreground">{t("Contact your administrator to assign an HR partner.")}</p>
                  <a
                    href="mailto:hr@company.com"
                    className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline truncate"
                    style={{ color: OB_BLUE }}
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    hr@company.com
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white py-3 pl-4 pr-4">
              <CardTitle className="border-l-4 border-red-600 pl-3 text-xs font-bold uppercase tracking-wider text-slate-900">
                {t("Progress summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2.5">
                {groups.map((g, i) => {
                  const done = !!sectionCompleteFlags[i];
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          done ? "text-white" : "border-slate-300 bg-white text-slate-300"
                        }`}
                        style={
                          done
                            ? { borderColor: OB_BLUE, backgroundColor: OB_BLUE }
                            : undefined
                        }
                      >
                        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-2 w-2 fill-current" />}
                      </span>
                      <span className={done ? "font-medium text-slate-900" : "text-muted-foreground"}>{g.title}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-muted-foreground">
                {completedSections} {t("of")} {groups.length} {t("sections complete")}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SectionPanel({
  title,
  defaultOpen,
  fields,
  values,
  errors,
  onChange,
  gridClassName,
  done,
  onSaveSection,
}: {
  title: string;
  defaultOpen: boolean;
  fields: OnboardingField[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: string, v: unknown) => void;
  gridClassName: string;
  done: boolean;
  onSaveSection: () => void;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-t-lg bg-slate-50 px-4 py-3.5 text-left hover:bg-slate-100/90">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            done ? "text-white" : "border-slate-300 bg-white text-slate-300"
          }`}
          style={
            done ? { borderColor: OB_BLUE, backgroundColor: OB_BLUE } : undefined
          }
        >
          {done ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Circle className="h-3 w-3 fill-current" aria-hidden />
          )}
        </span>
        <span className="flex-1 font-semibold text-slate-900">{title}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-5 pt-1 border-t border-slate-100">
          <div className={gridClassName}>
            {fields.map((field) => (
              <StructuralOrField
                key={field.id}
                field={field}
                value={values[`field_${field.id}`]}
                error={errors[`field_${field.id}`]}
                onChange={(v) => onChange(field.id, v)}
                colSpan={gridSpan(field)}
              />
            ))}
          </div>
          <div className="mt-6 flex justify-start border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="default"
              size="default"
              className="gap-2 text-white shadow-sm hover:opacity-95"
              style={{ backgroundColor: OB_MAROON }}
              onClick={onSaveSection}
            >
              <Save className="h-4 w-4" />
              {t("Save")}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function gridSpan(field: OnboardingField): "full" | "normal" {
  if (field.type === "heading" || field.type === "description") return "full";
  if (
    field.type === "textarea" ||
    field.type === "signature" ||
    field.type === "license_documents" ||
    field.type === "uscis_i9_section1" ||
    field.type === "background_check_consent" ||
    field.type === "drug_testing_consent" ||
    field.type === "nda_consent"
  ) {
    return "full";
  }
  return "normal";
}

function StructuralOrField({
  field,
  value,
  error,
  onChange,
  colSpan,
}: {
  field: OnboardingField;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
  colSpan: "full" | "normal";
}) {
  const wrap = (node: React.ReactNode) => (
    <div className={colSpan === "full" ? "col-span-full sm:col-span-full" : "min-w-0"}>{node}</div>
  );

  if (field.type === "heading") {
    return wrap(
      <p
        className="pt-4 text-[11px] font-bold uppercase tracking-wider first:pt-0"
        style={{ color: OB_MAROON }}
      >
        {field.label}
      </p>,
    );
  }
  if (field.type === "description") {
    return wrap(<p className="text-sm text-muted-foreground leading-relaxed pt-2">{field.label}</p>);
  }

  return wrap(
    <FormFieldRenderer
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      inputVariant="underline"
    />,
  );
}

export function OnboardingSubmitBar({ submitting, disabled }: { submitting: boolean; disabled?: boolean }) {
  return (
    <div className="mt-2 flex justify-end border-t border-slate-200 pt-4">
      <Button
        type="submit"
        disabled={submitting || disabled}
        size="lg"
        className="min-w-[220px] text-white shadow-sm hover:opacity-95"
        style={{ backgroundColor: OB_MAROON }}
      >
        {submitting ? t("Submitting…") : t("Submit full packet")}
      </Button>
    </div>
  );
}
