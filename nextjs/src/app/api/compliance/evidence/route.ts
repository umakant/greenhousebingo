import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  ensureComplianceOperationalSeed,
  logComplianceActivity,
  serializeEvidence,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EVIDENCE_INCLUDE = {
  control: {
    select: {
      id: true,
      controlCode: true,
      title: true,
      mappings: { include: { framework: { select: { id: true, code: true, name: true } } } },
    },
  },
} as const;

async function enrichEvidenceRows(
  rows: Array<
    Awaited<ReturnType<typeof prisma.complianceEvidence.findMany>>[number] & {
      control?: {
        id: bigint;
        controlCode: string;
        title: string;
        mappings?: Array<{ framework: { id: bigint; code: string; name: string } }>;
      } | null;
    }
  >,
) {
  const ids = rows.map((r) => r.id);
  const userIds = [...new Set(rows.flatMap((r) => [r.requestedBy, r.approvedBy].filter(Boolean) as bigint[]))];
  const [logs, users] = await Promise.all([
    ids.length
      ? prisma.complianceActivityLog.findMany({
          where: {
            entityType: "evidence",
            entityId: { in: ids },
            action: { in: ["evidence_uploaded", "evidence_requested"] },
          },
          orderBy: { createdAt: "asc" },
          select: { entityId: true, actorName: true },
        })
      : [],
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [],
  ]);
  const logByEntity = new Map<string, string>();
  for (const log of logs) {
    if (!logByEntity.has(String(log.entityId))) logByEntity.set(String(log.entityId), log.actorName ?? "");
  }
  const userById = new Map(users.map((u) => [String(u.id), u.name ?? u.email ?? null]));

  return rows.map((row) => {
    const base = serializeEvidence(row);
    const frameworks =
      row.control?.mappings?.map((m) => ({ code: m.framework.code, name: m.framework.name })) ?? [];
    const uploaderId = row.requestedBy ?? row.approvedBy;
    return {
      ...base,
      frameworks,
      uploadedByName:
        logByEntity.get(String(row.id)) ??
        (uploaderId ? userById.get(String(uploaderId)) ?? null : null),
    };
  });
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-evidence");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureComplianceOperationalSeed(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const evidenceType = (req.nextUrl.searchParams.get("evidenceType") ?? "").trim();
  const controlId = req.nextUrl.searchParams.get("controlId");
  const frameworkId = req.nextUrl.searchParams.get("frameworkId");

  const rows = await prisma.complianceEvidence.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(evidenceType ? { evidenceType } : {}),
      ...(controlId ? { controlId: BigInt(controlId) } : {}),
      ...(frameworkId
        ? { control: { mappings: { some: { frameworkId: BigInt(frameworkId) } } } }
        : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: EVIDENCE_INCLUDE,
  });

  const frameworks = await prisma.complianceFramework.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });

  const items = await enrichEvidenceRows(rows);

  return NextResponse.json({
    ok: true,
    items,
    frameworks: frameworks.map((f) => ({ id: Number(f.id), code: f.code, name: f.name })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-evidence");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  }

  const isRequest = Boolean(body.isRequest ?? body.is_request);
  const row = await prisma.complianceEvidence.create({
    data: {
      organizationId: gate.actor.organizationId,
      controlId: body.controlId ? BigInt(Number(body.controlId)) : null,
      title,
      evidenceType: String(body.evidenceType ?? body.evidence_type ?? "document").trim() || "document",
      status: isRequest ? "requested" : String(body.status ?? "pending").trim() || "pending",
      sourceModule: String(body.sourceModule ?? body.source_module ?? "").trim() || null,
      sourceRecordId: body.sourceRecordId ? BigInt(Number(body.sourceRecordId)) : null,
      fileUrl: String(body.fileUrl ?? body.file_url ?? "").trim() || null,
      notes: String(body.notes ?? "").trim() || null,
      collectedAt: body.collectedAt ? new Date(String(body.collectedAt)) : isRequest ? null : new Date(),
      expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
      auditorVisible: Boolean(body.auditorVisible ?? body.auditor_visible),
      requestedAt: isRequest ? new Date() : null,
      requestedBy: isRequest ? gate.actor.userId : gate.actor.userId,
    },
    include: EVIDENCE_INCLUDE,
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: isRequest ? "evidence_requested" : "evidence_uploaded",
    entityType: "evidence",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  return NextResponse.json({ ok: true, item: (await enrichEvidenceRows([row]))[0] });
}
