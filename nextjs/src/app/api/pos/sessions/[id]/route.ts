import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.closingBalance != null) data.closingBalance = body.closingBalance;
  if (body.status === "closed") data.closedAt = new Date();
  if (body.note !== undefined) data.note = body.note;
  const row = await prisma.posSession.update({ where: { id: BigInt(id) }, data, include: { cashRegister: { include: { branch: true } } } });
  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  await prisma.posSession.delete({ where: { id: BigInt(id) } });
  return posOk({ success: true });
}
