import "server-only";

import { formatDate } from "@/lib/format-date";
import { resolveMediaUrlMap, resolveStoredMediaUrl } from "@/lib/media-url";
import { PARTNERSHIP_EMAIL_TEMPLATES } from "@/lib/partnership-notification-keys";
import { prisma } from "@/lib/prisma";
import { getSettingsForOwner, getSuperadminId } from "@/lib/settings-service";
import { sendTemplatedEmail } from "@/lib/send-templated-email";
import { getImagePath } from "@/utils/image-path";

type SendResult = { ok: boolean; error?: string };

function appBaseUrl(origin?: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? origin ?? "http://localhost:5000").replace(/\/$/, "");
}

function supportEmail(): string {
  return (process.env.SUPPORT_EMAIL ?? "support@paperflight.cc").trim();
}

function pct(value: number): string {
  return `${value}%`;
}

function buildActionButton(url: string, label: string, color = "#2563eb"): string {
  const href = url.trim();
  if (!href) return "-";
  const style = `display:inline-block;background-color:${color};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.25;padding:14px 28px;text-align:center;text-decoration:none;border-radius:8px;`;
  const safeLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${style}">${safeLabel}</a>`;
}

function formatNow(settings?: { dateFormat?: string }): string {
  return formatDate(new Date().toISOString(), settings ?? {}, "—");
}

function defaultLogoWordmark(appName: string): string {
  const name = appName.trim() || "SECURX";
  if (/securx/i.test(name)) {
    return `<p style="margin:0;color:#f8fafc;font-size:22px;font-weight:800;letter-spacing:0.1em;line-height:1.2;">SECUR<span style="color:#e31837;">X</span></p>`;
  }
  return `<p style="margin:0;color:#f8fafc;font-size:20px;font-weight:800;letter-spacing:0.08em;">${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;
}

function toAbsoluteAssetUrl(path: string, base: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
  }
  const legacyBase = (process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE_URL ?? "").trim().replace(/\/$/, "");
  const normalized = getImagePath(trimmed);
  if (legacyBase && normalized.replace(/^\/+/, "").startsWith("storage")) {
    return `${legacyBase}/${normalized.replace(/^\/+/, "")}`;
  }
  if (normalized.startsWith("/")) return `${base}${normalized}`;
  return `${base}/${normalized}`;
}

async function buildEmailLogoHtml(ownerId: bigint): Promise<string> {
  const settings = await getSettingsForOwner(ownerId);
  const appName = (process.env.NEXT_PUBLIC_APP_NAME ?? settings.titleText ?? "SECURX").trim() || "SECURX";
  const logoPath = (settings.logo_light ?? settings.logo_dark ?? "").trim();
  if (!logoPath) return defaultLogoWordmark(appName);

  const map = await resolveMediaUrlMap([logoPath]);
  const resolved = resolveStoredMediaUrl(logoPath, map) ?? getImagePath(logoPath);
  if (!resolved) return defaultLogoWordmark(appName);

  const absolute = toAbsoluteAssetUrl(resolved, appBaseUrl());
  if (!absolute) return defaultLogoWordmark(appName);

  const safeUrl = absolute.replace(/"/g, "&quot;");
  const safeAlt = appName.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<img src="${safeUrl}" alt="${safeAlt}" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;outline:none;" />`;
}

async function sendPartnershipEmail(
  templateName: string,
  recipients: string[],
  variables: Record<string, string | number | undefined | null>,
): Promise<SendResult> {
  const to = [...new Set(recipients.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
  if (to.length === 0) return { ok: false, error: "No recipients." };

  try {
    const superadminId = await getSuperadminId();
    const logoHtml = await buildEmailLogoHtml(superadminId);
    const result = await sendTemplatedEmail({
      templateName,
      mailTo: to,
      ownerId: superadminId,
      smtpOwnerId: superadminId,
      variables: {
        app_name: (process.env.NEXT_PUBLIC_APP_NAME ?? "SECURX").trim() || "SECURX",
        support_email: supportEmail(),
        ...variables,
        logo_html: logoHtml,
      },
    });
    if (!result.is_success) {
      return { ok: false, error: typeof result.error === "string" ? result.error : "Email failed." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed." };
  }
}

async function superadminEmails(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { type: "superadmin", email: { not: null } },
    select: { email: true },
  });
  return rows.map((r) => (r.email ?? "").trim().toLowerCase()).filter((e) => e.includes("@"));
}

async function primaryBrandHolderEmail(brandId: bigint): Promise<{ email: string; name: string } | null> {
  const holder = await prisma.ownershipBrandHolder.findFirst({
    where: { brandId, isPrimaryBrandHolder: true, status: "active" },
    select: { email: true, name: true },
  });
  const email = (holder?.email ?? "").trim();
  if (!email.includes("@")) return null;
  return { email, name: holder?.name ?? "Brand representative" };
}

export async function sendPartnershipInvitationEmail(opts: {
  partnerEmail: string;
  partnerName: string;
  brandName: string;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  signUrl: string;
  invitedBy?: string | null;
  appUrl?: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.PARTNERSHIP_INVITATION, [opts.partnerEmail], {
    recipient_name: opts.partnerName,
    partner_name: opts.partnerName,
    brand_name: opts.brandName,
    current_ownership: pct(opts.currentOwnershipPercent),
    minimum_ownership: pct(opts.minimumOwnershipPercent),
    invited_by: opts.invitedBy?.trim() || "Administrator",
    invited_on: formatNow(),
    action_button: buildActionButton(opts.signUrl, "Review & Sign Agreement →", "#2563eb"),
  });
}

export async function sendOwnershipChangeRequestEmail(opts: {
  to: string[];
  recipientName: string;
  brandName: string;
  partnerName: string;
  changeType: string;
  oldOwnership: number;
  proposedOwnership: number;
  minimumOwnership: number;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.OWNERSHIP_CHANGE_REQUEST, opts.to, {
    recipient_name: opts.recipientName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    change_type: opts.changeType,
    old_ownership: pct(opts.oldOwnership),
    proposed_ownership: pct(opts.proposedOwnership),
    minimum_ownership: pct(opts.minimumOwnership),
    action_button: buildActionButton(opts.actionUrl, "Review Request →", "#ea580c"),
  });
}

export async function sendOwnershipApprovalRequiredEmail(opts: {
  brandContactEmail: string;
  brandContactName: string;
  partnerName: string;
  brandName: string;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  availableOwnershipPercent: number;
  approvalUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.OWNERSHIP_APPROVAL_REQUIRED, [opts.brandContactEmail], {
    recipient_name: opts.brandContactName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    current_ownership: pct(opts.currentOwnershipPercent),
    minimum_ownership: pct(opts.minimumOwnershipPercent),
    available_ownership: pct(opts.availableOwnershipPercent),
    action_button: buildActionButton(opts.approvalUrl, "Review & Approve →", "#ca8a04"),
  });
}

export async function sendOwnershipApprovedEmail(opts: {
  to: string[];
  recipientName: string;
  brandName: string;
  partnerName: string;
  newOwnership: number;
  minimumOwnership: number;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.OWNERSHIP_APPROVED, opts.to, {
    recipient_name: opts.recipientName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    new_ownership: pct(opts.newOwnership),
    minimum_ownership: pct(opts.minimumOwnership),
    approved_on: formatNow(),
    action_button: buildActionButton(opts.actionUrl, "View Ownership →", "#16a34a"),
  });
}

export async function sendOwnershipRejectedEmail(opts: {
  to: string[];
  recipientName: string;
  brandName: string;
  partnerName: string;
  proposedOwnership: number;
  reason?: string | null;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.OWNERSHIP_REJECTED, opts.to, {
    recipient_name: opts.recipientName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    proposed_ownership: pct(opts.proposedOwnership),
    reason: opts.reason?.trim() || "No reason provided.",
    rejected_on: formatNow(),
    action_button: buildActionButton(opts.actionUrl, "View Details →", "#dc2626"),
  });
}

export async function sendOwnershipTransferRequestEmail(opts: {
  partnerEmail: string;
  partnerName: string;
  brandName: string;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  fromPartners?: string | null;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.OWNERSHIP_TRANSFER_REQUEST, [opts.partnerEmail], {
    recipient_name: opts.partnerName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    current_ownership: pct(opts.currentOwnershipPercent),
    minimum_ownership: pct(opts.minimumOwnershipPercent),
    from_partners: opts.fromPartners?.trim() || "Available brand pool",
    action_button: buildActionButton(opts.actionUrl, "View Request →", "#7c3aed"),
  });
}

export async function sendOwnershipTransferApprovedEmail(opts: {
  to?: string[];
  partnerEmail: string;
  partnerName: string;
  brandName: string;
  newOwnership: number;
  minimumOwnership: number;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.OWNERSHIP_TRANSFER_APPROVED, opts.to ?? [opts.partnerEmail], {
    recipient_name: opts.partnerName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    new_ownership: pct(opts.newOwnership),
    minimum_ownership: pct(opts.minimumOwnership),
    approved_on: formatNow(),
    action_button: buildActionButton(opts.actionUrl, "View Ownership →", "#16a34a"),
  });
}

export async function sendOwnershipConflictNotificationEmail(opts: {
  to: string[];
  recipientName: string;
  brandName: string;
  partnerName: string;
  proposedOwnership: number;
  minimumOwnership: number;
  conflictMessage: string;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.OWNERSHIP_CONFLICT, opts.to, {
    recipient_name: opts.recipientName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    proposed_ownership: pct(opts.proposedOwnership),
    minimum_ownership: pct(opts.minimumOwnership),
    conflict_message: opts.conflictMessage,
    action_button: buildActionButton(opts.actionUrl, "Review Conflict →", "#dc2626"),
  });
}

export async function sendPartnerRemovedEmail(opts: {
  partnerEmail: string;
  partnerName: string;
  brandName: string;
  reason?: string | null;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.PARTNER_REMOVED, [opts.partnerEmail], {
    recipient_name: opts.partnerName,
    brand_name: opts.brandName,
    partner_name: opts.partnerName,
    reason: opts.reason?.trim() || "Partnership ended by administrator.",
    action_button: buildActionButton(opts.actionUrl, "View Partnerships →", "#dc2626"),
  });
}

export async function sendNewBrandCreatedEmail(opts: {
  to: string[];
  recipientName: string;
  brandName: string;
  primaryHolderName: string;
  currentOwnership: number;
  minimumOwnership: number;
  actionUrl: string;
}): Promise<SendResult> {
  return sendPartnershipEmail(PARTNERSHIP_EMAIL_TEMPLATES.NEW_BRAND_CREATED, opts.to, {
    recipient_name: opts.recipientName,
    brand_name: opts.brandName,
    partner_name: opts.primaryHolderName,
    current_ownership: pct(opts.currentOwnership),
    minimum_ownership: pct(opts.minimumOwnership),
    action_button: buildActionButton(opts.actionUrl, "View Brand →", "#2563eb"),
  });
}

export async function notifySuperadminsOwnershipConflict(opts: {
  brandName: string;
  partnerName: string;
  proposedOwnership: number;
  minimumOwnership: number;
  conflictMessage: string;
  appUrl?: string;
}): Promise<void> {
  const recipients = await superadminEmails();
  if (recipients.length === 0) return;
  const base = appBaseUrl(opts.appUrl);
  await sendOwnershipConflictNotificationEmail({
    to: recipients,
    recipientName: "Administrator",
    brandName: opts.brandName,
    partnerName: opts.partnerName,
    proposedOwnership: opts.proposedOwnership,
    minimumOwnership: opts.minimumOwnership,
    conflictMessage: opts.conflictMessage,
    actionUrl: `${base}/partnerships/ownership-requests`,
  }).catch(() => null);
}

export { primaryBrandHolderEmail, superadminEmails, appBaseUrl, buildActionButton, pct };
