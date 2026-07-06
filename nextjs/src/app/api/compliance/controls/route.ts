import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { ControlRelations } from "@/lib/compliance/compliance-service";
import {
  ensureComplianceOperationalSeed,
  loadOwner,
  logComplianceActivity,
  serializeControl,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-controls");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureComplianceOperationalSeed(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  const frameworkId = req.nextUrl.searchParams.get("frameworkId");

  const rows = await prisma.complianceControl.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(frameworkId ? { frameworkId: BigInt(frameworkId) } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { controlCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: "asc" }, { controlCode: "asc" }],
    take: 300,
    include: {
      framework: { select: { id: true, code: true, name: true } },
      mappings: { include: { framework: { select: { id: true, code: true, name: true } } } },
      _count: { select: { evidence: true, mappings: true } },
    },
  });

  const frameworks = await prisma.complianceFramework.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });

  const items = await Promise.all(
    rows.map(async (row) => {
      const owner = await loadOwner(row.ownerUserId);
      const base = serializeControl({ ...row, owner });
      const frameworkCodes = row.mappings.length
        ? row.mappings.map((m) => ({ code: m.framework.code, name: m.framework.name }))
        : row.framework
          ? [{ code: row.framework.code, name: row.framework.name }]
          : [];
      return { ...base, frameworks: frameworkCodes };
    }),
  );

  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();

  return NextResponse.json({
    ok: true,
    items,
    categories,
    frameworks: frameworks.map((f) => ({ id: Number(f.id), code: f.code, name: f.name })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-controls");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const controlCode = String(body.controlCode ?? body.control_code ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!controlCode || !title) {
    return NextResponse.json({ ok: false, message: "Control code and title are required." }, { status: 400 });
  }

  const frameworkId = body.frameworkId ? BigInt(Number(body.frameworkId)) : null;
  const relations = (body.relations ?? {}) as ControlRelations;

  const row = await prisma.complianceControl.create({
    data: {
      organizationId: gate.actor.organizationId,
      frameworkId,
      controlCode,
      title,
      description: String(body.description ?? "").trim() || null,
      category: String(body.category ?? "").trim() || null,
      status: String(body.status ?? "not_started").trim() || "not_started",
      ownerUserId: body.ownerUserId ? BigInt(Number(body.ownerUserId)) : null,
      testSchedule: String(body.testSchedule ?? body.test_schedule ?? "").trim() || null,
      nextTestAt: body.nextTestAt ? new Date(String(body.nextTestAt)) : null,
      evidenceRequired: body.evidenceRequired !== false,
      relations: relations as Prisma.InputJsonValue,
    },
    include: {
      framework: { select: { id: true, code: true, name: true } },
      _count: { select: { evidence: true, mappings: true } },
    },
  });

  if (frameworkId) {
    await prisma.complianceControlMapping.upsert({
      where: { frameworkId_controlId: { frameworkId, controlId: row.id } },
      create: {
        organizationId: gate.actor.organizationId,
        frameworkId,
        controlId: row.id,
        mappedControlCode: controlCode,
      },
      update: { mappedControlCode: controlCode },
    });
  }

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "control_created",
    entityType: "control",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = await loadOwner(row.ownerUserId);
  return NextResponse.json({ ok: true, item: serializeControl({ ...row, owner }) });
}
