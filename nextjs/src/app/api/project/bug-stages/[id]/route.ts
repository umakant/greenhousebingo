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

function canManage(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return perms.includes("*") || perms.includes("manage-project") || perms.includes("manage-project-bug");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!canManage(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const stage = await prisma.bugStage.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.bugStage.update({
    where: { id: BigInt(id) },
    data: {
      ...(body?.name !== undefined && { name: String(body.name).trim() }),
      ...(body?.color !== undefined && { color: String(body.color) }),
      ...(body?.complete !== undefined && { complete: body.complete === true || body.complete === "true" }),
      ...(body?.order !== undefined && { order: Number(body.order) }),
    },
  });
  return NextResponse.json({ ok: true, id: Number(updated.id), name: updated.name, color: updated.color, complete: updated.complete, order: updated.order });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!canManage(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const stage = await prisma.bugStage.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.bugStage.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
