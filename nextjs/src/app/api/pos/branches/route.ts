import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posBranch.findMany({ orderBy: { name: "asc" } });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.name?.trim()) return posErr("Name is required");
  const row = await prisma.posBranch.create({
    data: { name: body.name.trim(), email: body.email || null, phone: body.phone || null, address: body.address || null, city: body.city || null, country: body.country || null },
  });
  return posOk(ser(row), 201);
}
