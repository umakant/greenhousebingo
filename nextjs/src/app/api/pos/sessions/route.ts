import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posSession.findMany({ include: { cashRegister: { include: { branch: true } } }, orderBy: { openedAt: "desc" }, take: 100 });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  const row = await prisma.posSession.create({
    data: { cashRegisterId: body.cashRegisterId ? BigInt(body.cashRegisterId) : null, openingBalance: body.openingBalance ?? 0, note: body.note || null, status: "open" },
    include: { cashRegister: { include: { branch: true } } },
  });
  return posOk(ser(row), 201);
}
