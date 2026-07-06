import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { getEffectiveMailSettings, getPlatformAppName, getUserByEmail, settingsOwnerIdForUser } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, formatSmtpFromHeader, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

function requirePermission(req: NextRequest, required: string): { ok: true } | { ok: false; res: NextResponse } {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return { ok: false, res: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, required) && !perms.includes("*")) {
    return { ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const authz = requirePermission(req, "edit-email-settings");
  if (!authz.ok) return authz.res;

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const to = String(body.email ?? "").trim();
  if (!to || !to.includes("@")) return NextResponse.json({ ok: false, message: "Invalid email address." }, { status: 400 });

  const currentUserEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const user = await getUserByEmail(currentUserEmail);
  if (!user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const ownerId = settingsOwnerIdForUser(user);
  const ownerSettings = await getEffectiveMailSettings(ownerId);
  const smtp = parseSmtpFromSettingsBlob(ownerSettings);

  if (smtp.driver !== "smtp") {
    return NextResponse.json({ ok: false, message: `Test email supports SMTP only (current: ${smtp.driver}).` }, { status: 400 });
  }

  const from = formatSmtpFromHeader(smtp);

  if (!smtp.host) return NextResponse.json({ ok: false, message: "SMTP host is required." }, { status: 400 });

  try {
    const transporter = createSmtpTransportFromSettings(ownerSettings);
    if (!transporter) {
      return NextResponse.json({ ok: false, message: "Could not create SMTP transport." }, { status: 400 });
    }

    const appName = await getPlatformAppName();
    await transporter.sendMail({
      from,
      to,
      subject: `${appName} test email`,
      text: `This is a test email from ${appName}.`,
    });

    return NextResponse.json({ ok: true, message: "Test email sent successfully." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || "Failed to send test email." }, { status: 500 });
  }
}

