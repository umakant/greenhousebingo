import { NextResponse, type NextRequest } from "next/server";

import { combineHolderName } from "@/lib/brand-ownership-holder-name";
import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { ensureUniqueVendorSlug, serializeVendor } from "@/lib/marketplace-service";
import {
  parseVendorLoginAccessBody,
  provisionMarketplaceVendorLogin,
} from "@/lib/marketplace-vendor-user-service";
import { loadVendorLoginAccess } from "@/lib/marketplace-vendor-portal-permissions";

type VendorSort =
  | "name_asc"
  | "name_desc"
  | "products_desc"
  | "orders_desc"
  | "revenue_desc"
  | "joined_desc"
  | "joined_asc";

function sortVendors<T extends { name: string; productCount: number; orderCount: number; revenue: number; createdAt: string }>(
  rows: T[],
  sort: VendorSort,
): T[] {
  const list = [...rows];
  switch (sort) {
    case "name_desc":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case "products_desc":
      return list.sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
    case "orders_desc":
      return list.sort((a, b) => b.orderCount - a.orderCount || a.name.localeCompare(b.name));
    case "revenue_desc":
      return list.sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
    case "joined_asc":
      return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "joined_desc":
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "name_asc":
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function GET(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.vendor.view");
  if (denied) return denied;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const productsFilter = (url.searchParams.get("products") ?? "all").trim();
  const sort = (url.searchParams.get("sort") ?? "name_asc").trim() as VendorSort;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10) || 10));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const [vendors, orderGroups, summaryAgg] = await Promise.all([
    prisma.marketplaceVendor.findMany({
      where,
      include: { _count: { select: { products: true } } },
    }),
    prisma.marketplaceOrder.groupBy({
      by: ["vendorId"],
      where: { vendorId: { not: null }, status: { not: "cancelled" } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    Promise.all([
      prisma.marketplaceVendor.count(),
      prisma.marketplaceVendor.count({ where: { status: "active" } }),
      prisma.marketplaceProduct.count(),
      prisma.marketplaceOrder.count({ where: { status: { not: "cancelled" } } }),
      prisma.marketplaceOrder.aggregate({
        _sum: { total: true },
        where: { status: { not: "cancelled" } },
      }),
    ]),
  ]);

  const orderByVendor = new Map(
    orderGroups
      .filter((g) => g.vendorId != null)
      .map((g) => [
        g.vendorId!.toString(),
        {
          orderCount: g._count._all,
          revenue: Number(g._sum.total ?? 0),
        },
      ]),
  );

  let items = vendors.map((v) => {
    const stats = orderByVendor.get(v.id.toString());
    return serializeVendor(v, {
      orderCount: stats?.orderCount ?? 0,
      revenue: stats?.revenue ?? 0,
    });
  });

  if (productsFilter === "with") {
    items = items.filter((v) => v.productCount > 0);
  } else if (productsFilter === "without") {
    items = items.filter((v) => v.productCount === 0);
  }

  items = sortVendors(items, sort);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage);
  const offset = (safePage - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  const [vendorCount, activeVendors, productCount, orderCount, revenueAgg] = summaryAgg;

  return NextResponse.json({
    ok: true,
    items: pageItems,
    pagination: {
      page: safePage,
      pageSize,
      total,
      lastPage,
      from: total === 0 ? 0 : offset + 1,
      to: Math.min(offset + pageSize, total),
    },
    summary: {
      vendorCount,
      activeVendors,
      productCount,
      orderCount,
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
    },
  });
}

export async function POST(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.vendor.manage");
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name =
    String(body.name ?? "").trim() ||
    combineHolderName(String(body.firstName ?? ""), String(body.lastName ?? ""));
  if (!name) {
    return NextResponse.json({ ok: false, message: "Vendor first or last name is required." }, { status: 400 });
  }

  const commissionRateRaw = body.commissionRate ?? body.commission_rate;
  let commissionRate: number | null = null;
  if (commissionRateRaw != null && String(commissionRateRaw).trim() !== "") {
    const n = Number(commissionRateRaw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ ok: false, message: "Commission rate must be between 0 and 100." }, { status: 400 });
    }
    commissionRate = n;
  }

  const slug = await ensureUniqueVendorSlug(String(body.slug ?? "").trim() || name);

  const logoUrl = String(body.logoUrl ?? body.logo_url ?? "").trim() || null;

  const vendor = await prisma.marketplaceVendor.create({
    data: {
      name,
      slug,
      contactEmail: String(body.contactEmail ?? body.contact_email ?? "").trim() || null,
      phone: String(body.phone ?? "").trim() || null,
      description: String(body.description ?? "").trim() || null,
      logoUrl,
      logo: logoUrl,
      commissionRate,
      status: String(body.status ?? "active").trim() || "active",
    },
    include: { _count: { select: { products: true } } },
  });

  const loginAccess = parseVendorLoginAccessBody(body);
  if (loginAccess?.enabled) {
    const loginEmail = loginAccess.loginEmail || vendor.contactEmail || "";
    const result = await provisionMarketplaceVendorLogin(vendor.id, vendor.name, {
      ...loginAccess,
      loginEmail,
    });
    if (result.error) {
      return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
    }
  }

  const login = await loadVendorLoginAccess(vendor.id);

  return NextResponse.json({ ok: true, item: serializeVendor(vendor), loginAccess: login }, { status: 201 });
}
