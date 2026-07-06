import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { notifyRegistrantCompanyApproved } from "@/lib/send-company-approval-emails";

/**
 * Superadmin: enable login for a pending self-registered company and notify the registrant by email.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "edit-users")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let companyId: bigint;
  try {
    companyId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid company id." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: companyId, type: { in: ["company", "company_admin"] } },
    select: { id: true, name: true, email: true, isEnableLogin: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "Company not found." }, { status: 404 });
  }

  if (user.isEnableLogin !== false) {
    return NextResponse.json({
      ok: true,
      alreadyApproved: true,
      emailSent: false,
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isEnableLogin: true },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || req.nextUrl.origin;
  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;
  const companyName = user.name ?? "";

  let emailSent = false;
  let emailError: string | undefined;
  const email = (user.email ?? "").trim();
  if (email.includes("@")) {
    const sent = await notifyRegistrantCompanyApproved({
      to: email,
      companyName,
      loginUrl,
    });
    emailSent = sent.ok;
    emailError = sent.error;
  } else {
    emailError = "No valid email on file.";
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    ...(emailError && !emailSent ? { emailError } : {}),
  });
}
