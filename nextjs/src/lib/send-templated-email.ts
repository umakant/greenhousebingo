import { prisma } from "@/lib/prisma";
import type { SettingsBlob } from "@/lib/settings-service";
import { getEffectiveMailSettings, getSettingsForOwner, resolvePlatformAppName } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

export type SendEmailTemplateResult = { is_success: boolean; error: string | false };

/** Matches Laravel `company_setting('Template Name') == 'on'` / truthy toggles. */
export function isCompanyEmailNotificationEnabled(settings: SettingsBlob, templateKey: string): boolean {
  const v = settings[templateKey];
  if (v === undefined || v === null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes";
}

/** Laravel also uses `== true` for some keys (e.g. Lead Assigned). */
export function isCompanyEmailNotificationEnabledLoose(settings: SettingsBlob, templateKey: string): boolean {
  const v = settings[templateKey];
  if (v === undefined || v === null || v === "") return false;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes";
}

const PLACEHOLDER_KEYS: string[] = [
  "app_name",
  "app_url",
  "company_name",
  "name",
  "email",
  "password",
  "item_name",
  "file_name",
  "file_size",
  "download_link",
  "appointment_name",
  "appointment_user_name",
  "appointment_user_email",
  "appointment_date",
  "appointment_time",
  "appointment_number",
  "appointment_status",
  "callback_date",
  "callback_time",
  "callback_reason",
  "callback_status",
  "deal_name",
  "deal_pipeline",
  "deal_stage",
  "deal_status",
  "deal_price",
  "deal_old_stage",
  "deal_new_stage",
  "task_name",
  "task_priority",
  "task_status",
  "lead_name",
  "lead_email",
  "lead_pipeline",
  "lead_stage",
  "lead_old_stage",
  "lead_new_stage",
  "lead_email_subject",
  "lead_email_description",
  "deal_email_subject",
  "deal_email_description",
  "tracking_id",
  "tracking_url",
  "package_title",
  "candidate_name",
  "candidate_email",
  "job_title",
  "tracking_link",
  "position",
  "salary",
  "start_date",
  "download_url",
  "invoice_id",
  "invoice_tenant",
  "invoice_status",
  "invoice_sub_total",
  "created_at",
  "doctor_name",
  "doctor_email",
  "doctor_id",
  "specialization",
  "patient_name",
  "patient_email",
  "patient_id",
  "bed_number",
  "ward_name",
  "bed_type",
  "admission_date",
  "discharge_date",
  "ticket_name",
  "ticket_id",
  "ticket_url",
  "reply_description",
  "child_name",
  "parent_name",
  "inquiry_date",
  "inquiry_status",
  "parent_email",
  "login_link",
  "request_customer_name",
  "request_customer_email",
  "request_customer_phone",
  "request_date",
  "request_time",
  "request_location",
  "request_pickup_point",
  "request_category_type",
  "request_category",
  "request_id",
  "proposal_name",
  "proposal_number",
  "proposal_url",
  "invoice_name",
  "invoice_number",
  "invoice_url",
  "pay_invoice_url",
  "payment_name",
  "payment_amount",
  "payment_date",
  "payment_dueAmount",
  "payment_bill",
  "payment_method",
  "purchase_name",
  "purchase_number",
  "purchase_url",
  "report_number",
  "report_status",
  "report_url",
  "report_purpose",
  "rejection_note",
  "employee_name",
  "order_number",
  "order_total",
  "order_status",
  "order_url",
  // --- Marketplace (Water Ice Express) ---
  "vendor_name",
  "order_products",
  "amount_paid",
  "bucket_count",
  "city",
  "state",
  "delivery_status",
  "current_bucket_total",
  "required_minimum",
  "company_count",
  "city_queue_url",
  "delivery_date",
  "delivery_time",
  "delivery_address",
  "driver_name",
  "driver_phone",
  "driver_info",
  "delivery_notes",
  // --- Partnerships ---
  "recipient_name",
  "brand_name",
  "partner_name",
  "support_email",
  "logo_html",
  "action_button",
  "current_ownership",
  "minimum_ownership",
  "available_ownership",
  "old_ownership",
  "new_ownership",
  "proposed_ownership",
  "change_type",
  "reason",
  "conflict_message",
  "invited_by",
  "invited_on",
  "approved_on",
  "rejected_on",
  "from_partners",
];

function defaultValues(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of PLACEHOLDER_KEYS) o[k] = "-";
  return o;
}

/**
 * Same variable merge as `App\Models\EmailTemplate::replaceVariable` (ordered placeholders).
 */
export function replaceTemplateVariables(
  content: string,
  obj: Record<string, string | number | undefined | null>,
  ownerSettings: SettingsBlob,
): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || "-";
  const appNameFromSettings = resolvePlatformAppName(ownerSettings);

  const arrValue = defaultValues();
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    arrValue[key] = String(val);
  }
  /** Preserve template/API `app_name` when provided; only fall back to env (see sendWelcomeEmail / DB templates). */
  const mergedAppName = String(arrValue.app_name ?? "").trim();
  arrValue.app_name =
    mergedAppName !== "" && mergedAppName !== "-" ? mergedAppName : appNameFromSettings;
  if (!arrValue.company_name || arrValue.company_name === "-") {
    arrValue.company_name = ownerSettings.company_name?.trim() || ownerSettings.titleText?.trim() || "--";
  }
  arrValue.app_url = appUrl && appUrl !== "-"
    ? `<a href="${appUrl}" target="_blank">${appUrl}</a>`
    : "-";

  let out = content;
  for (const key of PLACEHOLDER_KEYS) {
    const ph = `{${key}}`;
    const val = arrValue[key] ?? "-";
    out = out.split(ph).join(val);
  }
  return out;
}

export type SendTemplatedEmailOptions = {
  templateName: string;
  /** Recipient addresses only (Laravel-style). */
  mailTo: string[];
  variables: Record<string, string | number | undefined | null>;
  /** Used for template language + `company_name` merge (matches Laravel `user_id` / `created_by` context). */
  ownerId: bigint;
  /** If set, SMTP host/from/password are read from this user’s settings (e.g. welcome mail uses superadmin). */
  smtpOwnerId?: bigint;
};

export async function sendTemplatedEmail(opts: SendTemplatedEmailOptions): Promise<SendEmailTemplateResult> {
  const { templateName, ownerId } = opts;
  const smtpOwnerId = opts.smtpOwnerId ?? ownerId;
  const mailTo = [...new Set(opts.mailTo.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
  if (mailTo.length === 0) {
    return { is_success: false, error: "No valid recipients." };
  }

  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { name: templateName },
      select: { id: true, from: true },
    });
    if (!template?.id) {
      return { is_success: false, error: "Mail not send, email not found" };
    }

    const ownerSettings = await getSettingsForOwner(ownerId);
    const smtpSettings = await getEffectiveMailSettings(smtpOwnerId);
    const defaultLang = (ownerSettings.defaultLanguage ?? ownerSettings.default_language ?? "en").trim() || "en";

    let langRow = await prisma.emailTemplateLang.findFirst({
      where: { parentId: template.id, lang: defaultLang },
      select: { subject: true, content: true },
    });

    if (!langRow?.content && defaultLang !== "en") {
      langRow = await prisma.emailTemplateLang.findFirst({
        where: { parentId: template.id, lang: "en" },
        select: { subject: true, content: true },
      });
    }

    if (!langRow?.content) {
      return {
        is_success: false,
        error: `Email template "${templateName}" has no content for language "${defaultLang}" or "en". Run: npm run db:seed:email-templates`,
      };
    }

    const parsedSmtp = parseSmtpFromSettingsBlob(smtpSettings);
    if (!parsedSmtp.fromAddress) {
      return { is_success: false, error: "E-Mail has been not sent due to SMTP configuration" };
    }

    if (parsedSmtp.driver !== "smtp") {
      return { is_success: false, error: "Email sending requires SMTP." };
    }

    if (!parsedSmtp.host) {
      return { is_success: false, error: "Something went wrong please try again " };
    }

    const subject = replaceTemplateVariables(langRow.subject ?? "", opts.variables, ownerSettings);
    const html = replaceTemplateVariables(langRow.content, opts.variables, ownerSettings);

    const transporter = createSmtpTransportFromSettings(smtpSettings);
    if (!transporter) {
      return { is_success: false, error: "Something went wrong please try again " };
    }

    const displayFrom =
      (template.from ?? parsedSmtp.fromName ?? resolvePlatformAppName(ownerSettings)).trim() ||
      parsedSmtp.fromAddress;

    await transporter.sendMail({
      from: { name: displayFrom, address: parsedSmtp.fromAddress },
      to: mailTo,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ""),
    });

    return { is_success: true, error: false };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send email";
    return { is_success: false, error: msg };
  }
}

/** Fire-and-forget helper for API routes — does not throw. */
export function sendTemplatedEmailAsync(opts: SendTemplatedEmailOptions): void {
  void sendTemplatedEmail(opts).catch(() => undefined);
}
