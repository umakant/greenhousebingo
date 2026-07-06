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

async function getProjectForCompany(projectId: bigint, companyId: bigint) {
  return prisma.project.findFirst({
    where: { id: projectId, createdBy: companyId },
    select: { id: true, name: true },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);

  const missions = await prisma.projectMission.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    missions.map((m) => ({
      id: Number(m.id),
      project_id: Number(m.projectId),
      mission_number: m.missionNumber,
      address: m.address ?? null,
      status: m.status,
      notes: m.notes ?? null,
      created_at: m.createdAt.toISOString(),
      updated_at: m.updatedAt?.toISOString() ?? null,
    })),
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  const canCreate =
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("create-project") ||
    perms.includes("manage-project-dashboard");
  if (!canCreate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const actorCtx = await getActor(req);
  if (!actorCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const projectId = BigInt(id);
  const project = await getProjectForCompany(projectId, actorCtx.companyId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const missionNumber = typeof body?.mission_number === "string" ? body.mission_number.trim() : "";
  if (!missionNumber) return NextResponse.json({ error: "mission_number required" }, { status: 400 });

  const status =
    typeof body?.status === "string" && MISSION_STATUSES.includes(body.status as (typeof MISSION_STATUSES)[number])
      ? body.status
      : "Pending";

  const m = await prisma.projectMission.create({
    data: {
      projectId,
      missionNumber,
      address: body?.address ? String(body.address).trim() : null,
      status,
      notes: body?.notes ? String(body.notes).trim() : null,
    },
  });

  return NextResponse.json({
    ok: true,
    id: Number(m.id),
    project_id: Number(m.projectId),
    project_name: project.name,
    mission_number: m.missionNumber,
    address: m.address ?? null,
    status: m.status,
    notes: m.notes ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !perms.includes("manage-project") && !perms.includes("edit-project")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorCtx = await getActor(req);
  if (!actorCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const projectId = BigInt(id);
  const project = await getProjectForCompany(projectId, actorCtx.companyId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.mission_id) return NextResponse.json({ error: "mission_id required" }, { status: 400 });

  const mission = await prisma.projectMission.findFirst({
    where: { id: BigInt(body.mission_id), projectId },
  });
  if (!mission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    missionNumber?: string;
    address?: string | null;
    status?: string;
    notes?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (typeof body.mission_number === "string" && body.mission_number.trim()) {
    data.missionNumber = body.mission_number.trim();
  }
  if (body.address !== undefined) {
    data.address = body.address === null || body.address === "" ? null : String(body.address).trim();
  }
  if (typeof body.status === "string" && MISSION_STATUSES.includes(body.status as (typeof MISSION_STATUSES)[number])) {
    data.status = body.status;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes === null || body.notes === "" ? null : String(body.notes).trim();
  }

  await prisma.projectMission.update({
    where: { id: BigInt(body.mission_id) },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !perms.includes("manage-project") && !perms.includes("delete-project")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorCtx = await getActor(req);
  if (!actorCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const projectId = BigInt(id);
  const project = await getProjectForCompany(projectId, actorCtx.companyId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const missionId = url.searchParams.get("mission_id");
  if (!missionId) return NextResponse.json({ error: "mission_id required" }, { status: 400 });

  await prisma.projectMission.deleteMany({
    where: { id: BigInt(missionId), projectId },
  });

  return NextResponse.json({ ok: true });
}
