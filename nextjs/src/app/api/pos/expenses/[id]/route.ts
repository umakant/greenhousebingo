import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.posExpense.update({
    where: { id: BigInt(id) },
    data: { title: body.title?.trim(), amount: body.amount ?? undefined, categoryId: body.categoryId ? BigInt(body.categoryId) : body.categoryId === null ? null : undefined, date: body.date ? new Date(body.date) : undefined, note: body.note ?? undefined },
    include: { category: true },
  });
  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  await prisma.posExpense.delete({ where: { id: BigInt(id) } });
  return posOk({ success: true });
}
