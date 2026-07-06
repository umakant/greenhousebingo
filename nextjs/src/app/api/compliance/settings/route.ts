import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { defaultTrustCenterSections } from "@/lib/compliance/compliance-day2";
import {
  mergeSettingsIntoSections,
  organizationProfileFromOrg,
  planSummary,
  readSettingsFromSections,
  systemInfo,
  type ComplianceSettingsRecord,
} from "@/lib/compliance/compliance-settings-data";
import { logComplianceActivity } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function loadOrCreateTrustCenter(organizationId: bigint) {
  let row = await prisma.complianceTrustCenter.findUnique({ where: { organizationId } });
  if (!row) {
    row = await prisma.complianceTrustCenter.create({
      data: {
        organizationId,
        sections: defaultTrustCenterSections() as Prisma.InputJsonValue,
      },
    });
  }
  return row;
}

async function buildSettingsPayload(organizationId: bigint) {
  const [org, trustRow, frameworks, userCount, planRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, email: true, mobileNo: true, activePlan: true },
    }),
    loadOrCreateTrustCenter(organizationId),
    prisma.complianceFramework.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, status: true, progressPct: true },
    }),
    prisma.user.count({
      where: {
        createdBy: organizationId,
        type: { notIn: ["company", "company_admin", "superadmin"] },
      },
    }),
    prisma.user
      .findUnique({
        where: { id: organizationId },
        select: { activePlan: true },
      })
      .then(async (u) => {
        if (!u?.activePlan) return null;
        return prisma.plan.findFirst({
          where: { id: BigInt(u.activePlan) },
          select: { name: true, numberOfUsers: true },
        });
      }),
  ]);

  const stored = readSettingsFromSections(trustRow.sections);
  const organization = organizationProfileFromOrg(org?.name ?? null, org?.email ?? null, org?.mobileNo ?? null, stored.organization);
  const orgId = Number(organizationId);

  return {
    organizationName: org?.name ?? "Organization",
    organization,
    toggles: stored.toggles,
    security: stored.security,
    dataRetention: stored.dataRetention,
    frameworks: frameworks.map((f) => ({
      id: Number(f.id),
      code: f.code,
      name: f.name,
      status: f.status,
      enabled: f.status !== "disabled" && f.status !== "archived",
      progressPct: f.progressPct,
    })),
    plan: planSummary(orgId, planRow?.name ?? null, userCount, planRow?.numberOfUsers ?? null),
    system: systemInfo(orgId),
    roles: [
      { role: "Super Admin", description: "Full access, all tenants" },
      { role: "Company Admin", description: "Full org compliance program" },
      { role: "Compliance Manager", description: "Manage controls, evidence, audits" },
      { role: "Employee", description: "Policies and acknowledgements only" },
      { role: "Auditor", description: "Read-only frameworks, controls, evidence, audits" },
    ],
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-settings");
  if (!gate.ok) return gate.response;

  const payload = await buildSettingsPayload(gate.actor.organizationId);
  return NextResponse.json({ ok: true, ...payload });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-settings");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Partial<ComplianceSettingsRecord> & {
    organizationName?: string;
  };

  const trustRow = await loadOrCreateTrustCenter(gate.actor.organizationId);
  const current = readSettingsFromSections(trustRow.sections);

  const nextSettings: ComplianceSettingsRecord = {
    organization: body.organization ? { ...current.organization, ...body.organization } : current.organization,
    toggles: body.toggles ? { ...current.toggles, ...body.toggles } : current.toggles,
    security: body.security ? { ...current.security, ...body.security } : current.security,
    dataRetention: body.dataRetention ? { ...current.dataRetention, ...body.dataRetention } : current.dataRetention,
  };

  const sectionsObj =
    trustRow.sections && typeof trustRow.sections === "object" && !Array.isArray(trustRow.sections)
      ? (trustRow.sections as Record<string, unknown>)
      : {};

  await prisma.complianceTrustCenter.update({
    where: { id: trustRow.id },
    data: {
      sections: mergeSettingsIntoSections(sectionsObj, nextSettings) as Prisma.InputJsonValue,
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  if (body.organizationName?.trim()) {
    await prisma.user.update({
      where: { id: gate.actor.organizationId },
      data: { name: body.organizationName.trim() },
    });
  }

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "settings_updated",
    entityType: "settings",
    entityId: trustRow.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const payload = await buildSettingsPayload(gate.actor.organizationId);
  return NextResponse.json({ ok: true, ...payload });
}
