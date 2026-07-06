import { isStructuralFieldType } from "@/components/form-builder/form-field-types";
import { isLicenseDocumentsComplete } from "@/components/form-builder/license-documents-field";
import { isUscisI9Section1Complete } from "@/components/form-builder/uscis-i9-section1-field";
import { isBackgroundCheckConsentComplete } from "@/components/form-builder/background-check-consent-field";
import { isDrugTestingConsentComplete } from "@/components/form-builder/drug-testing-consent-field";
import { isNdaConsentComplete } from "@/components/form-builder/nda-consent-field";
import { isSignatureValueComplete } from "@/components/form-builder/signature-pad";

export type ValidatableField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: unknown;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

function digitCount(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

function isValidHttpUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    return Boolean(u.hostname && u.hostname.includes("."));
  } catch {
    return false;
  }
}

/**
 * Returns a single validation message for one field, or null if valid.
 * Use for required checks, composite blocks, and format when a value is present.
 */
export function validateField(field: ValidatableField, value: unknown): string | null {
  if (isStructuralFieldType(field.type)) return null;

  const projectOnlyTypes = new Set([
    "file",
    "project_roster",
    "project_members",
    "project_users",
    "project_stages",
    "project_milestones",
    "project_vendors",
  ]);
  if (projectOnlyTypes.has(field.type)) {
    if (field.required && (value == null || value === "" || (Array.isArray(value) && value.length === 0))) {
      return `${field.label || "Field"} is required`;
    }
    return null;
  }

  const label = field.label || "Field";

  if (field.type === "checkbox") {
    if (field.required && value !== true) {
      return `${label} must be checked`;
    }
    return null;
  }

  if (field.type === "signature") {
    if (field.required && !isSignatureValueComplete(value)) {
      return `${label}: signature is required`;
    }
    return null;
  }

  if (field.type === "license_documents") {
    if (field.required && !isLicenseDocumentsComplete(value, field.options)) {
      return `${label}: upload front and back for each document`;
    }
    return null;
  }

  if (field.type === "uscis_i9_section1") {
    if (field.required && !isUscisI9Section1Complete(value)) {
      return `${label}: complete all fields, attestation, signature, and Sign & Submit Section 1`;
    }
    return null;
  }

  if (field.type === "background_check_consent") {
    if (field.required && !isBackgroundCheckConsentComplete(value)) {
      return `${label}: sign and submit, or decline`;
    }
    return null;
  }

  if (field.type === "drug_testing_consent") {
    if (field.required && !isDrugTestingConsentComplete(value)) {
      return `${label}: sign and submit`;
    }
    return null;
  }

  if (field.type === "nda_consent") {
    if (field.required && !isNdaConsentComplete(value)) {
      return `${label}: sign and submit`;
    }
    return null;
  }

  const str =
    field.type === "number"
      ? value === undefined || value === null
        ? ""
        : String(value).trim()
      : typeof value === "string"
        ? value.trim()
        : value === undefined || value === null
          ? ""
          : String(value).trim();

  const selectPlaceholder =
    (field.type === "select" || field.type === "radio") && (str === "Select" || str === "Select...");
  const empty = str === "" || selectPlaceholder;

  if (field.required && empty) {
    return `${label} is required`;
  }

  if (empty) return null;

  switch (field.type) {
    case "email":
      if (!EMAIL_RE.test(str)) {
        return `${label}: enter a valid email address`;
      }
      break;
    case "tel": {
      if (digitCount(str) < 10) {
        return `${label}: enter a valid phone number (at least 10 digits)`;
      }
      break;
    }
    case "url":
      if (!isValidHttpUrl(str)) {
        return `${label}: enter a valid URL`;
      }
      break;
    case "number": {
      const n = Number(str);
      if (Number.isNaN(n)) {
        return `${label}: enter a valid number`;
      }
      break;
    }
    case "date":
      if (!DATE_RE.test(str)) {
        return `${label}: enter a valid date`;
      }
      break;
    case "time":
      if (!TIME_RE.test(str)) {
        return `${label}: enter a valid time`;
      }
      break;
    case "select":
    case "radio":
      if (!str) {
        return `${label}: make a selection`;
      }
      break;
    default:
      break;
  }

  return null;
}

/** Collect all field error messages keyed as `field_${id}` (for forms & API). */
export function collectFieldErrors(
  fields: ValidatableField[],
  values: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (isStructuralFieldType(f.type)) continue;
    const err = validateField(f, values[`field_${f.id}`]);
    if (err) out[`field_${f.id}`] = err;
  }
  return out;
}
