import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  documentDescription,
  documentEffectiveStatus,
  documentFileName,
  documentFileSizeBytes,
  documentFrameworksFromTitle,
  documentRelatedCounts,
  documentTypeLabel,
  formatFileSize,
  isDocumentExpiringSoon,
} from "@/lib/compliance/compliance-documents";
import { loadOwner, logComplianceActivity, serializeDocument } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function enrichDetail(
  base: ReturnType<typeof serializeDocument>,
  row: {
    expiresAt: Date | null;
    versionNotes: string | null;
    auditorVisible: boolean | null;
    approvedAt: Date | null;
  },
  ownerName: string | null,
  uploadedByName: string | null,
) {
  const effective = documentEffectiveStatus(base.status, row.expiresAt);
  const id = base.id;
  return {
    ...base,
    docTypeLabel: documentTypeLabel(base.docType),
    frameworks: documentFrameworksFromTitle(base.title),
    ownerName,
    uploadedByName,
    description: documentDescription(base.title, row.versionNotes),
    effectiveStatus: effective,
    expiringSoon: isDocumentExpiringSoon(row.expiresAt),
    expired: effective === "expired",
    fileName: documentFileName(base.title, base.fileUrl),
    fileSize: formatFileSize(documentFileSizeBytes(id)),
    trustCenterPublished: Boolean(row.auditorVisible && row.approvedAt),
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-documents");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const { organizationId } = gate.actor;

  const row = await prisma.complianceDocument.findFirst({ where: { id, organizationId } });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Document not found." }, { status: 404 });
  }

  const [history, uploader] = await Promise.all([
    prisma.complianceActivityLog.findMany({
      where: { organizationId, entityType: "document", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
    }),
    row.uploadedById ? loadOwner(row.uploadedById) : null,
  ]);

  const uploadedByName = uploader?.name ?? uploader?.email ?? gate.actor.name;
  const ownerName = uploadedByName;
  const base = serializeDocument(row);

  return NextResponse.json({
    ok: true,
    item: enrichDetail(base, row, ownerName, uploadedByName),
    relatedCounts: documentRelatedCounts(Number(row.id)),
    versions: [
      {
        version: base.version,
        status: base.status,
        uploadedAt: base.createdAt,
        uploadedByName,
        notes: row.versionNotes,
      },
    ],
    access: [
      { role: "Compliance Team", access: "Edit" },
      { role: "Auditors", access: row.auditorVisible ? "View" : "None" },
      { role: "All Employees", access: "None" },
    ],
    comments: [] as Array<{ id: number; body: string; authorName: string | null; createdAt: string }>,
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
  const gate = await requireComplianceApiAccess(req, "manage-compliance-documents");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.complianceDocument.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Document not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title != null) data.title = String(body.title).trim();
  if (body.status != null) data.status = String(body.status).trim();
  if (body.fileUrl != null) data.fileUrl = String(body.fileUrl).trim() || null;
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
  if (body.auditorVisible !== undefined) data.auditorVisible = Boolean(body.auditorVisible);
  if (body.versionNotes != null) data.versionNotes = String(body.versionNotes).trim() || null;

  const approve = body.action === "approve" || body.approve === true;
  const requestReview = body.action === "request_review" || body.requestReview === true;
  const newVersion = body.action === "new_version" || body.newVersion === true;
  if (approve) {
    data.status = "approved";
    data.approvedAt = new Date();
  }
  if (requestReview) {
    data.status = "pending";
    data.approvedAt = null;
  }
  if (newVersion) {
    const parts = existing.version.split(".");
    const minor = Number(parts[1] ?? 0) + 1;
    data.version = `${parts[0]}.${minor}`;
    data.status = "draft";
    data.approvedAt = null;
  }

  const row = await prisma.complianceDocument.update({ where: { id }, data });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: approve
      ? "document_approved"
      : requestReview
        ? "document_review_requested"
        : newVersion
          ? "document_versioned"
          : "document_updated",
    entityType: "document",
    entityId: id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { version: row.version },
  });

  const uploader = row.uploadedById ? await loadOwner(row.uploadedById) : null;
  const uploadedByName = uploader?.name ?? uploader?.email ?? gate.actor.name;
  const base = serializeDocument(row);
  return NextResponse.json({
    ok: true,
    item: enrichDetail(base, row, uploadedByName, uploadedByName),
  });
}
