import { eachDateInRange } from "@/lib/project-staff-hours";
import type { SowProjectContext, SowStaffAssignment } from "@/lib/project-sow";
import type { SowFormData, SowPayrollPeriod, SowWorkPeriod } from "@/lib/project-sow-form";
import { buildDefaultDressCode, buildDefaultPerDiem } from "@/lib/project-sow-form";

export type SowDateYear = "full" | "none";

function parseSowIso(iso: string): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** SOW date format: MM/DD/YYYY (leading zeros). */
export function formatSowMd(iso: string, year: SowDateYear = "full"): string {
  const d = parseSowIso(iso);
  if (!d) return iso;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (year === "none") return `${m}/${day}`;
  return `${m}/${day}/${d.getFullYear()}`;
}

export function formatSowUsDate(iso: string, _shortYear = false): string {
  return formatSowMd(iso, "full");
}

/** Activation date range like `04/13/2025 – 04/20/2025`. */
export function formatSowActivationRange(start: string, end: string): string {
  const s = parseSowIso(start);
  const e = parseSowIso(end);
  if (!s || !e) return `${formatSowMd(start, "full")} – ${formatSowMd(end, "full")}`;
  if (s.getTime() === e.getTime()) return formatSowMd(start, "full");
  return `${formatSowMd(start, "full")} – ${formatSowMd(end, "full")}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/** Merge assignment dates into ranges (avoids one line per day in PDF). */
export function consolidateWorkPeriodsFromAssignments(assignments: SowStaffAssignment[]): SowWorkPeriod[] {
  const dateSet = new Set<string>();
  for (const a of assignments) {
    if (!a.work_date) continue;
    const end = a.end_date ?? a.work_date;
    for (const d of eachDateInRange(a.work_date, end)) dateSet.add(d);
  }
  const dates = [...dateSet].sort();
  if (!dates.length) return [];

  const ranges: { start: string; end: string; count: number }[] = [];
  let rangeStart = dates[0]!;
  let rangeEnd = dates[0]!;

  for (let i = 1; i < dates.length; i++) {
    const nextExpected = new Date(`${rangeEnd}T12:00:00`);
    nextExpected.setDate(nextExpected.getDate() + 1);
    if (nextExpected.toISOString().slice(0, 10) === dates[i]) {
      rangeEnd = dates[i]!;
    } else {
      ranges.push({
        start: rangeStart,
        end: rangeEnd,
        count: eachDateInRange(rangeStart, rangeEnd).length,
      });
      rangeStart = dates[i]!;
      rangeEnd = dates[i]!;
    }
  }
  ranges.push({
    start: rangeStart,
    end: rangeEnd,
    count: eachDateInRange(rangeStart, rangeEnd).length,
  });

  return ranges.map((r) => ({
    id: uid(),
    label: buildWorkPeriodLabelFromDates(r.start, r.end, "Activation Days"),
    start_date: r.start,
    end_date: r.end,
    daily_rate: "",
    rate_type: "per day",
  }));
}

/** Detect travel vs activation from an existing label (defaults to activation). */
export function inferWorkPeriodLabelKind(previousLabel: string): "travel" | "activation" {
  if (/travel\s*day/i.test(previousLabel.trim())) return "travel";
  return "activation";
}

/** Rebuild the date portion of a work-period label when start/end dates change. */
export function buildWorkPeriodLabelFromDates(
  startDate: string,
  endDate: string,
  previousLabel = "",
): string {
  const start = startDate?.trim();
  if (!start) return previousLabel.trim();
  const end = (endDate?.trim() || start).trim();
  const dayCount = eachDateInRange(start, end).length;
  const kind = inferWorkPeriodLabelKind(previousLabel);

  if (kind === "travel") {
    return `${formatSowMd(start, "full")} Travel Day`;
  }

  if (dayCount > 1) {
    return `${formatSowActivationRange(start, end)} Activation Days (${dayCount})`;
  }
  return `${formatSowMd(start, "full")} Activation Day`;
}

export function formatWorkPeriodLine(wp: SowWorkPeriod): string {
  const rateType = wp.rate_type?.trim() ?? "";
  const ratePart = wp.daily_rate?.trim()
    ? `$${wp.daily_rate.trim()}${rateType ? ` ${rateType}` : ""}`
    : "";

  let label = wp.label?.trim() ?? "";
  if (wp.start_date) {
    label = buildWorkPeriodLabelFromDates(wp.start_date, wp.end_date || wp.start_date, label);
  }

  if (label) {
    return ratePart ? `${label} ${ratePart}` : label;
  }

  if (wp.start_date) {
    const range =
      wp.end_date && wp.end_date !== wp.start_date
        ? formatSowActivationRange(wp.start_date, wp.end_date)
        : formatSowMd(wp.start_date, "full");
    return ratePart ? `${range} ${ratePart}` : range;
  }

  return ratePart;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineHtml(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  return escapeHtml(text.trim());
}

function paragraphHtml(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  return escapeHtml(text.trim()).replace(/\n\n/g, "</p><p class=\"body\">").replace(/\n/g, " ");
}

function renderPayrollTable(periods: SowPayrollPeriod[]): string {
  const rows = periods.filter((p) => p.period_start || p.period_end || p.pay_date);
  if (!rows.length) return "";

  const trs = rows
    .map(
      (p) =>
        `<tr>` +
        `<td>${escapeHtml(formatSowMd(p.period_start, "full") || "—")}</td>` +
        `<td>${escapeHtml(formatSowMd(p.period_end, "full") || "—")}</td>` +
        `<td>${escapeHtml(formatSowMd(p.pay_date, "full") || "—")}</td>` +
        `</tr>`,
    )
    .join("");

  return (
    `<div class="payroll-wrap">` +
    `<table class="payroll"><thead><tr>` +
    `<th>PAY PERIOD START</th><th>PAY PERIOD END</th><th>PAY DATE</th>` +
    `</tr></thead><tbody>${trs}</tbody></table>` +
    `</div>`
  );
}

function resolveCompensationSummary(form: SowFormData): string {
  const summary = form.compensation_summary?.trim() ?? "";
  if (summary && !/total days assigned$/i.test(summary)) return summary;
  return "";
}

function formatPrimaryLocation(venue: string, city: string, state: string): string {
  const parts: string[] = [];
  if (venue.trim()) parts.push(venue.trim());
  const cityState =
    city.trim() && state.trim()
      ? `${city.trim()}, ${state.trim()}`
      : city.trim() || state.trim();
  if (cityState) parts.push(cityState);
  return parts.join(" ");
}

export function renderSowDocumentHtml(opts: {
  employeeName: string;
  project: SowProjectContext;
  form: SowFormData;
  generatedDate?: string;
}): string {
  const { employeeName, project, form } = opts;
  const company = form.vendor_company_name?.trim() || project.company_name?.trim() || "Company";
  const partner = form.client_company_name?.trim() || "our client partner";
  const eventName = form.event_name?.trim() || project.name;
  const eventPlace = [form.city || project.city, form.state || project.state].filter(Boolean).join(", ") || "the event";
  const today =
    opts.generatedDate ?? formatSowMd(new Date().toISOString().slice(0, 10), "full");
  const signBy = form.sign_by_date ? formatSowMd(form.sign_by_date, "full") : "";
  const signatory = form.signatory_name?.trim() || form.vendor_contact_name?.trim() || company;
  const returnEmail = form.vendor_email?.trim() || "";

  const primaryLocation = formatPrimaryLocation(
    form.primary_venue ?? "",
    form.city || project.city || "",
    form.state || project.state || "",
  );
  const subLocations = form.additional_locations.map((l) => l.trim()).filter(Boolean);

  const workLines = form.work_periods.map(formatWorkPeriodLine).filter(Boolean);

  const perDiem = form.per_diem?.trim() || buildDefaultPerDiem(partner !== "our client partner" ? partner : undefined);
  const dressCode = form.dress_code?.trim() || buildDefaultDressCode();
  const compensationSummary = resolveCompensationSummary(form);

  const scopeParts: string[] = [];

  if (primaryLocation) {
    scopeParts.push(`<p class="scope-main"><span class="scope-dash">-</span>Location: ${inlineHtml(primaryLocation)}</p>`);
    for (const loc of subLocations) {
      scopeParts.push(`<p class="scope-sub"><span class="scope-bullet">o</span>${inlineHtml(loc)}</p>`);
    }
  }

  if (workLines.length) {
    scopeParts.push(`<p class="scope-main"><span class="scope-dash">-</span>Day(s)/Times Needed:</p>`);
    for (const line of workLines) {
      scopeParts.push(`<p class="scope-sub"><span class="scope-bullet">o</span>${inlineHtml(line)}</p>`);
    }
  }

  if (compensationSummary) {
    scopeParts.push(`<p class="scope-main"><span class="scope-dash">-</span>Rate: ${inlineHtml(compensationSummary)}</p>`);
  }

  if (perDiem) {
    scopeParts.push(`<p class="scope-main"><span class="scope-dash">-</span>Per Diem: ${paragraphHtml(perDiem)}</p>`);
  }

  if (dressCode) {
    scopeParts.push(`<p class="scope-main"><span class="scope-dash">-</span>Dress Code: ${paragraphHtml(dressCode)}</p>`);
  }

  const policyBlocks = [form.policies, form.travel_notes, form.rules_notes]
    .filter((t) => t?.trim())
    .map((t) => `<p class="body">${paragraphHtml(t)}</p>`)
    .join("");

  const payrollIntro = form.payroll_notes?.trim() ?? "";
  const payrollTable = renderPayrollTable(form.payroll_periods);

  const signReturn = returnEmail && signBy
    ? `Please sign and return to <a class="email-link" href="mailto:${escapeHtml(returnEmail)}">${escapeHtml(returnEmail)}</a> no later than ${escapeHtml(signBy)}.`
    : signBy
      ? `Please sign and return no later than ${escapeHtml(signBy)}.`
      : returnEmail
        ? `Please sign and return to <a class="email-link" href="mailto:${escapeHtml(returnEmail)}">${escapeHtml(returnEmail)}</a>.`
        : "";

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Scope of Work — ${escapeHtml(employeeName)}</title>
<style>
  @page { size: letter; margin: 1in; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.35;
    color: #000;
    margin: 0;
    padding: 0;
  }
  .page { max-width: 6.5in; margin: 0 auto; }
  .date { text-align: right; margin: 0 0 18pt; }
  .body { margin: 0 0 10pt; text-align: left; }
  .scope-title { font-weight: bold; margin: 12pt 0 6pt; }
  .scope-main { margin: 0 0 2pt; padding-left: 0; }
  .scope-dash { display: inline-block; width: 14pt; }
  .scope-sub { margin: 0 0 2pt 36pt; text-indent: -18pt; padding-left: 18pt; }
  .scope-bullet { display: inline-block; width: 18pt; }
  .payroll-wrap { text-align: center; margin: 10pt 0 14pt; }
  .payroll {
    width: 68%;
    margin: 0 auto;
    border-collapse: collapse;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
  }
  .payroll th {
    background: #000;
    color: #fff;
    font-weight: bold;
    text-align: center;
    vertical-align: middle;
    padding: 6pt 10pt;
    border: 1px solid #000;
    text-decoration: none;
  }
  .payroll td {
    background: #fff;
    color: #000;
    text-align: center;
    vertical-align: middle;
    padding: 6pt 10pt;
    border: 1px solid #000;
  }
  .email-link { color: #0563c1; text-decoration: underline; }
  .closing { margin-top: 14pt; }
  .signature-block { margin-top: 36pt; }
  .sig-row { display: flex; gap: 72pt; margin-top: 28pt; }
  .sig-col { min-width: 220pt; }
  .sig-line { border-bottom: 1px solid #000; height: 20pt; margin-bottom: 4pt; }
  .sig-label { font-size: 12pt; }
</style>
</head>
<body>
<div class="page">
  <div class="date">${escapeHtml(today)}</div>

  <p class="body">Dear ${escapeHtml(employeeName)},</p>

  <p class="body">In partnership with ${escapeHtml(partner)}, ${escapeHtml(company)} is excited to have you join us for ${escapeHtml(eventName)} in ${escapeHtml(eventPlace)}.</p>

  <p class="body">Details about your role and the scope of work are outlined below, please be advised this may not be an all-encompassing list and is subject to change based upon client's needs. We appreciate your flexibility. Please review and let us know if you have any questions about the information included here.</p>

  <p class="scope-title">The scope of work is as follows:</p>

  ${scopeParts.join("\n  ")}

  ${policyBlocks}

  ${payrollIntro ? `<p class="body">${paragraphHtml(payrollIntro)}</p>` : ""}
  ${payrollTable}

  <p class="body closing">If you have any questions, please do not hesitate to reach out. We look forward to working with you!</p>

  <p class="body">Sincerely,<br>${escapeHtml(signatory)}</p>

  ${signReturn ? `<p class="body">${signReturn}</p>` : ""}

  <div class="signature-block">
    <div class="sig-row">
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-label">Signature</div>
      </div>
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}
