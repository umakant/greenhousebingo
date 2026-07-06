import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let historyId: bigint;
  try {
    historyId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid history id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.notes === undefined) {
    return NextResponse.json({ ok: false, message: "notes is required." }, { status: 400 });
  }

  const notes = String(body.notes ?? "").trim() || null;

  const existing = await prisma.ownershipBrandHistory.findUnique({ where: { id: historyId } });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "History record not found." }, { status: 404 });
  }

  await prisma.ownershipBrandHistory.update({
    where: { id: historyId },
    data: { notes },
  });

  return NextResponse.json({ ok: true, notes });
}
