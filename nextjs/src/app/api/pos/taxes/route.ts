import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posTax.findMany({ orderBy: { name: "asc" } });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.name?.trim()) return posErr("Name is required");
  if (body.rate == null) return posErr("Rate is required");
  const row = await prisma.posTax.create({ data: { name: body.name.trim(), rate: body.rate, type: body.type || "percentage" } });
  return posOk(ser(row), 201);
}
