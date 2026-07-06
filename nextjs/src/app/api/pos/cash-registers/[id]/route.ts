import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.posCashRegister.update({
    where: { id: BigInt(id) },
    data: { name: body.name?.trim(), branchId: body.branchId ? BigInt(body.branchId) : body.branchId === null ? null : undefined, isActive: body.isActive ?? undefined },
    include: { branch: true },
  });
  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  await prisma.posCashRegister.delete({ where: { id: BigInt(id) } });
  return posOk({ success: true });
}
