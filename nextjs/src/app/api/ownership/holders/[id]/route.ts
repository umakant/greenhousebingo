import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import {
  deactivateOwnershipPartner,
  deleteOwnershipPartner,
  getBrandOwnershipSummary,
  updateOwnershipPartner,
  validateBrandOwnershipChange,
} from "@/lib/brand-ownership-service";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function currentUserId(req: NextRequest): Promise<bigint | null> {
  const raw = req.cookies.get("pf_user_id")?.value;
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let holderId: bigint;
  try {
    holderId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid holder id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const currentOwnershipPercent = Number(body?.currentOwnershipPercent);
  const minimumOwnershipPercent = Number(body?.minimumOwnershipPercent);

  const existing = await prisma.ownershipBrandHolder.findUnique({ where: { id: holderId } });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Holder not found." }, { status: 404 });
  }

  const validation = await validateBrandOwnershipChange(
    existing.brandId,
    holderId,
    currentOwnershipPercent,
    minimumOwnershipPercent,
  );
  if (!validation.isValid) {
    return NextResponse.json(
      { ok: false, message: validation.conflictMessage, validation },
      { status: 409 },
    );
  }

  try {
    await updateOwnershipPartner({
      holderId,
      currentOwnershipPercent,
      minimumOwnershipPercent,
      status: body?.status ?? existing.status,
      notes: body?.notes ?? existing.notes,
      changedByUserId: await currentUserId(req),
    });
    const summary = await getBrandOwnershipSummary(existing.brandId);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update holder.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  let holderId: bigint;
  try {
    holderId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid holder id." }, { status: 400 });
  }

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";

  try {
    if (permanent) {
      const deleted = await deleteOwnershipPartner({
        holderId,
        changedByUserId: await currentUserId(req),
      });
      const summary = await getBrandOwnershipSummary(BigInt(deleted.brandId));
      return NextResponse.json({ ok: true, summary, deleted: { id: deleted.id, name: deleted.name } });
    }

    const updated = await deactivateOwnershipPartner({
      holderId,
      changedByUserId: await currentUserId(req),
    });
    const summary = await getBrandOwnershipSummary(updated.brandId);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : permanent ? "Could not delete partner." : "Could not deactivate partner.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
