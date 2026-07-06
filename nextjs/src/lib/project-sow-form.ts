import { eachDateInRange } from "@/lib/project-staff-hours";
import { formatPhone } from "@/lib/phone";
import type { SowPerDiemPolicy } from "@/lib/project-sow-per-diem";
import {
  buildPerDiemTextFromPolicy,
  defaultPerDiemPolicy,
  mergePerDiemPolicy,
} from "@/lib/project-sow-per-diem";
import type { SowProjectContext, SowRecord, SowStaffAssignment } from "@/lib/project-sow";
import { consolidateWorkPeriodsFromAssignments, formatSowUsDate } from "@/lib/project-sow-document";

export type SowWorkPeriod = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  daily_rate: string;
  rate_type: string;
};

export type SowPayrollPeriod = {
  id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
};

export type SowFormData = {
  vendor_company_name: string;
  vendor_contact_name: string;
  vendor_email: string;
  vendor_phone: string;
  vendor_logo_url: string;
  client_company_name: string;
  client_contact_name: string;
  client_email: string;
  client_phone: string;
  client_logo_url: string;
  project_type: string;
  event_name: string;
  client_reference: string;
  internal_reference: string;
  primary_venue: string;
  venue_address: string;
  city: string;
  state: string;
  zip_code: string;
  timezone: string;
  additional_locations: string[];
  work_periods: SowWorkPeriod[];
  compensation_summary: string;
  per_diem: string;
  per_diem_policy?: SowPerDiemPolicy;
  dress_code: string;
  policies: string;
  travel_notes: string;
  payroll_notes: string;
  payroll_periods: SowPayrollPeriod[];
  rules_notes: string;
  signatory_name: string;
  sign_by_date: string;
};

export type SowProjectMeta = SowProjectContext & {
  status?: string | null;
  zip_code?: string | null;
  timezone?: string | null;
  usr_number?: string | null;
  sow_per_diem?: string | null;
  sow_dress_code?: string | null;
  num_agents?: number | null;
  num_medics?: number | null;
  num_security?: number | null;
  staffing?: { agents: number; medics: number; security: number; total: number };
};

const DEFAULT_PER_DIEM = `On Location will provide meals where applicable. If you cannot participate due to your assigned task/post, you may submit for reimbursement with receipts of up to $85 per day. Parking/rideshare can also be submitted and will be reviewed by the client to be reimbursed. This is subject to change and will be communicated where applicable. The final approval of reimbursed expenses is subject to the client.`;

const DEFAULT_DRESS = `Dark suit, solid light colored under shirt, No tie, and black or brown dress shoes for show day activations. Dark Jeans and sport coat for any other client facing activations. Business Casual at a minimum for all other interactions with the client.`;

export function buildDefaultPerDiem(partnerName?: string | null): string {
  const partner = partnerName?.trim() || "On Location";
  if (partner === "On Location") return DEFAULT_PER_DIEM;
  return DEFAULT_PER_DIEM.replace(/^On Location/, partner);
}

export function buildDefaultDressCode(): string {
  return DEFAULT_DRESS;
}

const DEFAULT_POLICIES = `To maintain integrity, you are prohibited from accepting any form of gifts, gratuities or other benefits from clients. Under no circumstances should you oblige anything offered by the client other than food that would be provided to all staff. There will be no consumption of alcohol at any of these events or at any time.

There will be no photos or other unnecessary interactions with guests/celebrities. We are there to assist in maintaining security.`;

const DEFAULT_TRAVEL = `Your flight has been pre-purchased for you. If there are circumstances that cause you to miss your flight, and/or you need to back out of this activation with the client; you will be responsible to reimburse the company for all associated flight costs if they are not refunded by the airline.`;

const DEFAULT_PAYROLL = `Payroll is processed on a biweekly cadence via direct deposit, following the below schedule:`;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function formatVenueAddress(address?: string | null, address2?: string | null): string {
  return [address?.trim(), address2?.trim()].filter(Boolean).join(", ");
}

export function formatGanttLocationLine(loc: {
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}): string {
  const name = loc.name?.trim();
  if (!name) return "";
  const cityState = [loc.city?.trim(), loc.state?.trim()].filter(Boolean).join(", ");
  if (cityState) return `${name}, ${cityState}`;
  const street = [loc.addressLine1?.trim(), loc.addressLine2?.trim()].filter(Boolean).join(", ");
  if (street) return `${name}, ${street}`;
  return name;
}

function pickNonEmpty(stored: string | undefined, fallback: string): string {
  return stored?.trim() ? stored.trim() : fallback;
}

function pickNonEmptyLocations(stored: string[] | undefined, fallback: string[]): string[] {
  const fromStored = stored?.map((l) => l.trim()).filter(Boolean) ?? [];
  if (fromStored.length) return fromStored;
  const fromFallback = fallback.map((l) => l.trim()).filter(Boolean);
  return fromFallback.length ? fromFallback : [""];
}

function formatUsDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function defaultSignByDate(project: SowProjectMeta): string {
  if (project.start_date) {
    const d = new Date(`${project.start_date}T12:00:00`);
    d.setDate(d.getDate() - 7);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

function buildWorkPeriodsFromAssignments(assignments: SowStaffAssignment[]): SowWorkPeriod[] {
  const consolidated = consolidateWorkPeriodsFromAssignments(assignments);
  if (consolidated.length) return consolidated;
  return [{ id: uid(), label: "", start_date: "", end_date: "", daily_rate: "", rate_type: "per day" }];
}

export function buildDefaultSowFormData(
  project: SowProjectMeta,
  employee: { name: string; email: string },
  assignments: SowStaffAssignment[],
): SowFormData {
  const extra = project.extra_locations ?? [];
  const workPeriods = buildWorkPeriodsFromAssignments(assignments);
  const totalDays = assignments.reduce((sum, a) => {
    if (!a.work_date) return sum;
    return sum + eachDateInRange(a.work_date, a.end_date ?? a.work_date).length;
  }, 0);

  const perDiemPolicy = defaultPerDiemPolicy();
  const defaultPerDiemText =
    project.sow_per_diem?.trim() || buildPerDiemTextFromPolicy(perDiemPolicy, null);

  return {
    vendor_company_name: project.company_name ?? "",
    vendor_contact_name: "",
    vendor_email: "",
    vendor_phone: "",
    vendor_logo_url: "",
    client_company_name: "",
    client_contact_name: employee.name,
    client_email: employee.email,
    client_phone: "",
    client_logo_url: "",
    project_type: "Special Event",
    event_name: project.name,
    client_reference: "",
    internal_reference: project.usr_number ?? "",
    primary_venue: project.property_name ?? "",
    venue_address: formatVenueAddress(project.address, project.address_2),
    city: project.city ?? "",
    state: project.state ?? "",
    zip_code: project.zip_code ?? "",
    timezone: project.timezone ?? "",
    additional_locations: extra.length ? [...extra] : [""],
    work_periods: workPeriods.length ? workPeriods : [{ id: uid(), label: "", start_date: "", end_date: "", daily_rate: "", rate_type: "per day" }],
    compensation_summary: totalDays > 0 ? `${totalDays} total days` : "",
    per_diem_policy: perDiemPolicy,
    per_diem: defaultPerDiemText,
    dress_code: project.sow_dress_code?.trim() || buildDefaultDressCode(),
    policies: DEFAULT_POLICIES,
    travel_notes: DEFAULT_TRAVEL.replace("the company", project.company_name?.trim() || "the company"),
    payroll_notes: DEFAULT_PAYROLL,
    payroll_periods: [{ id: uid(), period_start: "", period_end: "", pay_date: "" }],
    rules_notes: "",
    signatory_name: "",
    sign_by_date: defaultSignByDate(project),
  };
}

export function applyPayRatesToSowForm(
  form: SowFormData,
  rates: { per_day: string; half_day: string },
  totalDays: number,
): SowFormData {
  const work_periods = form.work_periods.map((wp) => ({
    ...wp,
    daily_rate: wp.daily_rate?.trim() ? wp.daily_rate : rates.per_day,
    rate_type: wp.rate_type?.trim() ? wp.rate_type : "per day",
  }));

  let compensation_summary = form.compensation_summary?.trim() ?? "";
  if (
    (!compensation_summary || /^\d+ total days$/i.test(compensation_summary)) &&
    totalDays > 0 &&
    rates.per_day
  ) {
    const total = Number(rates.per_day) * totalDays;
    if (!Number.isNaN(total) && total > 0) {
      compensation_summary = `${totalDays} total days @ $${total}`;
    }
  }

  return { ...form, work_periods, compensation_summary };
}

export function parseFormDataJson(raw: unknown): SowFormData | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as SowFormData;
}

export function formatSowFormPhoneFields(form: SowFormData): SowFormData {
  return {
    ...form,
    vendor_phone: formatPhone(form.vendor_phone ?? ""),
    client_phone: formatPhone(form.client_phone ?? ""),
  };
}

export function mergeSowFormData(stored: Partial<SowFormData> | null, defaults: SowFormData): SowFormData {
  if (!stored) return formatSowFormPhoneFields(defaults);
  const perDiemPolicy = mergePerDiemPolicy(stored.per_diem_policy, defaults.per_diem_policy ?? defaultPerDiemPolicy());
  const merged = formatSowFormPhoneFields({
    ...defaults,
    ...stored,
    primary_venue: pickNonEmpty(stored.primary_venue, defaults.primary_venue),
    venue_address: pickNonEmpty(stored.venue_address, defaults.venue_address),
    city: pickNonEmpty(stored.city, defaults.city),
    state: pickNonEmpty(stored.state, defaults.state),
    zip_code: pickNonEmpty(stored.zip_code, defaults.zip_code),
    timezone: pickNonEmpty(stored.timezone, defaults.timezone),
    event_name: pickNonEmpty(stored.event_name, defaults.event_name),
    internal_reference: pickNonEmpty(stored.internal_reference, defaults.internal_reference),
    vendor_company_name: pickNonEmpty(stored.vendor_company_name, defaults.vendor_company_name),
    client_company_name: pickNonEmpty(stored.client_company_name, defaults.client_company_name),
    per_diem_policy: perDiemPolicy,
    per_diem: pickNonEmpty(stored.per_diem, buildPerDiemTextFromPolicy(perDiemPolicy, stored.client_company_name ?? defaults.client_company_name)),
    dress_code: pickNonEmpty(stored.dress_code, defaults.dress_code),
    policies: pickNonEmpty(stored.policies, defaults.policies),
    travel_notes: pickNonEmpty(stored.travel_notes, defaults.travel_notes),
    payroll_notes: pickNonEmpty(stored.payroll_notes, defaults.payroll_notes),
    additional_locations: pickNonEmptyLocations(stored.additional_locations, defaults.additional_locations),
    work_periods: stored.work_periods?.length ? stored.work_periods : defaults.work_periods,
    payroll_periods: stored.payroll_periods?.length ? stored.payroll_periods : defaults.payroll_periods,
  });
  if (!stored.per_diem?.trim() && !stored.per_diem_policy) {
    merged.per_diem = pickNonEmpty(defaults.per_diem, buildPerDiemTextFromPolicy(perDiemPolicy));
  }
  return merged;
}

export function formDataToSowRecord(form: SowFormData): Omit<SowRecord, "status" | "signed_at" | "signed_file_path"> {
  const locationLines = [`- Location: ${[form.primary_venue, form.city, form.state].filter(Boolean).join(" ")}`.trim()];
  for (const loc of form.additional_locations) {
    if (loc.trim()) locationLines.push(`  o ${loc.trim()}`);
  }

  const scheduleLines = ["- Day(s)/Times Needed:"];
  for (const wp of form.work_periods) {
    if (!wp.start_date && !wp.label) continue;
    const ratePart = wp.daily_rate ? ` $${wp.daily_rate}${wp.rate_type ? ` ${wp.rate_type}` : ""}` : "";
    if (wp.label.trim()) {
      scheduleLines.push(`  o ${wp.label.trim()}${ratePart}`);
    } else if (wp.start_date) {
      const range =
        wp.end_date && wp.end_date !== wp.start_date
          ? `${formatUsDate(wp.start_date)} – ${formatUsDate(wp.end_date)}`
          : formatUsDate(wp.start_date);
      scheduleLines.push(`  o ${range}${ratePart}`);
    }
  }

  const payrollExtra =
    form.payroll_periods.filter((p) => p.period_start || p.pay_date).length > 0
      ? `\n\n${form.payroll_periods
          .filter((p) => p.period_start || p.pay_date)
          .map((p) => `${p.period_start || "—"} to ${p.period_end || "—"} — Pay ${p.pay_date || "—"}`)
          .join("\n")}`
      : "";

  return {
    partner_name: form.client_company_name || null,
    locations: locationLines.join("\n"),
    schedule_details: scheduleLines.length > 1 ? scheduleLines.join("\n") : null,
    total_rate: form.compensation_summary || null,
    per_diem: form.per_diem_policy
      ? buildPerDiemTextFromPolicy(form.per_diem_policy, form.client_company_name)
      : form.per_diem || null,
    dress_code: form.dress_code || null,
    policies: [form.policies, form.rules_notes].filter(Boolean).join("\n\n") || null,
    travel_notes: form.travel_notes || null,
    payroll_notes: (form.payroll_notes || "") + payrollExtra || null,
    sign_by_date: form.sign_by_date || null,
  };
}

function isLegacyGenericPerDiem(value: string | undefined): boolean {
  return !!value?.trim() && /^Meals will be provided/i.test(value.trim());
}

function isLegacyAutoCompensation(value: string | undefined): boolean {
  return !!value?.trim() && /total days assigned$/i.test(value.trim());
}

export function sowRecordToFormHints(record: SowRecord, form: SowFormData): SowFormData {
  const recordComp = record.total_rate ?? undefined;
  const recordPerDiem = record.per_diem ?? undefined;
  return {
    ...form,
    client_company_name: pickNonEmpty(record.partner_name ?? undefined, form.client_company_name),
    per_diem: isLegacyGenericPerDiem(recordPerDiem)
      ? form.per_diem
      : pickNonEmpty(recordPerDiem, form.per_diem),
    dress_code: pickNonEmpty(record.dress_code ?? undefined, form.dress_code),
    policies: pickNonEmpty(record.policies ?? undefined, form.policies),
    travel_notes: pickNonEmpty(record.travel_notes ?? undefined, form.travel_notes),
    payroll_notes: pickNonEmpty(record.payroll_notes?.split("\n\n")[0] ?? undefined, form.payroll_notes),
    compensation_summary: isLegacyAutoCompensation(recordComp)
      ? form.compensation_summary
      : pickNonEmpty(recordComp, form.compensation_summary),
    sign_by_date: pickNonEmpty(record.sign_by_date ?? undefined, form.sign_by_date),
  };
}

export const SOW_FORM_TABS = [
  { id: "company", label: "Company Info" },
  { id: "project", label: "Project Info" },
  { id: "locations", label: "Locations" },
  { id: "work_periods", label: "Work Periods" },
  { id: "compensation", label: "Compensation" },
  { id: "per_diem", label: "Per Diem & Expenses" },
  { id: "travel", label: "Travel Info" },
  { id: "payroll", label: "Payroll Info" },
  { id: "rules", label: "Rules & Notes" },
  { id: "attachments", label: "Attachments" },
] as const;

export type SowFormTabId = (typeof SOW_FORM_TABS)[number]["id"];

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export const PROJECT_TYPE_OPTIONS = ["Special Event", "Conference", "Concert", "Sports Event", "Corporate", "Other"];
