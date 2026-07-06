import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

async function getActor(req: NextRequest) {
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return null;
  return prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-account-setup")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  const existing = await prisma.accountCategory.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.accountCategory.update({
    where: { id: BigInt(id) },
    data: {
      name: body.name != null ? String(body.name).trim() : undefined,
      code: body.code != null ? String(body.code).trim() : undefined,
      type: body.type != null ? String(body.type).trim() : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      isActive: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
    },
  });

  return NextResponse.json({ ok: true, id: Number(updated.id) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-account-setup")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = await getActor(req);
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const { id } = await params;

  const existing = await prisma.accountCategory.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.accountCategory.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
