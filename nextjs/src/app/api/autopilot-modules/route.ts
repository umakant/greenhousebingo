import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

/**
 * Lists autopilot automation modules for superadmin (catalog is empty until backed by persistence).
 */
export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-modules")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    items: [] as Array<{
      id: string;
      code: string | null;
      name: string;
      description: string | null;
      isActive: boolean;
      sortOrder: number;
      createdAt: string | null;
      features: Array<{ id?: string; title: string; description?: string | null; sortOrder?: number }>;
    }>,
  });
}
