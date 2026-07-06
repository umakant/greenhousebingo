import { type NextRequest, NextResponse } from "next/server";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { generateOtp, saveOtp } from "@/lib/otp-store";
import { getEffectiveMailSettings, getUserByEmail, settingsOwnerIdForUser } from "@/lib/settings-service";
import { buildOtpEmailContent, buildOtpEmailSubject } from "@/lib/otp-notification-copy";
import { createSmtpTransportFromSettings, formatSmtpFromHeader, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["switch_company", "marketplace"]);

export async function POST(req: NextRequest) {
  const emailRaw = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const role = req.cookies.get("pf_role")?.value;
  if (!emailRaw || !role) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (action === "switch_company") {
    const permsRaw = req.cookies.get("pf_permissions")?.value;
    const perms = getPermissionsFromCookieValue(permsRaw);
    if (role !== "superadmin" || (!perms.includes("*") && !hasPermission(perms, "impersonate-users"))) {
      return NextResponse.json({ error: "Switch company is not available for your account." }, { status: 403 });
    }
  }

  const user = await getUserByEmail(emailRaw);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const otp = generateOtp();
  const key = `sensitive:${emailRaw}:${action}`;
  saveOtp(key, otp);

  const ownerId = settingsOwnerIdForUser(user);
  const settings = await getEffectiveMailSettings(ownerId);
  const smtp = parseSmtpFromSettingsBlob(settings);

  if (smtp.driver !== "smtp" || !smtp.host) {
    // Production: do not return OTP in JSON; require SMTP so codes are not exposed to the client bundle / toasts.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "Outgoing email is not configured. Ask an admin to open Settings → Email Settings and set up SMTP (or ensure your company mail fields are filled) before using Switch company or Marketplace verification.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      otp,
      message:
        "Email is not configured (dev only). The code is in this JSON response — use your browser Network tab; it is not shown on screen.",
    });
  }

  try {
    const from = formatSmtpFromHeader(smtp);
    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) {
      return NextResponse.json({ error: "SMTP is not configured correctly." }, { status: 503 });
    }
    const label = action === "switch_company" ? "switch company" : "open the marketplace";
    const emailContent = await buildOtpEmailContent(otp, `It was requested to ${label}.`);
    await transporter.sendMail({
      from,
      to: emailRaw,
      subject: await buildOtpEmailSubject(),
      text: emailContent.text,
      html: emailContent.html,
    });
    return NextResponse.json({ ok: true, message: "Code sent to your email." });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
