import "server-only";

import twilio from "twilio";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { hasPermission } from "@/lib/authz";
import { generateOtp, saveOtp, verifyOtp } from "@/lib/otp-store";
import {
  getEffectiveMailSettings,
  getUserByEmail,
  settingsOwnerIdForUser,
  upsertOwnerSettings,
} from "@/lib/settings-service";
import { createSmtpTransportFromSettings, formatSmtpFromHeader, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";
import { normalizeEmailForOtp, normalizePhoneForOtp, phoneToE164Sms } from "@/lib/hrm-otp-normalize";
import { resolveTwilioCredentials } from "@/lib/twilio-settings-service";
import { buildOtpEmailContent, buildOtpEmailSubject, buildOtpSmsBody } from "@/lib/otp-notification-copy";
import { prisma } from "@/lib/prisma";

export const EMAIL_OTP_SETTING_KEYS = {
  verifiedEmail: "email_otp_verified_address",
  verifiedEmailAt: "email_otp_verified_at",
  verifiedPhone: "email_otp_verified_phone",
  verifiedPhoneAt: "email_otp_phone_verified_at",
} as const;

async function getTwilioSettings() {
  return resolveTwilioCredentials();
}

function otpKey(ownerId: bigint, type: "email" | "phone", valueNorm: string) {
  return `email-settings:${ownerId}:${type}:${valueNorm}`;
}

export async function requireEmailSettingsOtpAuth(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };
  }
  const perms = await getPermissionsFromRequest(req);
  if (
    !perms.includes("*") &&
    !hasPermission(perms, "edit-email-settings") &&
    !hasPermission(perms, "manage-email-settings")
  ) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  const currentUserEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const user = await getUserByEmail(currentUserEmail);
  if (!user) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };
  }
  const ownerId = settingsOwnerIdForUser(user);
  return { ok: true as const, ownerId, user };
}

export async function loadEmailSettingsOtpStatus(ownerId: bigint) {
  const rows = await prisma.setting.findMany({
    where: {
      createdBy: ownerId,
      key: {
        in: [
          EMAIL_OTP_SETTING_KEYS.verifiedEmail,
          EMAIL_OTP_SETTING_KEYS.verifiedEmailAt,
          EMAIL_OTP_SETTING_KEYS.verifiedPhone,
          EMAIL_OTP_SETTING_KEYS.verifiedPhoneAt,
        ],
      },
    },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
  return {
    email: map[EMAIL_OTP_SETTING_KEYS.verifiedEmail] ?? "",
    emailVerifiedAt: map[EMAIL_OTP_SETTING_KEYS.verifiedEmailAt] ?? "",
    phone: map[EMAIL_OTP_SETTING_KEYS.verifiedPhone] ?? "",
    phoneVerifiedAt: map[EMAIL_OTP_SETTING_KEYS.verifiedPhoneAt] ?? "",
  };
}

export async function sendEmailSettingsOtp(
  ownerId: bigint,
  type: "email" | "phone",
  raw: string,
): Promise<{ ok: true; message: string; otp?: string } | { ok: false; status: number; error: string }> {
  const valueNorm = type === "email" ? normalizeEmailForOtp(raw) : normalizePhoneForOtp(raw);
  if (type === "email" && !valueNorm.includes("@")) {
    return { ok: false, status: 400, error: "Invalid email address" };
  }
  if (type === "phone" && valueNorm.length < 10) {
    return { ok: false, status: 400, error: "Enter a valid phone number" };
  }

  const otp = generateOtp();
  saveOtp(otpKey(ownerId, type, valueNorm), otp);

  if (type === "phone") {
    const { accountSid, authToken, fromNumber } = await getTwilioSettings();
    if (!accountSid || !authToken || !fromNumber) {
      return {
        ok: true,
        otp,
        message:
          "Twilio not configured (Settings → Twilio SMS or TWILIO_* env) — use this OTP for testing",
      };
    }
    try {
      const toE164 = phoneToE164Sms(valueNorm);
      if (!toE164) return { ok: false, status: 400, error: "Invalid phone number" };
      const client = twilio(accountSid, authToken);
      const from = fromNumber.startsWith("+") ? fromNumber : `+${fromNumber.replace(/\D/g, "")}`;
      await client.messages.create({
        body: await buildOtpSmsBody(otp, "email settings"),
        from,
        to: toE164,
      });
      return { ok: true, message: "OTP sent via SMS" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send SMS";
      return { ok: false, status: 500, error: msg };
    }
  }

  try {
    const settings = await getEffectiveMailSettings(ownerId);
    const smtp = parseSmtpFromSettingsBlob(settings);
    if (smtp.driver === "smtp" && smtp.host) {
      const transporter = createSmtpTransportFromSettings(settings);
      if (transporter) {
        const from = formatSmtpFromHeader(smtp);
        const emailContent = await buildOtpEmailContent(otp);
        await transporter.sendMail({
          from,
          to: valueNorm,
          subject: await buildOtpEmailSubject("email settings"),
          text: emailContent.text,
          html: emailContent.html,
        });
        return { ok: true, message: "OTP sent to email" };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send email";
    return { ok: false, status: 500, error: `${msg}. Save SMTP settings first.` };
  }

  return {
    ok: true,
    otp,
    message: "SMTP not configured — use this OTP for testing",
  };
}

export async function verifyEmailSettingsOtp(
  ownerId: bigint,
  type: "email" | "phone",
  raw: string,
  otp: string,
): Promise<{ ok: true; verifiedAt: string } | { ok: false; status: number; error: string }> {
  const valueNorm = type === "email" ? normalizeEmailForOtp(raw) : normalizePhoneForOtp(raw);
  if (!verifyOtp(otpKey(ownerId, type, valueNorm), otp)) {
    return { ok: false, status: 400, error: "Invalid or expired OTP" };
  }

  const verifiedAt = new Date().toISOString();
  if (type === "email") {
    await upsertOwnerSettings(ownerId, [
      { key: EMAIL_OTP_SETTING_KEYS.verifiedEmail, value: valueNorm, isPublic: true },
      { key: EMAIL_OTP_SETTING_KEYS.verifiedEmailAt, value: verifiedAt, isPublic: true },
    ]);
  } else {
    await upsertOwnerSettings(ownerId, [
      { key: EMAIL_OTP_SETTING_KEYS.verifiedPhone, value: valueNorm, isPublic: true },
      { key: EMAIL_OTP_SETTING_KEYS.verifiedPhoneAt, value: verifiedAt, isPublic: true },
    ]);
  }

  return { ok: true, verifiedAt };
}
