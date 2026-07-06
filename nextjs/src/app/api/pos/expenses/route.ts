import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posExpense.findMany({ include: { category: true }, orderBy: { date: "desc" }, take: 200 });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.title?.trim()) return posErr("Title is required");
  if (body.amount == null) return posErr("Amount is required");
  const row = await prisma.posExpense.create({
    data: { title: body.title.trim(), amount: body.amount, categoryId: body.categoryId ? BigInt(body.categoryId) : null, date: new Date(body.date || Date.now()), note: body.note || null },
    include: { category: true },
  });
  return posOk(ser(row), 201);
}
