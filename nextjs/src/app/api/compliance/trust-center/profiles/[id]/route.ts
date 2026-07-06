import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { serializeTrustCenter } from "@/lib/compliance/compliance-service";
import {
  defaultQuestionnaires,
  defaultSharedLinks,
  defaultTrustProfiles,
  frameworkCoverage,
  frameworkDisplayName,
  parseTrustCenterStorage,
  profileLink,
  profileOwnerName,
} from "@/lib/compliance/compliance-trust-center";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-trust-center");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const org = await prisma.user.findUnique({
    where: { id: gate.actor.organizationId },
    select: { name: true },
  });

  const row = await prisma.complianceTrustCenter.findUnique({
    where: { organizationId: gate.actor.organizationId },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const frameworks = await prisma.complianceFramework.findMany({
    where: { organizationId: gate.actor.organizationId },
    select: { code: true, name: true },
  });
  const frameworkLabels = frameworks.map((f) => frameworkDisplayName(f.code));

  const { admin } = parseTrustCenterStorage(row.sections);
  const profiles = admin.profiles?.length ? admin.profiles : defaultTrustProfiles(org?.name ?? "Organization", frameworkLabels);
  const sharedLinks = admin.sharedLinks?.length ? admin.sharedLinks : defaultSharedLinks(profiles);
  void defaultQuestionnaires();

  const profileIndex = profiles.findIndex((p) => p.id === id);
  const profile = profiles[profileIndex];
  if (!profile) return NextResponse.json({ ok: false, message: "Profile not found." }, { status: 404 });

  const profileSharedLinks = sharedLinks.filter((l) => l.profileId === id);
  const coverage = frameworkCoverage(id, profile.frameworks.length);

  const history = await prisma.complianceActivityLog.findMany({
    where: { organizationId: gate.actor.organizationId, entityType: "trust_center" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, actorName: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...profile,
      ownerName: profileOwnerName(profile, profileIndex + 1),
      profileLink: profileLink(row.publicSlug, profile.id),
      lastUpdatedAt: profile.updatedAt ?? row.lastUpdatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      coverage,
      publicSlug: row.publicSlug,
      published: row.published,
    },
    trustCenter: serializeTrustCenter({ ...row, organizationName: org?.name ?? null }),
    sharedLinks: profileSharedLinks,
    history: history.map((h) => ({
      id: Number(h.id),
      action: h.action,
      actorName: h.actorName,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}
