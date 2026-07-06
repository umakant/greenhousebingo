import {
  Type, Mail, Hash, Phone, Link, Lock, FileText,
  List, RadioIcon, CheckSquare, Calendar, Clock, FileSignature,
  Heading2, PanelsTopLeft, TextQuote, Files, ScrollText, ShieldCheck, FlaskConical, Scale,
  Upload, Users, Building2, Milestone,
} from "lucide-react";

/** Shared form definition (editor, API, public renderer). */
export interface FormFieldDef {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  /** Select/radio/checkbox: string[]. Onboarding layout hints: `{ gridCols: 3 }` etc. */
  options: unknown;
  order: number;
}

/** Options list for select / radio / checkbox fields. */
export function asSelectOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.map((o) => String(o));
  if (options && typeof options === "object") {
    const obj = options as { choices?: unknown; selectOptions?: unknown };
    const list = obj.choices ?? obj.selectOptions;
    if (Array.isArray(list)) return list.map((o) => String(o));
  }
  return [];
}

/** Optional column count for onboarding grid rows (from field.options object). */
export function getFieldGridCols(options: unknown): 2 | 3 | 4 | null {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const n = Number((options as { gridCols?: unknown }).gridCols);
  if (n === 2 || n === 3 || n === 4) return n;
  return null;
}

export const FIELD_TYPES = [
  { value: "text",     label: "Text Input",       icon: Type },
  { value: "email",    label: "Email",             icon: Mail },
  { value: "number",   label: "Number",            icon: Hash },
  { value: "tel",      label: "Phone",             icon: Phone },
  { value: "url",      label: "URL",               icon: Link },
  { value: "password", label: "Password",          icon: Lock },
  { value: "textarea", label: "Textarea",          icon: FileText },
  { value: "select",   label: "Select Dropdown",   icon: List },
  { value: "radio",    label: "Radio Buttons",     icon: RadioIcon },
  { value: "checkbox", label: "Checkbox",          icon: CheckSquare },
  { value: "date",     label: "Date",              icon: Calendar },
  { value: "time",     label: "Time",              icon: Clock },
  { value: "file",     label: "File upload",       icon: Upload },
  { value: "signature", label: "Signature",        icon: FileSignature },
  /** Project ops: roster / team pickers (used inside project sections) */
  { value: "project_roster", label: "Project roster", icon: Users },
  { value: "project_members", label: "Project members (multi)", icon: Users },
  { value: "project_users", label: "Company users", icon: Users },
  { value: "project_stages", label: "Project stage", icon: List },
  { value: "project_milestones", label: "Project milestones", icon: Milestone },
  { value: "project_vendors", label: "Vendor roster", icon: Building2 },
  /** Front/back document uploads per card (onboarding-style license grid) */
  { value: "license_documents", label: "License documents", icon: Files },
  /** Form I-9 Section 1 (employee info, attestation, signature) */
  { value: "uscis_i9_section1", label: "USCIS I-9 Section 1", icon: ScrollText },
  /** Background check consent card (decline or sign + submit) */
  { value: "background_check_consent", label: "Background check consent", icon: ShieldCheck },
  /** Pre-employment drug testing consent (sign + submit) */
  { value: "drug_testing_consent", label: "Drug testing consent", icon: FlaskConical },
  /** NDA: legal document body + signature */
  { value: "nda_consent", label: "NDA (non-disclosure)", icon: Scale },
  /** Starts a collapsible panel (onboarding layout); label = section title */
  { value: "section",  label: "Section (accordion)", icon: PanelsTopLeft },
  /** Maroon uppercase group label (e.g. CONTACT, ADDRESS) */
  { value: "heading",  label: "Group heading",    icon: Heading2 },
  /** Static help text; label = content */
  { value: "description", label: "Description text", icon: TextQuote },
] as const;

export type FieldType = typeof FIELD_TYPES[number]["value"];

export function needsOptions(type: string) {
  return type === "select" || type === "radio" || type === "checkbox";
}

export const LAYOUT_OPTIONS = [
  { value: "single",     label: "Single Column" },
  { value: "two-column", label: "Two Column" },
  { value: "card",       label: "Card Per Field" },
  { value: "onboarding", label: "Onboarding packet (sections + progress)" },
];

/** Fields that do not collect answers (layout chrome). */
export const STRUCTURAL_FIELD_TYPES = new Set<string>(["section", "heading", "description"]);

export function isStructuralFieldType(type: string): boolean {
  return STRUCTURAL_FIELD_TYPES.has(type);
}

export const AVAILABLE_MODULES: Record<string, Record<string, Record<string, { label: string; type: string }>>> = {
  "CRM": {
    "Lead": {
      lead_name:      { label: "Lead Name", type: "text" },
      email:          { label: "Email", type: "email" },
      phone:          { label: "Phone", type: "tel" },
      company:        { label: "Company", type: "text" },
      description:    { label: "Description", type: "textarea" },
    },
    "Deal": {
      name:           { label: "Deal Name", type: "text" },
      amount:         { label: "Amount", type: "number" },
      description:    { label: "Description", type: "textarea" },
    },
    "Contact": {
      name:           { label: "Contact Name", type: "text" },
      email:          { label: "Email", type: "email" },
      phone:          { label: "Phone", type: "tel" },
      company:        { label: "Company", type: "text" },
    },
  },
  "HRM": {
    "Employee": {
      first_name:     { label: "First Name", type: "text" },
      last_name:      { label: "Last Name", type: "text" },
      email:          { label: "Email", type: "email" },
      phone:          { label: "Phone", type: "tel" },
    },
  },
  "Taskly": {
    "Project": {
      project_name:   { label: "Project Name", type: "text" },
      description:    { label: "Description", type: "textarea" },
    },
    "Task": {
      title:          { label: "Task Title", type: "text" },
      description:    { label: "Description", type: "textarea" },
    },
  },
  "Appointment": {
    "Appointment": {
      name:           { label: "Name", type: "text" },
      email:          { label: "Email", type: "email" },
      phone:          { label: "Phone", type: "tel" },
      note:           { label: "Note", type: "textarea" },
    },
  },
};
