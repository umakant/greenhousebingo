import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posUnit.findMany({ orderBy: { name: "asc" } });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.name?.trim()) return posErr("Name is required");
  if (!body.shortName?.trim()) return posErr("Short name is required");
  const row = await prisma.posUnit.create({ data: { name: body.name.trim(), shortName: body.shortName.trim() } });
  return posOk(ser(row), 201);
}
