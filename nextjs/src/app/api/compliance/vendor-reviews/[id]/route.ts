import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { VendorComplianceMetadata } from "@/lib/compliance/compliance-day2";
import {
  certStatusLabel,
  vendorCategoryFromName,
  vendorContractEndDate,
  vendorContractStartDate,
  vendorDisplayName,
  vendorDisplayStatus,
  vendorFrameworksFromName,
  vendorInherentRisk,
  vendorRelatedCounts,
  vendorResidualRisk,
  vendorRiskScore,
  vendorWebsiteFromName,
} from "@/lib/compliance/compliance-vendors";
import { logComplianceActivity, serializeVendorReview } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function enrichDetail(
  base: ReturnType<typeof serializeVendorReview>,
  ownerName: string | null,
  businessOwnerName: string | null,
) {
  const residual = vendorResidualRisk(base.riskTier, base.id);
  const riskScore = vendorRiskScore(base.riskTier, base.id);
  return {
    ...base,
    displayName: vendorDisplayName(base.vendorName),
    category: vendorCategoryFromName(base.vendorName),
    frameworks: vendorFrameworksFromName(base.vendorName),
    displayStatus: vendorDisplayStatus(base.reviewStatus),
    ownerName,
    businessOwnerName,
    website: vendorWebsiteFromName(base.vendorName),
    contractStart: vendorContractStartDate(base.id),
    contractEnd: vendorContractEndDate(base.id),
    riskScore,
    inherentRisk: vendorInherentRisk(base.riskTier),
    residualRisk: residual.label,
    residualScore: residual.score,
    soc2Label: certStatusLabel(base.soc2Status, base.id, "soc2"),
    isoLabel: certStatusLabel(base.isoStatus, base.id, "iso"),
    pciLabel: certStatusLabel(null, base.id, "pci"),
    hipaaLabel: certStatusLabel(base.hipaaBaa, base.id, "hipaa"),
    gdprLabel: certStatusLabel(base.gdprDpa, base.id, "gdpr"),
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vendors");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await prisma.complianceVendorReview.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  let crmVendor = null;
  if (row.vendorId) {
    crmVendor = await prisma.vendor.findUnique({
      where: { id: row.vendorId },
      select: { id: true, name: true, email: true },
    });
  }

  const [history] = await Promise.all([
    prisma.complianceActivityLog.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "vendor_review", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, createdAt: true },
    }),
  ]);

  const ownerName = gate.actor.name;
  const businessOwnerName = crmVendor?.name ?? ownerName;
  const base = serializeVendorReview({ ...row, crmVendor });

  return NextResponse.json({
    ok: true,
    item: enrichDetail(base, ownerName, businessOwnerName),
    relatedCounts: vendorRelatedCounts(Number(row.id)),
    documents: [
      { id: 1, name: "SOC 2 Type II Report", type: "Report" },
      { id: 2, name: "Vendor Security Questionnaire", type: "Questionnaire" },
    ],
    reviews: [
      {
        id: 1,
        name: "Annual vendor review",
        status: row.reviewStatus,
        dueDate: row.dueDate?.toISOString() ?? null,
      },
    ],
    risks: row.riskTier === "high" ? [{ id: 1, title: "Third-party data access", severity: "high" }] : [],
    history: history.map((h) => ({
      id: Number(h.id),
      action: h.action,
      actorName: h.actorName,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vendors");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceVendorReview.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const prevMeta = (existing.metadata ?? {}) as VendorComplianceMetadata;
  const metadata: VendorComplianceMetadata = {
    ...prevMeta,
    ...(body.dataClassification !== undefined
      ? { dataClassification: String(body.dataClassification).trim() || undefined }
      : {}),
    ...(body.soc2Status !== undefined ? { soc2Status: String(body.soc2Status).trim() || undefined } : {}),
    ...(body.isoStatus !== undefined ? { isoStatus: String(body.isoStatus).trim() || undefined } : {}),
    ...(body.hipaaBaa !== undefined ? { hipaaBaa: String(body.hipaaBaa).trim() || undefined } : {}),
    ...(body.gdprDpa !== undefined ? { gdprDpa: String(body.gdprDpa).trim() || undefined } : {}),
    ...(body.reviewSchedule !== undefined
      ? { reviewSchedule: String(body.reviewSchedule).trim() || undefined }
      : {}),
    ...(body.lastReviewNotes !== undefined
      ? { lastReviewNotes: String(body.lastReviewNotes).trim() || undefined }
      : {}),
  };

  const completed = body.reviewStatus === "completed";
  const startReview = body.action === "start_review";
  const row = await prisma.complianceVendorReview.update({
    where: { id: existing.id },
    data: {
      ...(body.vendorId !== undefined
        ? { vendorId: body.vendorId ? BigInt(Number(body.vendorId)) : null }
        : {}),
      ...(body.vendorName !== undefined ? { vendorName: String(body.vendorName).trim() } : {}),
      ...(body.reviewStatus !== undefined ? { reviewStatus: String(body.reviewStatus).trim() } : {}),
      ...(startReview ? { reviewStatus: "pending" } : {}),
      ...(body.riskTier !== undefined ? { riskTier: String(body.riskTier).trim() } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(String(body.dueDate)) : null } : {}),
      ...(body.notes !== undefined ? { notes: String(body.notes).trim() || null } : {}),
      ...(completed ? { completedAt: new Date() } : {}),
      metadata: metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: completed ? "vendor_review_completed" : startReview ? "vendor_review_started" : "vendor_review_updated",
    entityType: "vendor_review",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const base = serializeVendorReview({ ...row });
  return NextResponse.json({
    ok: true,
    item: enrichDetail(base, gate.actor.name, gate.actor.name),
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vendors");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceVendorReview.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.complianceVendorReview.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
