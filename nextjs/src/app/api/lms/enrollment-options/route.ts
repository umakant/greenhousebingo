import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canManageEnrollments(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-students") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms-instructors") ||
    hasPermission(perms, "manage-lms")
  );
}

/** Search learners and CRM contacts when enrolling from LMS admin. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canManageEnrollments(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const orgId = actor.organizationId;

  const userWhere: {
    OR: Array<{ id: bigint } | { createdBy: bigint }>;
    type: { not: string };
    AND?: Array<{
      OR: Array<
        | { name: { contains: string; mode: "insensitive" } }
        | { email: { contains: string; mode: "insensitive" } }
      >;
    }>;
  } = {
    OR: [{ id: orgId }, { createdBy: orgId }],
    type: { not: "superadmin" },
  };
  if (search) {
    userWhere.AND = [
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const crmWhere: {
    createdBy: bigint;
    OR?: Array<
      | { companyName: { contains: string; mode: "insensitive" } }
      | { contactPersonEmail: { contains: string; mode: "insensitive" } }
      | { contactPersonName: { contains: string; mode: "insensitive" } }
      | { customerCode: { contains: string; mode: "insensitive" } }
    >;
  } = { createdBy: orgId };
  if (search) {
    crmWhere.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { contactPersonEmail: { contains: search, mode: "insensitive" } },
      { contactPersonName: { contains: search, mode: "insensitive" } },
      { customerCode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, customers] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 40,
      select: { id: true, name: true, email: true },
    }),
    prisma.customer.findMany({
      where: crmWhere,
      orderBy: [{ companyName: "asc" }, { id: "asc" }],
      take: 40,
      select: {
        id: true,
        userId: true,
        companyName: true,
        contactPersonName: true,
        contactPersonEmail: true,
        customerCode: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    users: users.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      label: u.name?.trim() || u.email || u.id.toString(),
    })),
    crmCustomers: customers.map((c) => ({
      id: c.id.toString(),
      userId: c.userId?.toString() ?? null,
      companyName: c.companyName,
      contactPersonName: c.contactPersonName,
      contactPersonEmail: c.contactPersonEmail,
      customerCode: c.customerCode,
      label: [c.companyName, c.contactPersonName, c.contactPersonEmail].filter(Boolean).join(" · "),
    })),
  });
}
