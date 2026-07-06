import twilio from "twilio";
import { type NextRequest, NextResponse } from "next/server";
import { getCompanyId, getHrmActor, checkPerm, forbidden, unauthorized } from "@/lib/hrm-auth";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { generateOtp, saveOtp } from "@/lib/otp-store";
import { getEffectiveMailSettings, settingsOwnerIdForUser } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, formatSmtpFromHeader, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";
import { prisma } from "@/lib/prisma";
import { normalizeEmailForOtp, normalizePhoneForOtp, phoneToE164Sms } from "@/lib/hrm-otp-normalize";
import { resolveTwilioCredentials } from "@/lib/twilio-settings-service";
import { buildOtpEmailContent, buildOtpEmailSubject, buildOtpSmsBody } from "@/lib/otp-notification-copy";

export const dynamic = "force-dynamic";

/** Twilio SMS: `.env` (TWILIO_*) wins if complete; else Settings → Twilio SMS (`wa_settings`). */
async function getTwilioSettings() {
  return resolveTwilioCredentials();
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (
    !checkPerm(perms, "manage-hrm", "manage-employees", "create-employees", "edit-employees")
  ) {
    return forbidden();
  }
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  const body = await req.json().catch(() => null);
  const type: string = body?.type ?? "";
  const raw: string = (body?.value ?? "").trim();

  if (type !== "email" && type !== "phone") {
    return NextResponse.json({ error: "type must be email or phone" }, { status: 400 });
  }
  if (!raw) {
    return NextResponse.json({ error: `${type} is required` }, { status: 400 });
  }

  const valueNorm = type === "email" ? normalizeEmailForOtp(raw) : normalizePhoneForOtp(raw);
  if (type === "email" && !valueNorm.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (type === "phone" && valueNorm.length < 10) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  if (type === "email") {
    const [existingUser, existingEmployee] = await Promise.all([
      prisma.user.findFirst({
        where: { email: { equals: valueNorm, mode: "insensitive" } },
        select: { id: true },
      }),
      prisma.hrmEmployee.findFirst({
        where: {
          createdBy: companyId,
          email: { equals: valueNorm, mode: "insensitive" },
        },
        select: { id: true },
      }),
    ]);
    if (existingUser || existingEmployee) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 400 },
      );
    }
  }

  const otp = generateOtp();
  const key = `${type}:${valueNorm}`;
  saveOtp(key, otp);

  if (type === "phone") {
    const { accountSid, authToken, fromNumber } = await getTwilioSettings();
    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({
        ok: true,
        otp,
        message:
          "Twilio not configured (set TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER or Settings → Twilio SMS) — use this OTP for testing",
      });
    }
    try {
      const toE164 = phoneToE164Sms(valueNorm);
      if (!toE164) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }
      const client = twilio(accountSid, authToken);
      const from = fromNumber.startsWith("+") ? fromNumber : `+${fromNumber.replace(/\D/g, "")}`;
      await client.messages.create({
        body: await buildOtpSmsBody(otp),
        from,
        to: toE164,
      });
      return NextResponse.json({ ok: true, message: "OTP sent via SMS (Twilio)" });
    } catch (err: unknown) {
      const twilioCode =
        typeof err === "object" && err !== null && "code" in err ? Number((err as { code?: unknown }).code) : NaN;
      const twilioMsg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : err instanceof Error
            ? err.message
            : "Failed to send SMS";
      console.error("[send-otp] Twilio SMS", err);
      if (twilioCode === 20003 || /authenticate|401|invalid.*credential/i.test(twilioMsg)) {
        return NextResponse.json(
          {
            error:
              "Twilio authentication failed (error 20003). Confirm TWILIO_SID matches your Twilio Console “Account SID”, TWILIO_AUTH_TOKEN is the current Auth Token (Main or subaccount), with no extra quotes or spaces. Regenerate the token in Twilio if unsure, update .env on the server, then restart PM2 so the process reloads environment variables.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: twilioMsg || "Failed to send SMS" }, { status: 500 });
    }
  }

  if (type === "email") {
    try {
      const ownerId = settingsOwnerIdForUser(actor as { id: bigint; type: string | null; createdBy: bigint | null });
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
            subject: await buildOtpEmailSubject(),
            text: emailContent.text,
            html: emailContent.html,
          });
          return NextResponse.json({ ok: true, message: "OTP sent to email (SMTP)" });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email";
      console.error("[send-otp] SMTP", err);
      return NextResponse.json(
        { error: `${msg}. Check Settings → Email Settings (SMTP).` },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      otp,
      message: "SMTP not configured (Settings → Email Settings) — use this OTP for testing",
    });
  }

  return NextResponse.json({ ok: true, otp, message: "OTP generated" });
}
