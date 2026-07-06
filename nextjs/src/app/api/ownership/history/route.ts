import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import { decimalToNumber } from "@/lib/brand-ownership-service";
import { parseDate, toIsoDateString } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  const brandIdRaw = params.get("brandId")?.trim();
  const holderIdRaw = params.get("holderId")?.trim();
  const changedByUserIdRaw = params.get("changedByUserId")?.trim();
  const action = params.get("action")?.trim().toLowerCase() ?? "all";
  const dateFrom = params.get("dateFrom")?.trim() ?? "";
  const dateTo = params.get("dateTo")?.trim() ?? "";

  const where: { brandId?: bigint; holderId?: bigint; changedByUserId?: bigint; action?: string } = {};
  if (brandIdRaw) {
    try {
      where.brandId = BigInt(brandIdRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid brand id." }, { status: 400 });
    }
  }
  if (holderIdRaw) {
    try {
      where.holderId = BigInt(holderIdRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid holder id." }, { status: 400 });
    }
  }
  if (changedByUserIdRaw) {
    try {
      where.changedByUserId = BigInt(changedByUserIdRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid user id." }, { status: 400 });
    }
  }
  if (action && action !== "all") {
    where.action = action;
  }

  const rows = await prisma.ownershipBrandHistory.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const brandIds = [...new Set(rows.map((r) => r.brandId))];
  const holderIds = [...new Set(rows.map((r) => r.holderId).filter(Boolean))] as bigint[];
  const userIds = [...new Set(rows.map((r) => r.changedByUserId).filter(Boolean))] as bigint[];

  const [brands, holders, users] = await Promise.all([
    prisma.ownershipBrand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, logo: true },
    }),
    holderIds.length
      ? prisma.ownershipBrandHolder.findMany({
          where: { id: { in: holderIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const brandMap = new Map(brands.map((b) => [b.id.toString(), b]));
  const holderMap = new Map(holders.map((h) => [h.id.toString(), h]));
  const userMap = new Map(users.map((u) => [u.id.toString(), u]));

  let items = rows.map((r) => {
    const brand = brandMap.get(r.brandId.toString());
    const holder = r.holderId ? holderMap.get(r.holderId.toString()) : null;
    const user = r.changedByUserId ? userMap.get(r.changedByUserId.toString()) : null;
    return {
      id: r.id.toString(),
      brandId: r.brandId.toString(),
      brandName: brand?.name ?? "—",
      brandLogo: brand?.logo ?? null,
      holderId: r.holderId?.toString() ?? null,
      holderName: holder?.name ?? null,
      holderEmail: holder?.email ?? null,
      action: r.action,
      oldCurrentOwnershipPercent: r.oldCurrentOwnershipPercent
        ? decimalToNumber(r.oldCurrentOwnershipPercent)
        : null,
      newCurrentOwnershipPercent: r.newCurrentOwnershipPercent
        ? decimalToNumber(r.newCurrentOwnershipPercent)
        : null,
      oldMinimumOwnershipPercent: r.oldMinimumOwnershipPercent
        ? decimalToNumber(r.oldMinimumOwnershipPercent)
        : null,
      newMinimumOwnershipPercent: r.newMinimumOwnershipPercent
        ? decimalToNumber(r.newMinimumOwnershipPercent)
        : null,
      changedByUserId: r.changedByUserId?.toString() ?? null,
      changedBy: user ? user.name || user.email || "User" : null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    };
  });

  if (dateFrom || dateTo) {
    items = items.filter((i) => {
      const d = parseDate(i.createdAt);
      if (!d) return false;
      const iso = toIsoDateString(d);
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    });
  }

  return NextResponse.json({ ok: true, items });
}
