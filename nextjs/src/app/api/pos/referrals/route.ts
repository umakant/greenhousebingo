import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posReferral.findMany({ orderBy: { createdAt: "desc" } });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.code?.trim()) return posErr("Code is required");
  const row = await prisma.posReferral.create({
    data: { code: body.code.trim(), discount: body.discount ?? 0, type: body.type || "percentage", usageLimit: body.usageLimit || null, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, isActive: body.isActive ?? true },
  });
  return posOk(ser(row), 201);
}
