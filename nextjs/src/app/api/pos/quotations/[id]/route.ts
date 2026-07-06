import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const row = await prisma.posQuotation.findUnique({ where: { id: BigInt(id) }, include: { customer: true, items: { include: { product: true } } } });
  if (!row) return posErr("Not found", 404);
  return posOk(ser(row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.posQuotation.update({ where: { id: BigInt(id) }, data: { status: body.status ?? undefined, note: body.note ?? undefined }, include: { customer: true, items: true } });
  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  await prisma.posQuotation.delete({ where: { id: BigInt(id) } });
  return posOk({ success: true });
}
