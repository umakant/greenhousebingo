"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/form-builder/signature-pad";
import { LicenseDocumentsField } from "@/components/form-builder/license-documents-field";
import { UscisI9Section1Field } from "@/components/form-builder/uscis-i9-section1-field";
import { BackgroundCheckConsentField } from "@/components/form-builder/background-check-consent-field";
import { DrugTestingConsentField } from "@/components/form-builder/drug-testing-consent-field";
import { NdaConsentField } from "@/components/form-builder/nda-consent-field";
import { cn } from "@/lib/utils";
import { asSelectOptions } from "@/components/form-builder/form-field-types";
import { t } from "@/lib/admin-t";


/** Default Prefix dropdown (template + legacy forms saved as text). */
const DEFAULT_PREFIX_OPTIONS = ["Select...", "Mr.", "Ms.", "Mrs.", "Miss", "Mx.", "Dr.", "Prof."];

/**
 * Onboarding Prefix is a select in the template; older DB rows may still be `text` or have bad options.
 * Coerce so the field always renders as a dropdown like Suffix.
 */
function getEffectiveField(field: FormFieldDef): FormFieldDef {
  if (field.id !== "onb_prefix") return field;

  const opts = asSelectOptions(field.options);
  const needsCoerce = field.type === "text" || (field.type === "select" && opts.length === 0);

  if (!needsCoerce) return field;

  return {
    ...field,
    type: "select",
    options: [...DEFAULT_PREFIX_OPTIONS],
    placeholder: field.placeholder?.trim() || "Select...",
  };
}

interface FormFieldDef {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: unknown;
}

interface Props {
  field: FormFieldDef;
  value: any;
  onChange: (val: any) => void;
  error?: string;
  /** Underline-style inputs for onboarding layout */
  inputVariant?: "default" | "underline";
}

const underlineInput =
  "border-0 border-b border-input rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent";

export function FormFieldRenderer({ field: fieldIn, value, onChange, error, inputVariant = "default" }: Props) {
  const field = React.useMemo(() => getEffectiveField(fieldIn), [fieldIn]);
  const fieldId = `field_${field.id}`;
  const u = inputVariant === "underline";

  if (field.type === "heading") {
    return (
      <p className="pt-4 text-[11px] font-bold uppercase tracking-wider text-[#6b2d30] first:pt-0">{field.label}</p>
    );
  }
  if (field.type === "description") {
    return <p className="text-sm text-muted-foreground leading-relaxed">{field.label}</p>;
  }
  if (field.type === "section") {
    return (
      <div className="col-span-full mt-6 first:mt-0 pt-4 border-t border-slate-200">
        <h3 className="text-base font-semibold text-slate-900">{field.label}</h3>
      </div>
    );
  }

  if (field.type === "license_documents") {
    return (
      <LicenseDocumentsField
        fieldId={fieldId}
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        error={error}
        required={field.required}
      />
    );
  }

  if (field.type === "uscis_i9_section1") {
    return (
      <UscisI9Section1Field
        label={field.label}
        value={value}
        onChange={onChange}
        error={error}
        required={field.required}
      />
    );
  }

  if (field.type === "background_check_consent") {
    return (
      <BackgroundCheckConsentField
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        error={error}
        required={field.required}
      />
    );
  }

  if (field.type === "drug_testing_consent") {
    return (
      <DrugTestingConsentField
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        error={error}
        required={field.required}
      />
    );
  }

  if (field.type === "nda_consent") {
    return (
      <NdaConsentField
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        error={error}
        required={field.required}
      />
    );
  }

  if (field.type === "signature") {
    const sigVal = typeof value === "string" ? value : "";
    return (
      <div className="space-y-1.5 col-span-full">
        <Label
          className={cn("text-sm font-medium", u && "text-xs text-muted-foreground font-normal")}
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <p className={cn("text-xs text-muted-foreground", u && "hidden")}>
          {field.placeholder || t("Draw your signature below")}
        </p>
        <SignaturePad
          value={sigVal}
          onChange={onChange}
          className={u ? "[&_.rounded-md]:border-0 [&_.rounded-md]:border-b [&_.rounded-md]:rounded-none [&_.rounded-md]:bg-transparent" : undefined}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  function renderInput() {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={fieldId}
            placeholder={field.placeholder}
            required={field.required}
            value={value ?? ""}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className={cn(error ? "border-red-500" : "", u && underlineInput, u && "min-h-[88px]")}
          />
        );

      case "select": {
        const opts = asSelectOptions(field.options);
        const strVal = value === undefined || value === null ? "" : String(value);
        const selectValue = strVal !== "" && opts.includes(strVal) ? strVal : undefined;
        return (
          <Select value={selectValue} onValueChange={onChange} required={field.required}>
            <SelectTrigger
              className={cn(
                error ? "border-red-500" : "",
                u && underlineInput,
                u && "h-10 w-full min-w-0",
              )}
            >
              <SelectValue placeholder={field.placeholder?.trim() || "Select..."} />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {opts.map((opt, i) => (
                <SelectItem key={`${opt}-${i}`} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "radio":
        return (
          <div className="space-y-2">
            {asSelectOptions(field.options).map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={fieldId}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  required={field.required}
                  className="accent-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={fieldId}
              checked={!!value}
              onCheckedChange={checked => onChange(!!checked)}
            />
            <Label htmlFor={fieldId} className="text-sm font-normal cursor-pointer" required={field.required}>
              {field.label}
            </Label>
          </div>
        );

      case "date":
        return (
          <DatePickerInput
            id={fieldId}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            variant={u ? "underline" : "default"}
            className={cn(error && "border-destructive")}
          />
        );

      case "tel":
      case "phone":
        return (
          <PhoneInput
            id={fieldId}
            placeholder={field.placeholder?.trim() || "(000) 000-0000"}
            required={field.required}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={onChange}
            className={cn(error ? "border-red-500" : "", u && underlineInput)}
          />
        );

      default:
        return (
          <Input
            id={fieldId}
            type={field.type}
            placeholder={field.placeholder}
            required={field.required}
            value={value ?? ""}
            onChange={e => onChange(e.target.value)}
            className={cn(error ? "border-red-500" : "", u && underlineInput)}
          />
        );
    }
  }

  if (field.type === "checkbox") {
    return (
      <div className="space-y-1">
        {renderInput()}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={fieldId}
        className={cn("text-sm font-medium", u && "text-xs text-muted-foreground font-normal")}
      >
        {field.label}
      </Label>
      {renderInput()}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
