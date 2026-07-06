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

async function getMissionForCompany(missionId: bigint, companyId: bigint) {
  const mission = await prisma.projectMission.findFirst({
    where: { id: missionId },
  });
  if (!mission) return null;
  const project = await prisma.project.findFirst({
    where: { id: mission.projectId, createdBy: companyId },
    select: { id: true, name: true },
  });
  if (!project) return null;
  return { mission, project };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ missionId: string }> },
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !perms.includes("manage-project") && !perms.includes("edit-project")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorCtx = await getActor(req);
  if (!actorCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { missionId } = await ctx.params;
  const pk = BigInt(missionId);
  const found = await getMissionForCompany(pk, actorCtx.companyId);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

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

  const updated = await prisma.projectMission.update({
    where: { id: pk },
    data,
  });

  return NextResponse.json({
    id: Number(updated.id),
    project_id: Number(updated.projectId),
    project_name: found.project.name,
    mission_number: updated.missionNumber,
    address: updated.address ?? null,
    status: updated.status,
    notes: updated.notes ?? null,
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ missionId: string }> },
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !perms.includes("manage-project") && !perms.includes("delete-project")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorCtx = await getActor(req);
  if (!actorCtx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { missionId } = await ctx.params;
  const pk = BigInt(missionId);
  const found = await getMissionForCompany(pk, actorCtx.companyId);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectMission.delete({ where: { id: pk } });
  return NextResponse.json({ ok: true });
}
