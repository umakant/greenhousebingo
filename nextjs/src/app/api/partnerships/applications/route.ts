import { NextResponse, type NextRequest } from "next/server";

import { parseDate, toIsoDateString } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import { serializePartner } from "@/lib/partner-service";

/** Partner applications are partner rows (pending, active, rejected). */
export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const brandName = params.get("brandName")?.trim() ?? "";
  const statusFilter = (params.get("status") ?? "all").trim().toLowerCase();
  const dateFrom = params.get("dateFrom")?.trim() ?? "";
  const dateTo = params.get("dateTo")?.trim() ?? "";

  const allPartners = await prisma.partner.findMany({ orderBy: { createdAt: "desc" } });
  const stats = {
    total: allPartners.length,
    pending: allPartners.filter((p) => p.status === "pending").length,
    approved: allPartners.filter((p) => p.status === "active").length,
    rejected: allPartners.filter((p) => p.status === "rejected").length,
  };

  let partners = allPartners;
  if (statusFilter && statusFilter !== "all") {
    partners = partners.filter((p) => p.status === statusFilter);
  }
  if (brandName && brandName !== "all") {
    partners = partners.filter((p) => p.brandName === brandName);
  }

  let items = partners.map(serializePartner);

  if (search) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        (i.email?.toLowerCase().includes(search) ?? false) ||
        (i.brandName?.toLowerCase().includes(search) ?? false) ||
        (i.notes?.toLowerCase().includes(search) ?? false),
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

  const brands = [
    ...new Set(allPartners.map((p) => p.brandName?.trim()).filter(Boolean) as string[]),
  ].sort();

  return NextResponse.json({ ok: true, items, stats, brands });
}
