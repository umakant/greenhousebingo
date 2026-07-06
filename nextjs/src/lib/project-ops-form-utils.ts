import type { FormFieldDef } from "@/components/form-builder/form-field-types";
import { isStructuralFieldType } from "@/components/form-builder/form-field-types";

export function getFieldBindKey(field: Pick<FormFieldDef, "id" | "options">): string {
  const opts = field.options;
  if (opts && typeof opts === "object" && !Array.isArray(opts)) {
    const bindKey = (opts as { bindKey?: unknown }).bindKey;
    if (typeof bindKey === "string" && bindKey.trim()) return bindKey.trim();
  }
  return field.id;
}

export function mapFormValuesToPayload(
  fields: FormFieldDef[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    if (isStructuralFieldType(field.type)) continue;
    const key = getFieldBindKey(field);
    const raw = values[`field_${field.id}`];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "string" && raw.trim() === "") continue;
    payload[key] = raw;
  }
  return payload;
}

export function mapPayloadToFormValues(
  fields: FormFieldDef[],
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (isStructuralFieldType(field.type)) continue;
    const key = getFieldBindKey(field);
    if (!(key in payload)) continue;
    values[`field_${field.id}`] = payload[key];
  }
  return values;
}

export function serializeFormField(field: {
  id: bigint | string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  options: unknown;
  order: number;
}): FormFieldDef {
  return {
    id: field.id.toString(),
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder ?? "",
    options: field.options != null ? field.options : [],
    order: field.order,
  };
}

export function normalizeAssignedTo(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n));
  }
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  return [];
}

export function coerceOptionalId(value: unknown): number | null {
  if (value == null || value === "" || value === "__none__") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
