import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import { decimalToNumber } from "@/lib/brand-ownership-service";
import { parseDate, toIsoDateString } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const brandIdRaw = params.get("brandId")?.trim();
  const status = params.get("status")?.trim().toLowerCase() ?? "all";
  const dateFrom = params.get("dateFrom")?.trim() ?? "";
  const dateTo = params.get("dateTo")?.trim() ?? "";

  const where: { brandId?: bigint; status?: string } = {};
  if (brandIdRaw) {
    try {
      where.brandId = BigInt(brandIdRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid brand id." }, { status: 400 });
    }
  }
  if (status && status !== "all") {
    where.status = status;
  }

  const rows = await prisma.ownershipBrandRequest.findMany({
    where,
    include: { brand: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  let items = rows.map((r) => ({
    id: r.id.toString(),
    brandId: r.brandId.toString(),
    brandName: r.brand.name,
    partnerName: r.partnerName,
    email: r.email,
    phone: r.phone,
    referralCode: r.referralCode,
    requestedCurrentOwnership: decimalToNumber(r.requestedCurrentOwnership),
    requestedMinimumOwnership: decimalToNumber(r.requestedMinimumOwnership),
    status: r.status,
    conflictDetected: r.conflictDetected,
    conflictMessage: r.conflictMessage,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));

  if (search) {
    items = items.filter(
      (i) =>
        i.partnerName.toLowerCase().includes(search) ||
        i.brandName.toLowerCase().includes(search) ||
        (i.email?.toLowerCase().includes(search) ?? false) ||
        (i.referralCode?.toLowerCase().includes(search) ?? false),
    );
  }

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
