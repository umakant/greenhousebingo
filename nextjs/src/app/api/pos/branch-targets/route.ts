import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const rows = await prisma.posBranchSalesTarget.findMany({ include: { branch: true }, orderBy: { createdAt: "desc" } });
  return posOk(ser(rows));
}

export async function POST(req: NextRequest) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const body = await req.json();
  if (!body.target) return posErr("Target is required");
  const row = await prisma.posBranchSalesTarget.create({
    data: { branchId: body.branchId ? BigInt(body.branchId) : null, target: body.target, period: body.period || "monthly", year: body.year || new Date().getFullYear(), month: body.month || null },
    include: { branch: true },
  });
  return posOk(ser(row), 201);
}
