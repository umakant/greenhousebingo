import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { loadOwner, logComplianceActivity, serializeEvidence } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-evidence");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const { organizationId } = gate.actor;

  const row = await prisma.complianceEvidence.findFirst({
    where: { id, organizationId },
    include: {
      control: {
        select: {
          id: true,
          controlCode: true,
          title: true,
          mappings: { include: { framework: { select: { id: true, code: true, name: true } } } },
        },
      },
    },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Evidence not found." }, { status: 404 });
  }

  const uploaderId = row.requestedBy ?? row.approvedBy;
  const uploader = uploaderId ? await loadOwner(uploaderId) : null;
  const uploadLog = await prisma.complianceActivityLog.findFirst({
    where: { entityType: "evidence", entityId: id, action: { in: ["evidence_uploaded", "evidence_requested"] } },
    orderBy: { createdAt: "asc" },
    select: { actorName: true },
  });

  const [comments, history, attachments] = await Promise.all([
    prisma.complianceComment.findMany({
      where: { organizationId, entityType: "evidence", entityId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, body: true, authorName: true, createdAt: true },
    }),
    prisma.complianceActivityLog.findMany({
      where: { organizationId, entityType: "evidence", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
    }),
    prisma.complianceAttachment.findMany({
      where: { organizationId, entityType: "evidence", entityId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, fileUrl: true, mimeType: true, createdAt: true },
    }),
  ]);

  const frameworks =
    row.control?.mappings?.map((m) => ({ code: m.framework.code, name: m.framework.name })) ?? [];

  return NextResponse.json({
    ok: true,
    item: {
      ...serializeEvidence(row),
      frameworks,
      uploadedByName: uploadLog?.actorName ?? uploader?.name ?? uploader?.email ?? null,
    },
    frameworks,
    attachments: attachments.map((a) => ({
      id: Number(a.id),
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      createdAt: a.createdAt.toISOString(),
    })),
    comments: comments.map((c) => ({
      id: Number(c.id),
      body: c.body,
      authorName: c.authorName,
      createdAt: c.createdAt.toISOString(),
    })),
    history: history.map((h) => ({
      id: Number(h.id),
      action: h.action,
      actorName: h.actorName,
      metadata: h.metadata,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-evidence");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.complianceEvidence.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Evidence not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status != null) data.status = String(body.status).trim();
  if (body.title != null) data.title = String(body.title).trim();
  if (body.notes != null) data.notes = String(body.notes).trim() || null;
  if (body.fileUrl != null) data.fileUrl = String(body.fileUrl).trim() || null;
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
  if (body.auditorVisible !== undefined) data.auditorVisible = Boolean(body.auditorVisible);
  if (body.controlId !== undefined) {
    data.controlId = body.controlId ? BigInt(Number(body.controlId)) : null;
  }

  const approve = body.approve === true || body.action === "approve";
  const reject = body.reject === true || body.action === "reject";
  if (approve) {
    data.status = "approved";
    data.approvedBy = gate.actor.userId;
    data.approvedAt = new Date();
    if (!existing.collectedAt) data.collectedAt = new Date();
  } else if (reject) {
    data.status = "rejected";
  }

  const row = await prisma.complianceEvidence.update({
    where: { id },
    data,
    include: { control: { select: { id: true, controlCode: true, title: true } } },
  });

  if (body.comment) {
    await prisma.complianceComment.create({
      data: {
        organizationId: gate.actor.organizationId,
        entityType: "evidence",
        entityId: id,
        body: String(body.comment).trim(),
        authorUserId: gate.actor.userId,
        authorName: gate.actor.name,
      },
    });
  }

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: approve ? "evidence_approved" : reject ? "evidence_rejected" : "evidence_updated",
    entityType: "evidence",
    entityId: id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  return NextResponse.json({ ok: true, item: serializeEvidence(row) });
}
