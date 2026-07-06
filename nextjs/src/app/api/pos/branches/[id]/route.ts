import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.posBranch.update({
    where: { id: BigInt(id) },
    data: { name: body.name?.trim(), email: body.email || null, phone: body.phone || null, address: body.address || null, city: body.city || null, country: body.country || null, isActive: body.isActive ?? undefined },
  });
  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  await prisma.posBranch.delete({ where: { id: BigInt(id) } });
  return posOk({ success: true });
}
