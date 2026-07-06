import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest, getRolesFromRequest } from "@/lib/read-user-cookies";
import { getEmWorkflowCapabilities } from "@/lib/em-expense-workflow";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import {
  applyEmSubmitterListScope,
  parseEmCreatedByUserIdFilter,
} from "@/lib/em-portal-scope";

async function nextReportNumber(organizationId: bigint): Promise<string> {
  const n = await prisma.emExpenseReport.count({ where: { organizationId } });
  const seq = String(n + 1).padStart(5, "0");
  const short = String(organizationId).replace(/\D/g, "").slice(-4) || "0001";
  return `EM-${short}-${seq}`;
}

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-reports") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const isSuperadmin = (actor.type ?? "").toLowerCase().includes("superadmin");
  const url = req.nextUrl;
  const companyIdRaw = (url.searchParams.get("company_id") ?? "").trim();
  let organizationId = resolveEmOrganizationId(actor);
  if (isSuperadmin && companyIdRaw && /^\d+$/.test(companyIdRaw)) {
    organizationId = BigInt(companyIdRaw);
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "20", 10) || 20));
  const skip = (page - 1) * perPage;

  const createdByFilter = parseEmCreatedByUserIdFilter(
    url.searchParams.get("created_by_user_id") ?? "",
    actor,
    perms,
  );
  let where: { organizationId: bigint; createdByUserId?: bigint } = { organizationId };
  if (createdByFilter != null) {
    where.createdByUserId = createdByFilter;
  } else {
    const roles = getRolesFromRequest(req);
    where = applyEmSubmitterListScope(where, actor, perms, roles);
  }

  const [total, rows] = await Promise.all([
    prisma.emExpenseReport.count({ where }),
    prisma.emExpenseReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
      select: {
        id: true,
        reportNumber: true,
        purpose: true,
        dateFrom: true,
        dateTo: true,
        status: true,
        currency: true,
        totalAmount: true,
        rejectionNote: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    data: rows.map((r) => ({
      id: r.id.toString(),
      reportNumber: r.reportNumber,
      purpose: r.purpose,
      dateFrom: r.dateFrom?.toISOString().slice(0, 10) ?? null,
      dateTo: r.dateTo?.toISOString().slice(0, 10) ?? null,
      status: r.status,
      currency: r.currency,
      totalAmount: Number(r.totalAmount),
      rejectionNote: r.rejectionNote,
      createdAt: r.createdAt.toISOString(),
    })),
    meta: { total, page, perPage },
  });
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-reports") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    purpose?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
    currency?: string;
  };

  const organizationId = resolveEmOrganizationId(actor);
  const reportNumber = await nextReportNumber(organizationId);
  const roles = getRolesFromRequest(req);
  const caps = getEmWorkflowCapabilities({ permissions: perms, roles, userType: actor.type });
  const status = caps.isEmployeeSubmitter ? "draft" : (body.status?.trim() || "draft");

  const row = await prisma.emExpenseReport.create({
    data: {
      organizationId,
      reportNumber,
      purpose: body.purpose?.trim() || null,
      dateFrom: body.date_from ? new Date(body.date_from) : null,
      dateTo: body.date_to ? new Date(body.date_to) : null,
      status,
      currency: body.currency?.trim() || "USD",
      createdByUserId: actor.id,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: row.id.toString(),
      reportNumber: row.reportNumber,
      status: row.status,
      totalAmount: Number(row.totalAmount),
    },
  });
}
