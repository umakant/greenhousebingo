import { format } from "date-fns";

import { parseAssignmentSchedule } from "@/lib/gantt-assignment-schedule";
import { formatGanttDisplayDate } from "@/lib/gantt-dates";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/send-sms";
import { getEffectiveMailSettings, resolvePlatformAppName } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

/** Gantt/calendar assignment SMS — off until notifications are stable (email still sends). */
const GANTT_ASSIGNMENT_SMS_ENABLED = false;

type NotifyInput = {
  companyId: string;
  staffName: string;
  staffEmail: string | null;
  staffPhone: string | null;
  projectName: string;
  locationName: string | null;
  startDate: Date | null;
  endDate: Date | null;
  scheduleLabel: string;
  appUrl?: string;
};

export type GanttAssignmentNotifyResult = {
  emailSent: boolean;
  smsSent: boolean;
  reason?: "no_staff" | "no_contact" | "mail_failed";
};

type AssignmentNotifyRow = {
  staff: { name: string; email: string | null } | null;
  project: { name: string };
  location: { name: string } | null;
  startDate: Date | null;
  endDate: Date | null;
  label: string;
};

function splitStaffName(name: string): { firstName: string; lastName: string | null } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: null };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRange(start: Date | null, end: Date | null): string {
  const s = start ? format(start, "MMM d, yyyy") : "";
  const e = end ? format(end, "MMM d, yyyy") : "";
  if (s && e) return `${s} – ${e}`;
  return s || e || "See schedule in the app";
}

function enabledDaySummary(scheduleLabel: string): string {
  const parsed = parseAssignmentSchedule(scheduleLabel);
  if (!parsed?.length) return "";
  const enabled = parsed.filter((d) => d.enabled);
  if (!enabled.length) return "";
  const sample = enabled.slice(0, 3).map((d) => {
    const dt = formatGanttDisplayDate(d.date, "MMM d");
    return `${dt} ${d.startTime}–${d.endTime}`;
  });
  const extra = enabled.length > 3 ? ` (+${enabled.length - 3} more days)` : "";
  return sample.join("; ") + extra;
}

async function sendAssignmentEmail(
  companyId: string,
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  const settings = await getEffectiveMailSettings(BigInt(companyId));
  const smtp = parseSmtpFromSettingsBlob(settings);
  if (smtp.driver !== "smtp" || !smtp.host) return false;
  const fromAddress = (smtp.fromAddress || smtp.username || "").trim();
  if (!fromAddress) return false;

  try {
    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) return false;
    await transporter.sendMail({
      from: { name: resolvePlatformAppName(settings), address: fromAddress },
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[gantt-assignment-notify] email failed:", err);
    return false;
  }
}

/** Notify staff by email and/or SMS when a project assignment is saved. */
export async function notifyStaffProjectAssignment(input: NotifyInput): Promise<{
  emailSent: boolean;
  smsSent: boolean;
}> {
  const range = formatRange(input.startDate, input.endDate);
  const daySummary = enabledDaySummary(input.scheduleLabel);
  const locationLine = input.locationName ? ` at ${input.locationName}` : "";
  const appName = await resolvePlatformAppName(await getEffectiveMailSettings(BigInt(input.companyId)));
  const link = input.appUrl?.replace(/\/$/, "") ?? "";

  const subject = `${appName} — Project assignment: ${input.projectName}`;
  const text = [
    `Hi ${input.staffName},`,
    ``,
    `You have been assigned to project "${input.projectName}"${locationLine}.`,
    `Working period: ${range}.`,
    daySummary ? `Schedule: ${daySummary}.` : "",
    link ? `View your assignments: ${link}/project/my-assignments` : "",
    ``,
    `Please clock in when you arrive on site.`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<p>Hi ${escapeHtml(input.staffName)},</p>
<p>You have been assigned to project <strong>${escapeHtml(input.projectName)}</strong>${escapeHtml(locationLine)}.</p>
<p><strong>Working period:</strong> ${escapeHtml(range)}</p>
${daySummary ? `<p><strong>Schedule:</strong> ${escapeHtml(daySummary)}</p>` : ""}
${link ? `<p><a href="${escapeHtml(link)}/project/my-assignments">View your assignments</a></p>` : ""}
<p>Please clock in when you arrive on site.</p>
`.trim();

  const smsBody = [
    `${appName}: You're assigned to "${input.projectName}"${locationLine}.`,
    `Dates: ${range}.`,
    daySummary ? `Times: ${daySummary}.` : "",
    link ? `Details: ${link}/project/my-assignments` : "",
  ]
    .filter(Boolean)
    .join(" ");

  let emailSent = false;
  let smsSent = false;

  const email = input.staffEmail?.trim().toLowerCase();
  if (email?.includes("@")) {
    emailSent = await sendAssignmentEmail(input.companyId, email, subject, text, html);
  }

  const phone = input.staffPhone?.trim();
  if (GANTT_ASSIGNMENT_SMS_ENABLED && phone) {
    const result = await sendSms(phone, smsBody);
    smsSent = result.ok;
  }

  return { emailSent, smsSent };
}

/** Resolve staff email/phone from Gantt staff row, HRM employee, or portal user. */
export async function resolveStaffContact(
  companyId: string,
  staffName: string,
  staffEmail: string | null,
): Promise<{ email: string | null; phone: string | null }> {
  const companyBigId = BigInt(companyId);
  let email = staffEmail?.trim().toLowerCase() || null;
  let phone: string | null = null;

  const enrichFromHrmEmail = async (addr: string) => {
    const employee = await prisma.hrmEmployee.findFirst({
      where: {
        email: { equals: addr, mode: "insensitive" },
        createdBy: companyBigId,
      },
      select: { email: true, phone: true },
    });
    if (employee) {
      email = employee.email?.trim().toLowerCase() || email;
      phone = employee.phone?.trim() || phone;
    }
  };

  if (email?.includes("@")) {
    await enrichFromHrmEmail(email);
    const portalUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        createdBy: companyBigId,
        type: "staff",
      },
      select: { email: true },
    });
    if (portalUser?.email) email = portalUser.email.trim().toLowerCase();
  }

  if (!email?.includes("@") && staffName.trim()) {
    const { firstName, lastName } = splitStaffName(staffName);
    if (firstName) {
      const employee = await prisma.hrmEmployee.findFirst({
        where: {
          createdBy: companyBigId,
          firstName: { equals: firstName, mode: "insensitive" },
          ...(lastName ? { lastName: { equals: lastName, mode: "insensitive" } } : {}),
        },
        select: { email: true, phone: true },
      });
      if (employee?.email?.trim()) {
        email = employee.email.trim().toLowerCase();
        phone = employee.phone?.trim() ?? null;
      }
    }

    if (!email?.includes("@")) {
      const portalUser = await prisma.user.findFirst({
        where: {
          createdBy: companyBigId,
          type: "staff",
          name: { equals: staffName.trim(), mode: "insensitive" },
        },
        select: { email: true },
      });
      if (portalUser?.email?.trim()) {
        email = portalUser.email.trim().toLowerCase();
      }
    }
  }

  if (email?.includes("@") && !phone) {
    await enrichFromHrmEmail(email);
  }

  return {
    email: email?.includes("@") ? email : null,
    phone,
  };
}

/** Send assignment notification using resolved contact info. */
export async function notifyGanttStaffAssignmentRecord(
  companyId: string,
  assignment: AssignmentNotifyRow,
): Promise<GanttAssignmentNotifyResult> {
  if (!assignment.staff) {
    return { emailSent: false, smsSent: false, reason: "no_staff" };
  }

  const contact = await resolveStaffContact(
    companyId,
    assignment.staff.name,
    assignment.staff.email,
  );

  if (!contact.email && !contact.phone) {
    return { emailSent: false, smsSent: false, reason: "no_contact" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const result = await notifyStaffProjectAssignment({
    companyId,
    staffName: assignment.staff.name,
    staffEmail: contact.email,
    staffPhone: contact.phone,
    projectName: assignment.project.name,
    locationName: assignment.location?.name ?? null,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    scheduleLabel: assignment.label,
    appUrl,
  });

  if (!result.emailSent && !result.smsSent) {
    return { ...result, reason: contact.email ? "mail_failed" : "no_contact" };
  }

  return result;
}

export async function notifyGanttStaffAssignmentById(
  companyId: string,
  assignmentId: string,
): Promise<GanttAssignmentNotifyResult> {
  const row = await prisma.ganttProjectStaff.findFirst({
    where: { id: assignmentId, project: { companyId } },
    include: {
      staff: true,
      project: { select: { name: true } },
      location: { select: { name: true } },
    },
  });
  if (!row) {
    return { emailSent: false, smsSent: false, reason: "no_staff" };
  }
  return notifyGanttStaffAssignmentRecord(companyId, row);
}
