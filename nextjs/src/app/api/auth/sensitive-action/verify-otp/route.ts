import { type NextRequest, NextResponse } from "next/server";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { authCookieOptions } from "@/lib/cookie-options";
import { verifyOtp } from "@/lib/otp-store";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["switch_company", "marketplace"]);

const GATE_MAX_AGE = 5 * 60; // 5 minutes

export async function POST(req: NextRequest) {
  const emailRaw = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const role = req.cookies.get("pf_role")?.value;
  if (!emailRaw || !role) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  const otp = String(body?.otp ?? "").trim();
  if (!ACTIONS.has(action) || !otp) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const key = `sensitive:${emailRaw}:${action}`;
  const valid = verifyOtp(key, otp);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  if (action === "switch_company") {
    const permsRaw = req.cookies.get("pf_permissions")?.value;
    const perms = getPermissionsFromCookieValue(permsRaw);
    const canSwitch =
      role === "superadmin" && (perms.includes("*") || hasPermission(perms, "impersonate-users"));
    if (!canSwitch) {
      return NextResponse.json({
        ok: true,
        switchAllowed: false,
        message: "Switch company is only available for administrators with impersonation access.",
      });
    }
    const res = NextResponse.json({ ok: true, switchAllowed: true });
    res.cookies.set("pf_sensitive_switch", "1", authCookieOptions(req, GATE_MAX_AGE));
    return res;
  }

  return NextResponse.json({ ok: true });
}
