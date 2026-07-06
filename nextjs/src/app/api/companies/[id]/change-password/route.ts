/**
 * Change company user password — mirrors Laravel UserController::changePassword.
 * Auth: cookie-based (same as /api/companies), not NextAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function requireSuperadminManageUsers(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return false;
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return hasPermission(perms, "manage-users");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireSuperadminManageUsers(req)) return forbidden();

  const { id } = await params;
  const companyId = parseInt(id, 10);
  if (Number.isNaN(companyId))
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

  const company = await prisma.user.findFirst({
    where: { id: BigInt(companyId), type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: { password: ["The password must be at least 8 characters."] },
      },
      { status: 422 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: BigInt(companyId) },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
