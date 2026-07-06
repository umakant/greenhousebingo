import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export const dynamic = "force-dynamic";

async function getActorAndCompany(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return null;
  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return null;
  return { actor, companyId: getCompanyId(actor) };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !perms.includes("manage-project")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctxData = await getActorAndCompany(req);
  if (!ctxData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const pk = BigInt(id);
  const project = await prisma.project.findFirst({
    where: { id: pk, createdBy: ctxData.companyId },
    select: {
      id: true,
      name: true,
      description: true,
      budget: true,
      startDate: true,
      endDate: true,
      status: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: Number(project.id),
    name: project.name,
    description: project.description ?? null,
    budget: project.budget != null ? Number(project.budget) : null,
    start_date: project.startDate?.toISOString().slice(0, 10) ?? null,
    end_date: project.endDate?.toISOString().slice(0, 10) ?? null,
    status: project.status ?? null,
    created_by: project.createdBy != null ? Number(project.createdBy) : null,
    created_at: project.createdAt?.toISOString() ?? null,
    updated_at: project.updatedAt?.toISOString() ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !perms.includes("manage-project")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctxData = await getActorAndCompany(req);
  if (!ctxData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const pk = BigInt(id);
  const existing = await prisma.project.findFirst({
    where: { id: pk, createdBy: ctxData.companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { name?: string; description?: string | null; budget?: import("@prisma/client/runtime/library").Decimal | null; startDate?: Date | null; endDate?: Date | null; status?: string | null } = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description === null || body.description === "" ? null : String(body.description);
  if (body.budget !== undefined) {
    if (body.budget === null || body.budget === "") data.budget = null;
    else {
      const n = Number(body.budget);
      if (!Number.isNaN(n) && n >= 0) {
        const { Decimal } = await import("@prisma/client/runtime/library");
        data.budget = new Decimal(n);
      }
    }
  }
  if (body.start_date !== undefined) {
    if (body.start_date === null || body.start_date === "") data.startDate = null;
    else {
      const d = new Date(String(body.start_date));
      if (!Number.isNaN(d.getTime())) data.startDate = d;
    }
  }
  if (body.end_date !== undefined) {
    if (body.end_date === null || body.end_date === "") data.endDate = null;
    else {
      const d = new Date(String(body.end_date));
      if (!Number.isNaN(d.getTime())) data.endDate = d;
    }
  }
  const statusAllowed = ["Not Started", "Ongoing", "Completed", "Cancelled", "On Hold"] as const;
  if (typeof body.status === "string" && statusAllowed.includes(body.status as (typeof statusAllowed)[number])) {
    data.status = body.status;
  }

  const updated = await prisma.project.update({
    where: { id: pk },
    data,
    select: { id: true, name: true, status: true, startDate: true, endDate: true, budget: true, description: true },
  });

  return NextResponse.json({
    id: Number(updated.id),
    name: updated.name,
    description: updated.description ?? null,
    budget: updated.budget != null ? Number(updated.budget) : null,
    start_date: updated.startDate?.toISOString().slice(0, 10) ?? null,
    end_date: updated.endDate?.toISOString().slice(0, 10) ?? null,
    status: updated.status ?? null,
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !perms.includes("manage-project")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctxData = await getActorAndCompany(req);
  if (!ctxData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const pk = BigInt(id);
  const existing = await prisma.project.findFirst({
    where: { id: pk, createdBy: ctxData.companyId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id: pk } });
  return NextResponse.json({ ok: true });
}
