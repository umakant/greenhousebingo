import { NextResponse, type NextRequest } from "next/server";

function clearAuthCookies(res: NextResponse) {
  res.cookies.set("pf_role", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_roles", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_permissions", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_activated_packages", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_email", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_name", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_user_id", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_impersonator_id", "", { path: "/", maxAge: 0 });
  res.cookies.set("pf_sensitive_switch", "", { path: "/", maxAge: 0 });
}

export async function POST(req: NextRequest) {
  // Client triggers logout then navigates; keep response simple.
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}

export async function GET(req: NextRequest) {
  // If someone visits /api/auth/logout directly, redirect with a RELATIVE Location.
  // This avoids redirecting to non-routable hosts like 0.0.0.0.
  const res = new NextResponse(null, { status: 307, headers: { Location: "/login" } });
  clearAuthCookies(res);
  return res;
}

