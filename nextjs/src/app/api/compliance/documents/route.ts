import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  documentDescription,
  documentEffectiveStatus,
  documentFrameworksFromTitle,
  documentTypeLabel,
  isDocumentExpiringSoon,
} from "@/lib/compliance/compliance-documents";
import {
  ensureComplianceOperationalSeed,
  logComplianceActivity,
  serializeDocument,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichDocumentRow(
  base: ReturnType<typeof serializeDocument>,
  row: { expiresAt: Date | null; versionNotes: string | null },
  ownerName: string | null,
) {
  const effective = documentEffectiveStatus(base.status, row.expiresAt);
  return {
    ...base,
    docTypeLabel: documentTypeLabel(base.docType),
    frameworks: documentFrameworksFromTitle(base.title),
    ownerName,
    description: documentDescription(base.title, row.versionNotes),
    effectiveStatus: effective,
    expiringSoon: isDocumentExpiringSoon(row.expiresAt),
    expired: effective === "expired",
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-documents");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureComplianceOperationalSeed(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const docType = (req.nextUrl.searchParams.get("docType") ?? "").trim();
  const framework = (req.nextUrl.searchParams.get("framework") ?? "").trim();
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  const auditorOnly = req.nextUrl.searchParams.get("auditorVisible") === "1";

  const rows = await prisma.complianceDocument.findMany({
    where: {
      organizationId,
      ...(status && status !== "expired" && status !== "expiring_soon" ? { status } : {}),
      ...(docType ? { docType } : {}),
      ...(ownerId ? { uploadedById: BigInt(ownerId) } : {}),
      ...(auditorOnly ? { auditorVisible: true } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const uploaderIds = [...new Set(rows.map((r) => r.uploadedById).filter(Boolean) as bigint[])];
  const uploaders = uploaderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const ownerById = new Map(uploaders.map((u) => [String(u.id), u.name ?? u.email ?? null]));

  let items = rows.map((row) => {
    const base = serializeDocument(row);
    const ownerName = row.uploadedById
      ? ownerById.get(String(row.uploadedById)) ?? gate.actor.name
      : gate.actor.name;
    return enrichDocumentRow(base, row, ownerName);
  });

  if (status === "expired") {
    items = items.filter((i) => i.expired);
  } else if (status === "expiring_soon") {
    items = items.filter((i) => i.expiringSoon && !i.expired);
  } else if (status === "approved") {
    items = items.filter((i) => i.effectiveStatus === "approved");
  } else if (status === "pending") {
    items = items.filter((i) => i.effectiveStatus === "pending");
  }

  if (framework) {
    items = items.filter((i) => i.frameworks.some((f) => f.toLowerCase().includes(framework.toLowerCase())));
  }

  const docTypes = [...new Set(items.map((i) => i.docType))].sort();
  const frameworks = [...new Set(items.flatMap((i) => i.frameworks))].sort();
  const owners = uploaders.map((u) => ({ id: Number(u.id), name: u.name ?? u.email ?? "Unknown" }));

  return NextResponse.json({ ok: true, items, docTypes, frameworks, owners });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-documents");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  }

  const row = await prisma.complianceDocument.create({
    data: {
      organizationId: gate.actor.organizationId,
      title,
      docType: String(body.docType ?? body.doc_type ?? "general").trim() || "general",
      status: String(body.status ?? "draft").trim() || "draft",
      version: String(body.version ?? "1.0").trim() || "1.0",
      fileUrl: String(body.fileUrl ?? body.file_url ?? "").trim() || null,
      sourceModule: String(body.sourceModule ?? body.source_module ?? "").trim() || null,
      sourceRecordId: body.sourceRecordId ? BigInt(Number(body.sourceRecordId)) : null,
      uploadedById: gate.actor.userId,
      expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
      auditorVisible: Boolean(body.auditorVisible ?? body.auditor_visible),
      versionNotes: String(body.versionNotes ?? body.version_notes ?? "").trim() || null,
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "document_created",
    entityType: "document",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { version: row.version },
  });

  const base = serializeDocument(row);
  return NextResponse.json({
    ok: true,
    item: enrichDocumentRow(base, row, gate.actor.name),
  });
}
