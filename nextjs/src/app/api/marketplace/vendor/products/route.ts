import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";
import { ensureUniqueProductSlug, serializeProduct } from "@/lib/marketplace-service";

const LOW_STOCK_THRESHOLD = 150;

type ProductSort = "name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc" | "newest" | "oldest";

function sortProducts<
  T extends { name: string; price: number; stock: number | null; createdAt: string },
>(rows: T[], sort: ProductSort): T[] {
  const list = [...rows];
  switch (sort) {
    case "name_desc":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case "price_asc":
      return list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    case "price_desc":
      return list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    case "stock_asc":
      return list.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0) || a.name.localeCompare(b.name));
    case "stock_desc":
      return list.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0) || a.name.localeCompare(b.name));
    case "oldest":
      return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "newest":
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "name_asc":
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function GET(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.products.view");
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();
  const stockFilter = (url.searchParams.get("stock") ?? "all").trim();
  const sort = (url.searchParams.get("sort") ?? "name_asc").trim() as ProductSort;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10) || 10));

  const where: Record<string, unknown> = { vendorId: session.vendorId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, categories, vendor, summaryAgg] = await Promise.all([
    prisma.marketplaceProduct.findMany({
      where,
      include: { vendor: { select: { name: true, logoUrl: true, logo: true } } },
    }),
    prisma.marketplaceProduct.findMany({
      where: { vendorId: session.vendorId, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.marketplaceVendor.findFirst({
      where: { id: session.vendorId },
      select: { id: true, name: true },
    }),
    Promise.all([
      prisma.marketplaceProduct.count({ where: { vendorId: session.vendorId } }),
      prisma.marketplaceProduct.count({ where: { vendorId: session.vendorId, status: "active" } }),
      prisma.marketplaceProduct.count({
        where: {
          vendorId: session.vendorId,
          stock: { not: null, lte: LOW_STOCK_THRESHOLD },
          status: "active",
        },
      }),
    ]),
  ]);

  let items = products.map(serializeProduct);

  if (stockFilter === "low") {
    items = items.filter((p) => p.stock != null && p.stock <= LOW_STOCK_THRESHOLD);
  } else if (stockFilter === "in_stock") {
    items = items.filter((p) => p.stock == null || p.stock > LOW_STOCK_THRESHOLD);
  } else if (stockFilter === "out") {
    items = items.filter((p) => p.stock === 0);
  }

  items = sortProducts(items, sort);

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage);
  const offset = (safePage - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);
  const [totalProducts, activeProducts, lowStockProducts] = summaryAgg;

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
    summary: { totalProducts, activeProducts, lowStockProducts },
    filters: {
      categories: categories.map((c) => c.category).filter((c): c is string => Boolean(c)),
      vendors: vendor ? [{ id: vendor.id.toString(), name: vendor.name }] : [],
    },
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  });
}

export async function POST(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.products.create");
  if (session instanceof NextResponse) return session;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, message: "Product name is required." }, { status: 400 });
  }

  const priceN = Number(body.price ?? 0);
  if (!Number.isFinite(priceN) || priceN < 0) {
    return NextResponse.json({ ok: false, message: "Price must be a non-negative number." }, { status: 400 });
  }

  const slug = await ensureUniqueProductSlug(String(body.slug ?? "").trim() || name);

  const product = await prisma.marketplaceProduct.create({
    data: {
      vendorId: session.vendorId,
      name,
      slug,
      sku: String(body.sku ?? "").trim() || null,
      description: String(body.description ?? "").trim() || null,
      price: priceN,
      currency: String(body.currency ?? "USD").trim() || "USD",
      imageUrl: String(body.imageUrl ?? body.image_url ?? "").trim() || null,
      category: String(body.category ?? "").trim() || null,
      stock: body.stock == null || String(body.stock).trim() === "" ? null : Number(body.stock),
      status: String(body.status ?? "active").trim() || "active",
    },
    include: { vendor: { select: { name: true, logoUrl: true, logo: true } } },
  });

  return NextResponse.json({ ok: true, item: serializeProduct(product) }, { status: 201 });
}
