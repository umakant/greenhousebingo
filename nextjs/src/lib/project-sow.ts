import { eachDateInRange } from "@/lib/project-staff-hours";
import { consolidateWorkPeriodsFromAssignments, renderSowDocumentHtml } from "@/lib/project-sow-document";
import type { SowFormData } from "@/lib/project-sow-form";

export type SowStaffAssignment = {
  role: string;
  work_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  position: string | null;
};

export type SowProjectContext = {
  name: string;
  property_name?: string | null;
  address?: string | null;
  address_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  timezone?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  company_name?: string | null;
  extra_locations?: string[];
  sow_per_diem?: string | null;
  sow_dress_code?: string | null;
};

export type SowRecord = {
  partner_name: string | null;
  locations: string | null;
  schedule_details: string | null;
  total_rate: string | null;
  per_diem: string | null;
  dress_code: string | null;
  policies: string | null;
  travel_notes: string | null;
  payroll_notes: string | null;
  sign_by_date: string | null;
  status: string;
  signed_at: string | null;
  signed_file_path: string | null;
};

const DEFAULT_PER_DIEM = `Meals will be provided where applicable. If you cannot participate due to your assigned task/post, you may submit for reimbursement with receipts of up to $85 per day. Parking/rideshare can also be submitted and will be reviewed by the client to be reimbursed. This is subject to change and will be communicated where applicable. The final approval of reimbursed expenses is subject to the client.`;

const DEFAULT_DRESS_CODE = `Dark suit, solid light colored under shirt, no tie, and black or brown dress shoes for show day activations. Dark jeans and sport coat for any other client facing activations. Business casual at a minimum for all other interactions with the client.`;

const DEFAULT_POLICIES = `To maintain integrity, you are prohibited from accepting any form of gifts, gratuities or other benefits from clients. Under no circumstances should you oblige anything offered by the client other than food that would be provided to all staff. There will be no consumption of alcohol at any of these events or at any time.

There will be no photos or other unnecessary interactions with guests/celebrities. We are there to assist in maintaining security.`;

const DEFAULT_TRAVEL = `Your flight may be pre-purchased for you. If there are circumstances that cause you to miss your flight, and/or you need to back out of this activation with the client; you will be responsible to reimburse the company for all associated flight costs if they are not refunded by the airline.`;

const DEFAULT_PAYROLL = `Payroll is processed on a biweekly cadence via direct deposit. Pay dates will be communicated by your administrator.`;

function formatUsDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function buildLocations(project: SowProjectContext): string {
  const lines: string[] = [];
  const venue = project.property_name?.trim();
  const cityState = [project.city, project.state].filter(Boolean).join(", ");
  if (venue || cityState) {
    lines.push(`- Location: ${[venue, cityState].filter(Boolean).join(" ")}`.trim());
  } else if (project.address?.trim()) {
    lines.push(`- Location: ${project.address.trim()}`);
  }
  for (const loc of project.extra_locations ?? []) {
    if (loc.trim()) lines.push(`  o ${loc.trim()}`);
  }
  return lines.join("\n");
}

function buildScheduleDetails(assignments: SowStaffAssignment[]): string {
  const periods = consolidateWorkPeriodsFromAssignments(assignments);
  if (!periods.length) return "";
  const lines: string[] = ["- Day(s)/Times Needed:"];
  for (const wp of periods) {
    lines.push(`  o ${wp.label}`);
  }
  return lines.join("\n");
}

function defaultSignByDate(project: SowProjectContext): string | null {
  if (project.start_date) {
    const d = new Date(`${project.start_date}T12:00:00`);
    d.setDate(d.getDate() - 7);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

export function buildDefaultSowContent(
  project: SowProjectContext,
  employeeName: string,
  assignments: SowStaffAssignment[],
): Omit<SowRecord, "status" | "signed_at" | "signed_file_path"> {
  const company = project.company_name?.trim() || "the company";
  const eventPlace = [project.city, project.state].filter(Boolean).join(", ") || "the event location";
  const schedule = buildScheduleDetails(assignments);
  const totalDays = assignments.reduce((sum, a) => {
    if (!a.work_date) return sum;
    const end = a.end_date ?? a.work_date;
    return sum + eachDateInRange(a.work_date, end).length;
  }, 0);

  return {
    partner_name: null,
    locations: buildLocations(project),
    schedule_details: schedule,
    total_rate: null,
    per_diem: project.sow_per_diem?.trim() || null,
    dress_code: project.sow_dress_code?.trim() || null,
    policies: DEFAULT_POLICIES,
    travel_notes: DEFAULT_TRAVEL,
    payroll_notes: DEFAULT_PAYROLL,
    sign_by_date: defaultSignByDate(project),
  };
}

export function mergeSowWithDefaults(
  stored: Partial<SowRecord> | null,
  defaults: Omit<SowRecord, "status" | "signed_at" | "signed_file_path">,
): SowRecord {
  return {
    partner_name: stored?.partner_name ?? defaults.partner_name,
    locations: stored?.locations ?? defaults.locations,
    schedule_details: stored?.schedule_details ?? defaults.schedule_details,
    total_rate: stored?.total_rate ?? defaults.total_rate,
    per_diem: stored?.per_diem ?? defaults.per_diem,
    dress_code: stored?.dress_code ?? defaults.dress_code,
    policies: stored?.policies ?? defaults.policies,
    travel_notes: stored?.travel_notes ?? defaults.travel_notes,
    payroll_notes: stored?.payroll_notes ?? defaults.payroll_notes,
    sign_by_date: stored?.sign_by_date ?? defaults.sign_by_date,
    status: stored?.status ?? "draft",
    signed_at: stored?.signed_at ?? null,
    signed_file_path: stored?.signed_file_path ?? null,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

export function renderSowHtml(opts: {
  employeeName: string;
  project: SowProjectContext;
  sow: SowRecord;
  form?: SowFormData;
  generatedDate?: string;
  signatoryName?: string;
  vendorCompany?: string;
  vendorLogoUrl?: string;
}): string {
  if (opts.form) {
    return renderSowDocumentHtml({
      employeeName: opts.employeeName,
      project: opts.project,
      form: opts.form,
      generatedDate: opts.generatedDate,
    });
  }

  const { employeeName, project, sow } = opts;
  const company = opts.vendorCompany?.trim() || project.company_name?.trim() || "SECURX";
  const partner = sow.partner_name?.trim() || "our client partner";
  const eventPlace = [project.city, project.state].filter(Boolean).join(", ") || "the event";
  const today = opts.generatedDate ?? new Date().toLocaleDateString("en-US");
  const signBy = sow.sign_by_date ? formatUsDate(sow.sign_by_date) : "—";
  const signatory = opts.signatoryName?.trim() || company;
  const logoHtml = opts.vendorLogoUrl?.trim()
    ? `<div style="margin-bottom:16px"><img src="${escapeHtml(opts.vendorLogoUrl.trim())}" alt="" style="max-height:48px;max-width:200px" /></div>`
    : "";

  const scopeSections = [
    sow.locations,
    sow.schedule_details,
    sow.total_rate ? `- Rate: ${sow.total_rate}` : null,
    sow.per_diem ? `- Per Diem: ${sow.per_diem}` : null,
    sow.dress_code ? `- Dress Code: ${sow.dress_code}` : null,
  ]
    .filter(Boolean)
    .map((s) => `<div class="scope-block">${textToHtml(String(s))}</div>`)
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Scope of Work — ${escapeHtml(employeeName)}</title>
<style>
  @page { size: letter; margin: 0.75in; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; line-height: 1.45; color: #111; max-width: 7.5in; margin: 0 auto; padding: 24px; }
  .date { text-align: right; margin-bottom: 24px; }
  h1 { font-size: 14pt; font-weight: normal; margin: 0 0 16px; }
  .intro { margin-bottom: 20px; }
  .scope-title { font-weight: bold; margin: 16px 0 8px; }
  .scope-block { margin: 8px 0 12px 16px; }
  .policy { margin: 16px 0; }
  .signature { margin-top: 48px; }
  .sig-line { border-bottom: 1px solid #111; width: 280px; margin-top: 40px; display: inline-block; }
  .sig-label { font-size: 10pt; margin-top: 4px; }
  .footer { margin-top: 32px; font-size: 10pt; color: #555; }
</style></head><body>
${logoHtml}
<div class="date">${escapeHtml(today)}</div>
<p>Dear ${escapeHtml(employeeName)},</p>
<div class="intro">
  <p>In partnership with ${escapeHtml(partner)}, ${escapeHtml(company)} is excited to have you join us for <strong>${escapeHtml(project.name)}</strong> in ${escapeHtml(eventPlace)}.</p>
  <p>Details about your role and the scope of work are outlined below. Please be advised this may not be an all-encompassing list and is subject to change based upon the client's needs. We appreciate your flexibility. Please review and let us know if you have any questions about the information included here.</p>
</div>
<div class="scope-title">The scope of work is as follows:</div>
${scopeSections}
${sow.policies ? `<div class="policy">${textToHtml(sow.policies)}</div>` : ""}
${sow.travel_notes ? `<div class="policy">${textToHtml(sow.travel_notes)}</div>` : ""}
${sow.payroll_notes ? `<div class="policy">${textToHtml(sow.payroll_notes)}</div>` : ""}
<p>If you have any questions, please do not hesitate to reach out. We look forward to working with you!</p>
<p>Sincerely,<br/>${escapeHtml(signatory)}</p>
<p>Please sign and return no later than <strong>${escapeHtml(signBy)}</strong>.</p>
<div class="signature">
  <div class="sig-line"></div><div class="sig-label">Signature</div>
  <div class="sig-line" style="margin-left: 48px;"></div><div class="sig-label" style="margin-left: 48px;">Date</div>
</div>
<div class="footer">Generated by SECURX Projects — ${escapeHtml(project.name)}</div>
</body></html>`;
}

export function serializeSowRow(row: {
  partnerName: string | null;
  locations: string | null;
  scheduleDetails: string | null;
  totalRate: string | null;
  perDiem: string | null;
  dressCode: string | null;
  policies: string | null;
  travelNotes: string | null;
  payrollNotes: string | null;
  signByDate: Date | null;
  status: string;
  signedAt: Date | null;
  signedFilePath: string | null;
}): SowRecord {
  return {
    partner_name: row.partnerName,
    locations: row.locations,
    schedule_details: row.scheduleDetails,
    total_rate: row.totalRate,
    per_diem: row.perDiem,
    dress_code: row.dressCode,
    policies: row.policies,
    travel_notes: row.travelNotes,
    payroll_notes: row.payrollNotes,
    sign_by_date: row.signByDate?.toISOString().slice(0, 10) ?? null,
    status: row.status,
    signed_at: row.signedAt?.toISOString() ?? null,
    signed_file_path: row.signedFilePath,
  };
}
