import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import { decimalToNumber } from "@/lib/brand-ownership-service";
import { parseDate, toIsoDateString } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  try {
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

    const holders = await prisma.ownershipBrandHolder.findMany({
      where,
      include: { brand: { select: { id: true, name: true, logo: true } } },
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    });

    const agreementByHolder = new Map<string, { status: string; signedAt: Date | null }>();
    if (holders.length > 0) {
      try {
        const agreements = await prisma.ownershipPartnershipAgreement.findMany({
          where: { holderId: { in: holders.map((h) => h.id) } },
          select: { holderId: true, status: true, signedAt: true },
        });
        for (const agreement of agreements) {
          agreementByHolder.set(agreement.holderId.toString(), {
            status: agreement.status,
            signedAt: agreement.signedAt,
          });
        }
      } catch (err) {
        console.warn("[ownership/partners] Agreement lookup skipped:", err);
      }
    }

    let items = await Promise.all(
      holders.map(async (h) => {
        let companyCount = 0;
        if (h.partnerId) {
          companyCount = await prisma.partnerReferral.count({
            where: { partnerId: h.partnerId, companyId: { not: null } },
          });
        }
        const agreement = agreementByHolder.get(h.id.toString());
        return {
          id: h.id.toString(),
          brandId: h.brandId.toString(),
          brandName: h.brand.name,
          brandLogo: h.brand.logo,
          name: h.name,
          firstName: h.firstName,
          lastName: h.lastName,
          email: h.email,
          phone: h.phone,
          referralCode: h.referralCode,
          currentOwnershipPercent: decimalToNumber(h.currentOwnershipPercent),
          minimumOwnershipPercent: decimalToNumber(h.minimumOwnershipPercent),
          isPrimaryBrandHolder: h.isPrimaryBrandHolder,
          status: h.status,
          payoutMethod: h.payoutMethod,
          payoutEmail: h.payoutEmail,
          companyCount,
          agreementStatus: agreement?.status ?? null,
          agreementSignedAt: agreement?.signedAt?.toISOString() ?? null,
          createdAt: h.createdAt.toISOString(),
        };
      }),
    );

    if (search) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
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
  } catch (err) {
    console.error("[ownership/partners] GET failed:", err);
    const message = err instanceof Error ? err.message : "Could not load partners.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
