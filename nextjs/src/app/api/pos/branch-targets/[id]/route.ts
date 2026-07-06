import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.posBranchSalesTarget.update({
    where: { id: BigInt(id) },
    data: { branchId: body.branchId ? BigInt(body.branchId) : undefined, target: body.target ?? undefined, achieved: body.achieved ?? undefined, period: body.period ?? undefined, year: body.year ?? undefined, month: body.month ?? undefined },
    include: { branch: true },
  });
  return posOk(ser(row));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await posAuth()) return posErr("Unauthorized", 401);
  const { id } = await params;
  await prisma.posBranchSalesTarget.delete({ where: { id: BigInt(id) } });
  return posOk({ success: true });
}
