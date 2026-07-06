import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posPurchaseReturn.findMany({ include: { purchase: { include: { vendor: true } }, items: true }, orderBy: { date: "desc" }, take: 200 });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.purchaseId) return posErr("Purchase ID is required");
  const number = `PR-${Date.now()}`;
  const items = (body.items ?? []) as Array<{ name: string; qty: number; cost: number; subtotal: number }>;
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const row = await prisma.posPurchaseReturn.create({
    data: { purchaseId: BigInt(body.purchaseId), number, reason: body.reason || null, total, status: body.status || "pending", date: new Date(body.date || Date.now()), items: { create: items } },
    include: { purchase: { include: { vendor: true } }, items: true },
  });
  return posOk(ser(row), 201);
}
