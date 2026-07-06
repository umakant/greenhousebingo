import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { AuditMetadata } from "@/lib/compliance/compliance-day2";
import {
  auditDisplayStatus,
  auditProgressPct,
  auditScope,
  auditSubtitle,
  auditTypeCategory,
  auditTypeLabel,
  auditorDisplay,
} from "@/lib/compliance/compliance-audits";
import { logComplianceActivity, serializeAudit } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichAudit(base: ReturnType<typeof serializeAudit>) {
  const displayStatus = auditDisplayStatus(base.status, base.startDate, base.endDate);
  const auditor = auditorDisplay(base.auditorName, base.id, base.auditType);
  return {
    ...base,
    typeLabel: auditTypeLabel(base.auditType),
    typeCategory: auditTypeCategory(base.auditType),
    displayStatus,
    subtitle: auditSubtitle(base.name, base.frameworkName, base.auditType),
    scope: auditScope(base.id, base.auditType, base.frameworkName),
    auditorPersonName: auditor.personName,
    auditorCompanyName: auditor.companyName,
    progressPct: auditProgressPct(base.status, displayStatus, base.id),
    findingsCount: (base.findings ?? []).length,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-audits");
  if (!gate.ok) return gate.response;

  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const auditType = (req.nextUrl.searchParams.get("auditType") ?? "").trim();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const auditor = (req.nextUrl.searchParams.get("auditor") ?? "").trim();
  const scope = (req.nextUrl.searchParams.get("scope") ?? "").trim();
  const tab = (req.nextUrl.searchParams.get("tab") ?? "").trim();

  const rows = await prisma.complianceAudit.findMany({
    where: {
      organizationId: gate.actor.organizationId,
      ...(status ? { status } : {}),
      ...(auditType ? { auditType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { auditorName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { framework: { select: { id: true, code: true, name: true } } },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  let items = rows.map((row) => enrichAudit(serializeAudit(row)));

  if (auditor && auditor !== "all") {
    items = items.filter((i) => i.auditorPersonName === auditor || i.auditorCompanyName === auditor);
  }
  if (scope && scope !== "all") {
    items = items.filter((i) => i.scope === scope);
  }

  const auditors = [...new Set(items.flatMap((i) => [i.auditorPersonName, i.auditorCompanyName]))].sort();
  const scopes = [...new Set(items.map((i) => i.scope))].sort();

  if (tab === "internal") items = items.filter((i) => i.typeCategory === "internal");
  else if (tab === "external") items = items.filter((i) => i.typeCategory === "external");
  else if (tab === "upcoming") items = items.filter((i) => i.displayStatus === "upcoming");
  else if (tab === "in_progress") items = items.filter((i) => i.displayStatus === "in_progress");
  else if (tab === "completed") items = items.filter((i) => i.displayStatus === "completed");
  else if (tab === "overdue") items = items.filter((i) => i.displayStatus === "overdue");

  return NextResponse.json({ ok: true, items, auditors, scopes });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-audits");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Audit name is required." }, { status: 400 });

  const metadata: AuditMetadata = {
    findings: [],
    evidencePackages: [],
    requests: [],
    auditorUserIds: Array.isArray(body.auditorUserIds)
      ? body.auditorUserIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [],
  };

  const row = await prisma.complianceAudit.create({
    data: {
      organizationId: gate.actor.organizationId,
      frameworkId: body.frameworkId ? BigInt(Number(body.frameworkId)) : null,
      name,
      auditType: String(body.auditType ?? "internal").trim() || "internal",
      status: String(body.status ?? "planned").trim() || "planned",
      auditorName: String(body.auditorName ?? "").trim() || null,
      startDate: body.startDate ? new Date(String(body.startDate)) : null,
      endDate: body.endDate ? new Date(String(body.endDate)) : null,
      metadata: metadata as Prisma.InputJsonValue,
    },
    include: { framework: { select: { id: true, code: true, name: true } } },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "audit_created",
    entityType: "audit",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  return NextResponse.json({ ok: true, item: enrichAudit(serializeAudit(row)) });
}
