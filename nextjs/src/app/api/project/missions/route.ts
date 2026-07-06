import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export const dynamic = "force-dynamic";

const MISSION_STATUSES = ["Pending", "Scheduled", "In Progress", "Completed"] as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

async function getActor(req: NextRequest) {
  const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!email) return null;
  const actor = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return null;
  return { actor, companyId: getCompanyId(actor) };
}

function serializeMission(
  m: {
    id: bigint;
    projectId: bigint;
    missionNumber: string;
    address: string | null;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date | null;
  },
  projectName?: string,
) {
  return {
    id: Number(m.id),
    project_id: Number(m.projectId),
    project_name: projectName ?? undefined,
    mission_number: m.missionNumber,
    address: m.address ?? null,
    status: m.status,
    notes: m.notes ?? null,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt?.toISOString() ?? null,
  };
}

/** Global missions list (missions board). */
export async function GET(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  const canList =
    perms.includes("*") ||
    perms.includes("view-project") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard");
  if (!canList) {
    return NextResponse.json({ data: [] });
  }

  const ctx = await getActor(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const projectId = url.searchParams.get("project_id");

  const projects = await prisma.project.findMany({
    where: { createdBy: ctx.companyId },
    select: { id: true, name: true },
  });
  const projectMap = new Map(projects.map((p) => [String(p.id), p.name]));
  const projectIds = projects.map((p) => p.id);

  if (projectIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const where: {
    projectId: { in: bigint[] } | bigint;
    OR?: Array<{ missionNumber?: { contains: string; mode: "insensitive" }; address?: { contains: string; mode: "insensitive" } }>;
  } = {
    projectId: projectId ? BigInt(projectId) : { in: projectIds },
  };

  if (search) {
    where.OR = [
      { missionNumber: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.projectMission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    data: rows.map((m) => serializeMission(m, projectMap.get(String(m.projectId)) ?? "")),
    statuses: MISSION_STATUSES,
  });
}
