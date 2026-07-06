import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { VendorComplianceMetadata } from "@/lib/compliance/compliance-day2";
import {
  certStatusLabel,
  vendorCategoryFromName,
  vendorCategoryShort,
  vendorDisplayName,
  vendorDisplayStatus,
  vendorFrameworksFromName,
  vendorWebsiteFromName,
} from "@/lib/compliance/compliance-vendors";
import { logComplianceActivity, serializeVendorReview } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichVendorRow(
  base: ReturnType<typeof serializeVendorReview>,
  ownerName: string | null,
) {
  const frameworks = vendorFrameworksFromName(base.vendorName);
  return {
    ...base,
    displayName: vendorDisplayName(base.vendorName),
    category: vendorCategoryFromName(base.vendorName),
    categoryShort: vendorCategoryShort(base.vendorName),
    frameworks,
    displayStatus: vendorDisplayStatus(base.reviewStatus),
    ownerName,
    website: vendorWebsiteFromName(base.vendorName),
    soc2Label: certStatusLabel(base.soc2Status, base.id, "soc2"),
    isoLabel: certStatusLabel(base.isoStatus, base.id, "iso"),
    hipaaLabel: certStatusLabel(base.hipaaBaa, base.id, "hipaa"),
    gdprLabel: certStatusLabel(base.gdprDpa, base.id, "gdpr"),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vendors");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const tier = (req.nextUrl.searchParams.get("tier") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  const framework = (req.nextUrl.searchParams.get("framework") ?? "").trim();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

  const rows = await prisma.complianceVendorReview.findMany({
    where: {
      organizationId,
      ...(status ? { reviewStatus: status } : {}),
      ...(tier ? { riskTier: tier } : {}),
      ...(search ? { vendorName: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: [{ riskTier: "desc" }, { dueDate: "asc" }],
    take: 300,
  });

  const vendorIds = rows.map((r) => r.vendorId).filter((id): id is bigint => id != null);
  const crmVendors =
    vendorIds.length > 0
      ? await prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const vendorMap = new Map(crmVendors.map((v) => [String(v.id), v]));

  const crmList = await prisma.vendor.findMany({
    where: { createdBy: organizationId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  let items = rows.map((row) => {
    const base = serializeVendorReview({
      ...row,
      crmVendor: row.vendorId ? vendorMap.get(String(row.vendorId)) ?? null : null,
    });
    return enrichVendorRow(base, gate.actor.name);
  });

  if (category) items = items.filter((i) => i.categoryShort === category || i.category === category);
  if (framework) items = items.filter((i) => i.frameworks.some((f) => f.toLowerCase().includes(framework.toLowerCase())));

  const categories = [...new Set(items.map((i) => i.categoryShort))].sort();
  const frameworks = [...new Set(items.flatMap((i) => i.frameworks))].sort();

  return NextResponse.json({
    ok: true,
    items,
    categories,
    frameworks,
    crmVendors: crmList.map((v) => ({ id: Number(v.id), name: v.name, email: v.email })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vendors");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const vendorName = String(body.vendorName ?? "").trim();
  if (!vendorName) return NextResponse.json({ ok: false, message: "Vendor name is required." }, { status: 400 });

  const metadata: VendorComplianceMetadata = {
    dataClassification: String(body.dataClassification ?? "").trim() || undefined,
    soc2Status: String(body.soc2Status ?? "").trim() || undefined,
    isoStatus: String(body.isoStatus ?? "").trim() || undefined,
    hipaaBaa: String(body.hipaaBaa ?? "").trim() || undefined,
    gdprDpa: String(body.gdprDpa ?? "").trim() || undefined,
    reviewSchedule: String(body.reviewSchedule ?? "").trim() || undefined,
    lastReviewNotes: String(body.lastReviewNotes ?? "").trim() || undefined,
  };

  const row = await prisma.complianceVendorReview.create({
    data: {
      organizationId: gate.actor.organizationId,
      vendorId: body.vendorId ? BigInt(Number(body.vendorId)) : null,
      vendorName,
      reviewStatus: String(body.reviewStatus ?? "pending").trim() || "pending",
      riskTier: String(body.riskTier ?? "medium").trim() || "medium",
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : new Date(Date.now() + 90 * 86400000),
      notes: String(body.notes ?? "").trim() || null,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "vendor_review_created",
    entityType: "vendor_review",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const base = serializeVendorReview({ ...row });
  return NextResponse.json({ ok: true, item: enrichVendorRow(base, gate.actor.name) });
}
