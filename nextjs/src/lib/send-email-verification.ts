import { prisma } from "@/lib/prisma";
import { createEmailVerificationToken } from "@/lib/email-verification-store";
import {
  getEffectiveMailSettings,
  getPlatformAppName,
  settingsOwnerIdForUser,
} from "@/lib/settings-service";
import { createSmtpTransportFromSettings, formatSmtpFromHeader, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

export type SendEmailVerificationResult =
  | { ok: true; message: string; devLink?: string }
  | { ok: false; message: string; status: number };

export async function sendEmailVerificationForUser(
  user: { id: bigint; email: string; name: string | null; type: string | null; createdBy: bigint | null },
  appUrl: string,
): Promise<SendEmailVerificationResult> {
  const email = user.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, message: "No email address on this account.", status: 400 };
  }

  const existing = await prisma.user.findFirst({
    where: { id: user.id },
    select: { emailVerifiedAt: true, email: true },
  });
  if (existing?.emailVerifiedAt) {
    return { ok: false, message: "This email is already verified.", status: 400 };
  }

  const token = createEmailVerificationToken(user.id, email);
  const verifyUrl = `${appUrl.replace(/\/+$/, "")}/verify-email/confirm?token=${encodeURIComponent(token)}`;
  const appName = await getPlatformAppName();
  const ownerId = settingsOwnerIdForUser(user);
  const settings = await getEffectiveMailSettings(ownerId);
  const smtp = parseSmtpFromSettingsBlob(settings);

  if (smtp.driver !== "smtp" || !smtp.host) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        message:
          "Outgoing email is not configured. Set up SMTP under Settings → Email Settings before sending verification emails.",
        status: 503,
      };
    }
    return {
      ok: true,
      message: "Email is not configured (dev only). Use the verification link below.",
      devLink: verifyUrl,
    };
  }

  const transporter = createSmtpTransportFromSettings(settings);
  if (!transporter) {
    return { ok: false, message: "SMTP is not configured correctly.", status: 503 };
  }

  const displayName = user.name?.trim() || email;
  await transporter.sendMail({
    from: formatSmtpFromHeader(smtp),
    to: email,
    subject: `Verify your ${appName} email`,
    text: `Hello ${displayName},\n\nPlease verify your email address by opening this link:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${displayName},</p><p>Please verify your email address by clicking the button below:</p><p><a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p><p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
  });

  return { ok: true, message: `Verification email sent to ${email}.` };
}

export async function confirmEmailVerification(token: string): Promise<
  | { ok: true; userId: bigint }
  | { ok: false; message: string }
> {
  const { consumeEmailVerificationToken } = await import("@/lib/email-verification-store");
  const payload = consumeEmailVerificationToken(token);
  if (!payload) {
    return { ok: false, message: "This verification link is invalid or has expired." };
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) {
    return { ok: false, message: "Account not found." };
  }
  const accountEmail = user.email?.trim().toLowerCase() ?? "";
  if (!accountEmail || accountEmail !== payload.email) {
    return { ok: false, message: "This verification link no longer matches your account email." };
  }
  if (user.emailVerifiedAt) {
    return { ok: true, userId: user.id };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  return { ok: true, userId: user.id };
}
