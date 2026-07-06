import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posSaleReturn.findMany({ include: { sale: { include: { customer: true } }, items: true }, orderBy: { date: "desc" }, take: 200 });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.saleId) return posErr("Sale ID is required");
  const number = `SR-${Date.now()}`;
  const items = (body.items ?? []) as Array<{ name: string; qty: number; price: number; subtotal: number }>;
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const row = await prisma.posSaleReturn.create({
    data: { saleId: BigInt(body.saleId), number, reason: body.reason || null, total, status: body.status || "pending", date: new Date(body.date || Date.now()), items: { create: items } },
    include: { sale: { include: { customer: true } }, items: true },
  });
  return posOk(ser(row), 201);
}
