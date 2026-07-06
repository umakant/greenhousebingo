import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  policyCategoryFromTitle,
  policyFrameworksFromTitle,
} from "@/lib/compliance/compliance-policies";
import {
  ensureComplianceOperationalSeed,
  loadOwner,
  logComplianceActivity,
  serializePolicy,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichPolicyRow(
  base: ReturnType<typeof serializePolicy>,
  row: { publishedAt: Date | null; approvedAt: Date | null; updatedAt: Date | null },
) {
  return {
    ...base,
    category: policyCategoryFromTitle(base.title),
    frameworks: policyFrameworksFromTitle(base.title),
    lastReviewedAt: row.approvedAt?.toISOString() ?? row.publishedAt?.toISOString() ?? row.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-policies");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureComplianceOperationalSeed(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  const ownerId = req.nextUrl.searchParams.get("ownerId");

  const rows = await prisma.compliancePolicy.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerUserId: BigInt(ownerId) } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { title: "asc" },
    take: 200,
    include: { _count: { select: { acknowledgements: true } } },
  });

  const ownerIds = [...new Set(rows.map((r) => r.ownerUserId).filter(Boolean) as bigint[])];
  const owners = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const ownerById = new Map(owners.map((o) => [String(o.id), o.name ?? o.email ?? null]));

  let items = rows.map((row) => {
    const base = serializePolicy({
      ...row,
      owner: row.ownerUserId
        ? { id: row.ownerUserId, name: ownerById.get(String(row.ownerUserId)) ?? null, email: null }
        : null,
    });
    return enrichPolicyRow(base, row);
  });

  if (category) {
    items = items.filter((i) => i.category === category);
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();
  const ownersList = owners.map((o) => ({ id: Number(o.id), name: o.name ?? o.email ?? "Unknown" }));

  return NextResponse.json({ ok: true, items, categories, owners: ownersList });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-policies");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  }

  const row = await prisma.compliancePolicy.create({
    data: {
      organizationId: gate.actor.organizationId,
      title,
      version: String(body.version ?? "1.0").trim() || "1.0",
      status: String(body.status ?? "draft").trim() || "draft",
      content: String(body.content ?? "").trim() || null,
      ownerUserId: body.ownerUserId ? BigInt(Number(body.ownerUserId)) : gate.actor.userId,
      reviewDueAt: body.reviewDueAt ? new Date(String(body.reviewDueAt)) : null,
      acknowledgementRequired: Boolean(body.acknowledgementRequired),
    },
    include: { _count: { select: { acknowledgements: true } } },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "policy_created",
    entityType: "policy",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = await loadOwner(row.ownerUserId);
  return NextResponse.json({
    ok: true,
    item: enrichPolicyRow(serializePolicy({ ...row, owner }), row),
  });
}
