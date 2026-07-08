import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/authz";
import {
  parseEmployeePayoutDefaults,
  serializeEmployeePayoutDefaults,
  type EmployeePayoutDefaults,
} from "@/lib/employee-payout-settings";
import { getCompanyId, normalizeEmail } from "@/lib/project-operations-api";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { prisma } from "@/lib/prisma";
import {
  getMergedSettingsForUserEmail,
  getUserByEmail,
  settingsOwnerIdForUser,
  upsertOwnerSettings,
} from "@/lib/settings-service";

export const dynamic = "force-dynamic";

async function requireCompanyProjectManager(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const perms = await getPermissionsFromRequest(req);
  const allowed =
    perms.includes("*") ||
    hasPermission(perms, "manage-project") ||
    hasPermission(perms, "manage-project-dashboard") ||
    hasPermission(perms, "edit-project");
  if (!allowed) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const actor = await getUserByEmail(email);
  if (!actor?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const companyId = getCompanyId(actor);
  const ownerId = settingsOwnerIdForUser(actor);
  return { actor, companyId, ownerId, perms, canWrite: allowed };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCompanyProjectManager(req);
    if ("error" in auth) return auth.error;

    const merged = await getMergedSettingsForUserEmail(
      req.cookies.get("pf_email")?.value ?? "",
      req.nextUrl.origin,
    );
    const defaults = parseEmployeePayoutDefaults(merged.employee_payout_defaults);

    const projectFilter = req.nextUrl.searchParams.get("project_id");
    const filterProjectId = projectFilter ? BigInt(projectFilter) : null;

    const companyProjects = await prisma.project.findMany({
      where: { createdBy: auth.companyId },
      select: { id: true, name: true },
    });
    const companyProjectIds = companyProjects.map((p) => p.id);
    if (!companyProjectIds.length) {
      return NextResponse.json({ defaults, rates: [] });
    }

    if (filterProjectId && !companyProjectIds.some((id) => id === filterProjectId)) {
      return NextResponse.json({ defaults, rates: [] });
    }

    const rateRows = await prisma.projectEmployeePayRate.findMany({
      where: {
        projectId: filterProjectId ?? { in: companyProjectIds },
      },
      orderBy: [{ projectId: "asc" }, { userId: "asc" }],
    });

    const userIds = [...new Set(rateRows.map((r) => r.userId))];

    const projectMap = new Map(companyProjects.map((p) => [p.id, p.name]));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      defaults,
      rates: rateRows.map((r) => {
        const u = userMap.get(r.userId);
        return {
          id: Number(r.id),
          project_id: Number(r.projectId),
          project_name: projectMap.get(r.projectId) ?? "Project",
          user_id: Number(r.userId),
          user_name: u?.name ?? u?.email ?? "Employee",
          user_email: u?.email ?? "",
          role: r.role,
          rate_type: r.rateType,
          pay_rate: String(Number(r.payRate)),
          half_day_rate: r.halfDayRate != null ? String(Number(r.halfDayRate)) : null,
          notes: r.notes,
        };
      }),
    });
  } catch (e) {
    console.error("[employee-payout] GET failed:", e);
    const message =
      e instanceof Error && /project_employee_pay_rates|does not exist/i.test(e.message)
        ? "Employee payout database table is missing. Run npm run build (prebuild) or node scripts/ensure-project-employee-pay-rates-schema.js on the server."
        : "Failed to load employee payout settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireCompanyProjectManager(req);
  if ("error" in auth) return auth.error;
  if (!auth.canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.defaults && typeof body.defaults === "object") {
    const defaults = body.defaults as EmployeePayoutDefaults;
    await upsertOwnerSettings(auth.ownerId, [
      {
        key: "employee_payout_defaults",
        value: serializeEmployeePayoutDefaults(
          parseEmployeePayoutDefaults(JSON.stringify(defaults)),
        ),
      },
    ]);
  }

  if (body.rate && typeof body.rate === "object") {
    const projectId = BigInt(body.rate.project_id);
    const userId = BigInt(body.rate.user_id);
    const payRate = Number(body.rate.pay_rate);
    if (Number.isNaN(payRate) || payRate < 0) {
      return NextResponse.json({ error: "Invalid pay rate" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, createdBy: auth.companyId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const halfRaw = body.rate.half_day_rate;
    const halfDayRate =
      halfRaw != null && halfRaw !== "" && !Number.isNaN(Number(halfRaw)) ? Number(halfRaw) : null;

    const row = await prisma.projectEmployeePayRate.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: {
        projectId,
        userId,
        role: typeof body.rate.role === "string" ? body.rate.role : null,
        rateType: typeof body.rate.rate_type === "string" ? body.rate.rate_type : "per_day",
        payRate,
        halfDayRate,
        notes: typeof body.rate.notes === "string" ? body.rate.notes : null,
        createdBy: auth.actor.id,
      },
      update: {
        role: typeof body.rate.role === "string" ? body.rate.role : null,
        rateType: typeof body.rate.rate_type === "string" ? body.rate.rate_type : "per_day",
        payRate,
        halfDayRate,
        notes: typeof body.rate.notes === "string" ? body.rate.notes : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      rate: {
        id: Number(row.id),
        project_id: Number(row.projectId),
        user_id: Number(row.userId),
        pay_rate: String(Number(row.payRate)),
        half_day_rate: row.halfDayRate != null ? String(Number(row.halfDayRate)) : null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireCompanyProjectManager(req);
  if ("error" in auth) return auth.error;
  if (!auth.canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const projectIdRaw = req.nextUrl.searchParams.get("project_id");
  const userIdRaw = req.nextUrl.searchParams.get("user_id");
  if (!projectIdRaw || !userIdRaw) {
    return NextResponse.json({ error: "project_id and user_id required" }, { status: 400 });
  }

  const projectId = BigInt(projectIdRaw);
  const userId = BigInt(userIdRaw);

  const project = await prisma.project.findFirst({
    where: { id: projectId, createdBy: auth.companyId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await prisma.projectEmployeePayRate.deleteMany({
    where: { projectId, userId },
  });

  return NextResponse.json({ ok: true });
}
