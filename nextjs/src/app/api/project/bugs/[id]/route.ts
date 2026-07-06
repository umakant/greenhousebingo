import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export const dynamic = "force-dynamic";

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, type: true, createdBy: true } });
}

function canEditBug(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("edit-project-bug")
  );
}

function canDeleteBug(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("delete-project-bug")
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
    if (!canEditBug(perms)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const bug = await prisma.projectBug.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!bug) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.projectBug.update({
      where: { id: BigInt(id) },
      data: {
        ...(body?.title !== undefined && { title: String(body.title).trim() }),
        ...(body?.priority !== undefined && { priority: body.priority }),
        ...(body?.assigned_to !== undefined && {
          assignedTo: Array.isArray(body.assigned_to) ? body.assigned_to.map(Number) : [],
        }),
        ...(body?.stage_id !== undefined && { stageId: body.stage_id ? BigInt(body.stage_id) : null }),
        ...(body?.description !== undefined && { description: body.description ?? null }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/project/bugs] PATCH", e);
    const message = e instanceof Error ? e.message : "Failed to update bug";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
    if (!canDeleteBug(perms)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const { id } = await params;
    const bug = await prisma.projectBug.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!bug) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.projectBug.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/project/bugs] DELETE", e);
    const message = e instanceof Error ? e.message : "Failed to delete bug";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
