import { prisma } from "@/lib/prisma";
import { getEffectiveMailSettings, getPlatformAppName, getSuperadminId, resolvePlatformAppName } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

async function sendSmtpFromSuperadminSettings(params: {
  to: string[];
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const toList = params.to.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"));
  if (toList.length === 0) {
    return { ok: false, error: "No recipients." };
  }

  const superadminId = await getSuperadminId();
  const settings = await getEffectiveMailSettings(superadminId);
  const smtp = parseSmtpFromSettingsBlob(settings);
  if (smtp.driver !== "smtp") {
    return { ok: false, error: "SMTP is not configured (email driver is not smtp)." };
  }
  const fromAddress = (smtp.fromAddress || smtp.username || "").trim();
  if (!smtp.host || !fromAddress) {
    return { ok: false, error: "SMTP host or from address is not configured." };
  }
  const displayFrom = resolvePlatformAppName(settings);

  try {
    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) {
      return { ok: false, error: "Could not create SMTP transport." };
    }
    await transporter.sendMail({
      from: { name: displayFrom, address: fromAddress },
      to: toList.join(", "),
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email." };
  }
}

function collectSuperadminNotifyEmails(): Promise<string[]> {
  return prisma.user
    .findMany({
      where: { type: "superadmin", email: { not: null } },
      select: { email: true },
    })
    .then((rows) => rows.map((r) => (r.email ?? "").trim().toLowerCase()).filter((e) => e.includes("@")));
}

/**
 * Notifies platform superadmins (and optional `COMPANY_APPROVAL_NOTIFY_EMAIL` comma list) that a company registered and needs approval.
 */
export async function notifySuperadminsCompanyRegistrationPending(opts: {
  companyName: string;
  contactName: string;
  registrantEmail: string;
  phone?: string;
  companyUserId: string;
  appUrl: string;
  /** Human-readable list from registration wizard (industry / business module names). */
  interestedModulesSummary?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const extra = (process.env.COMPANY_APPROVAL_NOTIFY_EMAIL ?? "")
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));

  const fromDb = await collectSuperadminNotifyEmails();
  const recipients = [...new Set([...fromDb, ...extra])];
  if (recipients.length === 0) {
    return { ok: false, error: "No superadmin email addresses found; set COMPANY_APPROVAL_NOTIFY_EMAIL or add superadmin users with email." };
  }

  const reviewUrl = `${opts.appUrl.replace(/\/$/, "")}/companies/${opts.companyUserId}/edit`;
  const subject = `New company registration pending approval: ${opts.companyName}`;
  const phoneLine =
    opts.phone?.trim() ? [`Phone: ${opts.phone.trim()}`, ``] : [];
  const modulesLine =
    opts.interestedModulesSummary?.trim()
      ? [`Interested industry modules: ${opts.interestedModulesSummary.trim()}`, ``]
      : [];
  const text = [
    `A new company has registered and is waiting for approval before they can sign in.`,
    ``,
    `Company: ${opts.companyName}`,
    `Contact: ${opts.contactName}`,
    `Email: ${opts.registrantEmail}`,
    ...phoneLine,
    ...modulesLine,
    `Review and enable login in the admin area:`,
    reviewUrl,
  ].join("\n");

  const phoneHtml = opts.phone?.trim()
    ? `<li><strong>Phone:</strong> ${escapeHtml(opts.phone.trim())}</li>`
    : "";
  const modulesHtml = opts.interestedModulesSummary?.trim()
    ? `<li><strong>Interested industry modules:</strong> ${escapeHtml(opts.interestedModulesSummary.trim())}</li>`
    : "";
  const html = `
<p>A new company has registered and is waiting for approval before they can sign in.</p>
<ul>
  <li><strong>Company:</strong> ${escapeHtml(opts.companyName)}</li>
  <li><strong>Contact:</strong> ${escapeHtml(opts.contactName)}</li>
  <li><strong>Email:</strong> ${escapeHtml(opts.registrantEmail)}</li>
  ${phoneHtml}
  ${modulesHtml}
</ul>
<p><a href="${escapeHtml(reviewUrl)}">Open company in admin</a> and set status to active / enable login to approve.</p>
`.trim();

  const result = await sendSmtpFromSuperadminSettings({
    to: recipients,
    subject,
    text,
    html,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

/**
 * Sent when a superadmin approves a self-registered company (login enabled).
 */
export async function notifyRegistrantCompanyApproved(opts: {
  to: string;
  companyName: string;
  loginUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = opts.to.trim().toLowerCase();
  if (!to.includes("@")) return { ok: false, error: "Invalid recipient." };

  const name = opts.companyName.trim() || "your organization";
  const login = opts.loginUrl.trim();
  const appName = await getPlatformAppName();
  const subject = `${appName} — ${name} has been approved`;
  const text = [
    `Good news — your company account for ${name} has been approved on ${appName}.`,
    ``,
    `You can sign in with the email and password you registered:`,
    login,
    ``,
    `If you did not register this account, please contact support.`,
  ].join("\n");

  const html = `
<p>Good news — your company account for <strong>${escapeHtml(name)}</strong> has been approved on ${escapeHtml(appName)}.</p>
<p>You can sign in with the email and password you registered:</p>
<p><a href="${escapeHtml(login)}">${escapeHtml(login)}</a></p>
<p>If you did not register this account, please contact support.</p>
`.trim();

  const result = await sendSmtpFromSuperadminSettings({
    to: [to],
    subject,
    text,
    html,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Confirms receipt to the registrant; does not include credentials (login stays disabled until approval).
 */
export async function notifyRegistrantRegistrationPending(opts: {
  to: string;
  contactName: string;
  companyName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = opts.to.trim().toLowerCase();
  if (!to.includes("@")) return { ok: false, error: "Invalid recipient." };

  const appName = await getPlatformAppName();
  const subject = `${appName} — registration received`;
  const text = [
    `Hi ${opts.contactName},`,
    ``,
    `Thanks for registering ${opts.companyName} on ${appName}.`,
    `Your account is waiting for approval from the ${appName} admin. You will be able to sign in once your company has been approved.`,
    ``,
    `If you did not request this, you can ignore this email.`,
  ].join("\n");

  const html = `
<p>Hi ${escapeHtml(opts.contactName)},</p>
<p>Thanks for registering <strong>${escapeHtml(opts.companyName)}</strong> on ${escapeHtml(appName)}.</p>
<p>Your account is waiting for approval from the ${escapeHtml(appName)} admin. You will be able to sign in once your company has been approved.</p>
<p>If you did not request this, you can ignore this email.</p>
`.trim();

  const result = await sendSmtpFromSuperadminSettings({
    to: [to],
    subject,
    text,
    html,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
