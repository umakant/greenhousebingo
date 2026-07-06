import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { loadTwilioWaSettings, saveTwilioWaSettings } from "@/lib/twilio-settings-service";

export const dynamic = "force-dynamic";

function parseRoles(req: NextRequest): string[] {
  try {
    const parsed = JSON.parse(req.cookies.get("pf_roles")?.value ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

function canManageTwilioSettings(req: NextRequest, perms: string[]): boolean {
  if (perms.includes("*")) return true;
  if (hasPermission(perms, "manage-whatsapp-settings") || hasPermission(perms, "edit-settings")) {
    return true;
  }
  const roles = parseRoles(req).map((r) => r.trim().toLowerCase());
  return roles.includes("superadmin") || roles.includes("super_admin");
}

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!canManageTwilioSettings(req, perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const settings = await loadTwilioWaSettings();
  return NextResponse.json({
    ok: true,
    provider: settings.provider,
    accountSid: settings.accountSid,
    authToken: settings.authToken,
    fromNumber: settings.fromNumber,
  });
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!canManageTwilioSettings(req, perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    accountSid?: unknown;
    authToken?: unknown;
    fromNumber?: unknown;
    provider?: unknown;
  };

  const accountSid = String(body.accountSid ?? "").trim();
  const authToken = String(body.authToken ?? "").trim();
  const fromNumber = String(body.fromNumber ?? "").trim();
  const provider = String(body.provider ?? "twilio").trim() || "twilio";

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { ok: false, message: "Account SID, Auth Token, and From Phone Number are required." },
      { status: 400 },
    );
  }

  await saveTwilioWaSettings({ accountSid, authToken, fromNumber, provider });
  return NextResponse.json({ ok: true, message: "Twilio SMS settings saved." });
}
