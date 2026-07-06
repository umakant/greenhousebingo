import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { VulnerabilityMetadata } from "@/lib/compliance/compliance-day2";
import { logComplianceActivity, loadOwner, serializeVulnerability } from "@/lib/compliance/compliance-service";
import {
  cvssFromSeverity,
  dueDateFromDiscovered,
  systemFromAsset,
  vulnerabilityDisplayStatus,
  vulnerabilityOwnerName,
} from "@/lib/compliance/compliance-vulnerabilities";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichVulnerability(
  base: ReturnType<typeof serializeVulnerability>,
  actorName: string | null,
) {
  const ownerName = vulnerabilityOwnerName(base.id, base.ownerName ?? actorName);
  const { systemName, environment } = systemFromAsset(base.assetName, base.id);
  const dueDate = base.dueDate ?? dueDateFromDiscovered(base.discoveredAt, base.severity, base.id);
  return {
    ...base,
    ownerName,
    dueDate,
    cvssScore: cvssFromSeverity(base.severity, base.id),
    systemName,
    environment,
    displayStatus: vulnerabilityDisplayStatus(base.status),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vulnerabilities");
  if (!gate.ok) return gate.response;

  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const severity = (req.nextUrl.searchParams.get("severity") ?? "").trim();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const system = (req.nextUrl.searchParams.get("system") ?? "").trim();
  const owner = (req.nextUrl.searchParams.get("owner") ?? "").trim();
  const tab = (req.nextUrl.searchParams.get("tab") ?? "").trim();

  const rows = await prisma.complianceVulnerability.findMany({
    where: {
      organizationId: gate.actor.organizationId,
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { cveId: { contains: search, mode: "insensitive" } },
              { assetName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ severity: "desc" }, { discoveredAt: "desc" }],
    take: 300,
  });

  const ownerIds = [
    ...new Set(
      rows
        .map((r) => (r.metadata as VulnerabilityMetadata | null)?.ownerUserId)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const owners = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds.map((id) => BigInt(id)) } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const ownerById = new Map(owners.map((o) => [Number(o.id), o.name ?? o.email ?? null]));
  let items = await Promise.all(
    rows.map(async (row) => {
      const meta = (row.metadata ?? {}) as VulnerabilityMetadata;
      const ownerUser = meta.ownerUserId
        ? {
            id: BigInt(meta.ownerUserId),
            name: ownerById.get(meta.ownerUserId) ?? null,
            email: null,
          }
        : null;
      const base = serializeVulnerability({ ...row, owner: ownerUser });
      return enrichVulnerability(base, gate.actor.name);
    }),
  );

  if (system && system !== "all") {
    items = items.filter((i) => i.systemName === system);
  }
  if (owner && owner !== "all") {
    items = items.filter((i) => i.ownerName === owner);
  }

  const systems = [...new Set(items.map((i) => i.systemName))].sort();
  const ownerNames = [...new Set(items.map((i) => i.ownerName).filter(Boolean) as string[])].sort();

  if (tab === "resolved") {
    items = items.filter((i) => i.displayStatus === "resolved");
  } else if (tab === "ignored") {
    items = items.filter((i) => i.displayStatus === "ignored");
  } else if (tab && tab !== "all") {
    items = items.filter((i) => i.severity.toLowerCase() === tab);
  }

  return NextResponse.json({ ok: true, items, systems, owners: ownerNames });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vulnerabilities");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });

  const metadata: VulnerabilityMetadata = {
    ownerUserId: body.ownerUserId ? Number(body.ownerUserId) : undefined,
    dueDate: body.dueDate ? String(body.dueDate) : undefined,
    frameworkIds: Array.isArray(body.frameworkIds)
      ? body.frameworkIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [],
    remediationSteps: Array.isArray(body.remediationSteps)
      ? (body.remediationSteps as VulnerabilityMetadata["remediationSteps"])
      : [{ step: "Triage and assign owner", status: "open" }],
  };

  const row = await prisma.complianceVulnerability.create({
    data: {
      organizationId: gate.actor.organizationId,
      title,
      cveId: String(body.cveId ?? "").trim() || null,
      severity: String(body.severity ?? "medium").trim() || "medium",
      status: String(body.status ?? "open").trim() || "open",
      assetName: String(body.assetName ?? "").trim() || null,
      discoveredAt: body.discoveredAt ? new Date(String(body.discoveredAt)) : new Date(),
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "vulnerability_created",
    entityType: "vulnerability",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = metadata.ownerUserId ? await loadOwner(BigInt(metadata.ownerUserId)) : null;
  return NextResponse.json({
    ok: true,
    item: enrichVulnerability(serializeVulnerability({ ...row, owner }), gate.actor.name),
  });
}
