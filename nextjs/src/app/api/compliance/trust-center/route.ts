import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { defaultTrustCenterSections } from "@/lib/compliance/compliance-day2";
import { logComplianceActivity, serializeTrustCenter } from "@/lib/compliance/compliance-service";
import {
  defaultQuestionnaires,
  defaultSharedLinks,
  defaultTrustProfiles,
  frameworkDisplayName,
  mergeTrustCenterStorage,
  parseTrustCenterStorage,
  profileLink,
  profileOwnerName,
  recentTrustActivity,
  trustStats,
  type TrustCenterAdminMeta,
  type TrustProfileRecord,
} from "@/lib/compliance/compliance-trust-center";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function resolveAdminMeta(
  admin: TrustCenterAdminMeta,
  orgName: string,
  frameworkCodes: string[],
): TrustCenterAdminMeta {
  const profiles =
    admin.profiles?.length ? admin.profiles : defaultTrustProfiles(orgName, frameworkCodes.map(frameworkDisplayName));
  const sharedLinks = admin.sharedLinks?.length ? admin.sharedLinks : defaultSharedLinks(profiles);
  const questionnaires = admin.questionnaires?.length ? admin.questionnaires : defaultQuestionnaires();
  const downloadCount = admin.downloadCount ?? 12;
  return { profiles, sharedLinks, questionnaires, downloadCount };
}

function enrichProfile(
  profile: TrustProfileRecord,
  publicSlug: string | null,
  index: number,
) {
  return {
    ...profile,
    ownerName: profileOwnerName(profile, index + 1),
    profileLink: profileLink(publicSlug, profile.id),
    lastUpdatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-trust-center");
  if (!gate.ok) return gate.response;

  const org = await prisma.user.findUnique({
    where: { id: gate.actor.organizationId },
    select: { name: true },
  });

  let row = await prisma.complianceTrustCenter.findUnique({
    where: { organizationId: gate.actor.organizationId },
  });

  if (!row) {
    row = await prisma.complianceTrustCenter.create({
      data: {
        organizationId: gate.actor.organizationId,
        sections: defaultTrustCenterSections() as Prisma.InputJsonValue,
      },
    });
  }

  const frameworks = await prisma.complianceFramework.findMany({
    where: { organizationId: gate.actor.organizationId },
    select: { code: true, name: true },
    orderBy: { name: "asc" },
  });
  const frameworkCodes = frameworks.map((f) => f.code);
  const frameworkLabels = frameworks.map((f) => frameworkDisplayName(f.code));

  const { pageSections, admin } = parseTrustCenterStorage(row.sections);
  const resolved = resolveAdminMeta(admin, org?.name ?? "Organization", frameworkLabels);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const framework = (req.nextUrl.searchParams.get("framework") ?? "").trim();
  const owner = (req.nextUrl.searchParams.get("owner") ?? "").trim();

  let profiles = resolved.profiles!.map((p, i) => enrichProfile(p, row!.publicSlug, i));
  if (search) {
    const q = search.toLowerCase();
    profiles = profiles.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }
  if (status && status !== "all") profiles = profiles.filter((p) => p.status === status);
  if (framework && framework !== "all") profiles = profiles.filter((p) => p.frameworks.includes(framework));
  if (owner && owner !== "all") profiles = profiles.filter((p) => p.ownerName === owner);

  const owners = [...new Set(resolved.profiles!.map((p, i) => profileOwnerName(p, i + 1)))].sort();
  const stats = trustStats(
    resolved.profiles!,
    resolved.sharedLinks!,
    resolved.questionnaires!,
    resolved.downloadCount ?? 12,
  );

  const invites = await prisma.complianceAuditorInvite.findMany({
    where: { organizationId: gate.actor.organizationId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const activityLogs = await prisma.complianceActivityLog.findMany({
    where: {
      organizationId: gate.actor.organizationId,
      OR: [{ entityType: "trust_center" }, { action: { contains: "trust" } }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const recentActivity =
    activityLogs.length > 0
      ? activityLogs.map((h) => ({
          id: String(h.id),
          message: h.action.replace(/_/g, " "),
          actorName: h.actorName ?? "System",
          createdAt: h.createdAt.toISOString(),
          type: "log",
        }))
      : recentTrustActivity(org?.name ?? "Organization", resolved.sharedLinks!, resolved.profiles!);

  return NextResponse.json({
    ok: true,
    item: serializeTrustCenter({ ...row, organizationName: org?.name ?? null }),
    pageSections,
    profiles,
    sharedLinks: resolved.sharedLinks!.map((l) => {
      const profile = resolved.profiles!.find((p) => p.id === l.profileId);
      return { ...l, profileName: profile?.name ?? l.profileName };
    }),
    questionnaires: resolved.questionnaires,
    stats,
    recentActivity,
    frameworks: frameworkLabels,
    owners,
    auditorInvites: invites.map((i) => ({
      id: Number(i.id),
      auditId: i.auditId ? Number(i.auditId) : null,
      auditorName: i.auditorName,
      auditorEmail: i.auditorEmail,
      token: i.token,
      portalUrl: `/auditor/${i.token}`,
      expiresAt: i.expiresAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-trust-center");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const org = await prisma.user.findUnique({
    where: { id: gate.actor.organizationId },
    select: { name: true },
  });

  const existing = await prisma.complianceTrustCenter.findUnique({
    where: { organizationId: gate.actor.organizationId },
  });
  const { pageSections, admin } = parseTrustCenterStorage(existing?.sections);

  const slug =
    body.publicSlug !== undefined
      ? String(body.publicSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || null
      : undefined;

  let nextAdmin = { ...admin };

  if (body.addProfile && typeof body.addProfile === "object") {
    const p = body.addProfile as Record<string, unknown>;
    const profiles = [...(admin.profiles ?? [])];
    profiles.push({
      id: randomBytes(4).toString("hex"),
      name: String(p.name ?? "New Profile").trim(),
      description: String(p.description ?? "").trim() || undefined,
      status: "draft" as const,
      visibility: (String(p.visibility ?? "private") as TrustProfileRecord["visibility"]) || "private",
      frameworks: Array.isArray(p.frameworks) ? p.frameworks.map(String) : [],
      ownerName: gate.actor.name ?? undefined,
      updatedAt: new Date().toISOString(),
    });
    nextAdmin = { ...nextAdmin, profiles };
  }

  if (body.updateProfile && typeof body.updateProfile === "object") {
    const p = body.updateProfile as Record<string, unknown>;
    const profileId = String(p.id ?? "");
    nextAdmin = {
      ...nextAdmin,
      profiles: (admin.profiles ?? []).map((prof) =>
        prof.id === profileId
          ? {
              ...prof,
              ...(p.name !== undefined ? { name: String(p.name).trim() } : {}),
              ...(p.description !== undefined ? { description: String(p.description).trim() } : {}),
              ...(p.status !== undefined ? { status: String(p.status) as TrustProfileRecord["status"] } : {}),
              ...(p.visibility !== undefined
                ? { visibility: String(p.visibility) as TrustProfileRecord["visibility"] }
                : {}),
              ...(p.frameworks !== undefined ? { frameworks: (p.frameworks as string[]) ?? [] } : {}),
              updatedAt: new Date().toISOString(),
            }
          : prof,
      ),
    };
  }

  const nextSections = mergeTrustCenterStorage(
    body.sections !== undefined ? (body.sections as typeof pageSections) : pageSections,
    nextAdmin,
  );

  const row = await prisma.complianceTrustCenter.upsert({
    where: { organizationId: gate.actor.organizationId },
    create: {
      organizationId: gate.actor.organizationId,
      published: body.published === true,
      publicSlug: slug ?? null,
      publicUrl: slug ? `/trust/${slug}` : null,
      auditorPortalEnabled: body.auditorPortalEnabled === true,
      sections: nextSections as Prisma.InputJsonValue,
      lastUpdatedAt: new Date(),
    },
    update: {
      ...(body.published !== undefined ? { published: body.published === true } : {}),
      ...(slug !== undefined ? { publicSlug: slug, publicUrl: slug ? `/trust/${slug}` : null } : {}),
      ...(body.auditorPortalEnabled !== undefined
        ? { auditorPortalEnabled: body.auditorPortalEnabled === true }
        : {}),
      sections: nextSections as Prisma.InputJsonValue,
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "trust_center_updated",
    entityType: "trust_center",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  return NextResponse.json({ ok: true, item: serializeTrustCenter({ ...row, organizationName: org?.name ?? null }) });
}
