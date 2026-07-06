import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type Body = {
  current_password?: string;
  password?: string;
  password_confirmation?: string;
};

export async function POST(req: NextRequest) {
  const sessionEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!sessionEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "change-password-profile")) {
    return NextResponse.json({ ok: false, message: "Permission denied" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const currentPassword = body.current_password ?? "";
  const password = body.password ?? "";
  const passwordConfirmation = body.password_confirmation ?? "";

  if (!currentPassword || !password) {
    return NextResponse.json({ ok: false, message: "Current password and new password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 422 });
  }
  if (password !== passwordConfirmation) {
    return NextResponse.json({ ok: false, message: "Password confirmation does not match." }, { status: 422 });
  }

  const user = await prisma.user.findFirst({
    where: { email: sessionEmail },
    select: { id: true, password: true },
  });

  if (!user?.password) {
    return NextResponse.json({ ok: false, message: "Unable to change password for this account." }, { status: 400 });
  }

  const normalizedHash = user.password.startsWith("$2y$") ? `$2a$${user.password.slice(4)}` : user.password;
  const currentOk = await bcrypt.compare(currentPassword, normalizedHash);
  if (!currentOk) {
    return NextResponse.json({ ok: false, message: "The provided current password does not match our records." }, { status: 422 });
  }

  const sameAsOld = await bcrypt.compare(password, normalizedHash);
  if (sameAsOld) {
    return NextResponse.json({ ok: false, message: "The new password must be different from your current password." }, { status: 422 });
  }

  const newHash = await bcrypt.hash(password, 10);
  const storedHash = newHash.startsWith("$2a$") ? `$2y$${newHash.slice(4)}` : newHash;

  await prisma.user.update({
    where: { id: user.id },
    data: { password: storedHash, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, message: "Password changed successfully" });
}
