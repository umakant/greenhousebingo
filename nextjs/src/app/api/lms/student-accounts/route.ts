import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { provisionLmsPortalUser } from "@/lib/lms-provision-portal-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canManageStudents(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-students") || hasPermission(perms, "manage-lms");
}

/** List LMS student portal accounts for the tenant. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageStudents(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

  const rows = await prisma.user.findMany({
    where: {
      createdBy: actor.organizationId,
      type: "lms-student",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      isEnableLogin: true,
      createdAt: true,
      _count: { select: { lmsEnrollmentsAsStudent: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id.toString(),
      name: r.name,
      email: r.email,
      isActive: r.isActive !== false,
      isEnableLogin: r.isEnableLogin !== false,
      createdAt: r.createdAt.toISOString(),
      enrollmentCount: r._count.lmsEnrollmentsAsStudent,
    })),
  });
}

/** Create an LMS student portal login for the organization. */
export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageStudents(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await provisionLmsPortalUser({
    kind: "student",
    organizationId: actor.organizationId,
    firstName: String(body.first_name ?? ""),
    lastName: String(body.last_name ?? ""),
    email: String(body.email ?? ""),
    password: body.password != null ? String(body.password) : undefined,
    sendWelcomeEmail: body.send_welcome_email !== false,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    userId: result.userId.toString(),
    welcome_email_sent: result.welcomeEmailSent,
    ...(result.welcomeEmailError && { welcome_email_error: result.welcomeEmailError }),
  });
}
