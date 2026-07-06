import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { storefrontProductPublicLiveWhere } from "@/lib/storefront/storefront-product-public-visibility";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

/** Day 55 — grouped global search within the active storefront tenant. */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ ok: true, data: { query: q, groups: [] } });
  }

  const oid = org.organizationId;
  const mode = { contains: q, mode: "insensitive" as const };

  try {
    const [products, orders, customers, pages, themes, websites] = await Promise.all([
      prisma.posProduct.findMany({
        where: { organizationId: oid, ...storefrontProductPublicLiveWhere(), OR: [{ name: mode }, { sku: mode }] },
        select: { id: true, name: true, slug: true },
        take: 8,
      }),
      prisma.storefrontOrder.findMany({
        where: {
          organizationId: oid,
          OR: [{ orderNumber: mode }, { customerEmail: mode }],
        },
        select: { id: true, orderNumber: true, status: true },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.storefrontCustomer.findMany({
        where: { organizationId: oid, OR: [{ email: mode }, { name: mode }] },
        select: { id: true, email: true, name: true, websiteId: true },
        take: 8,
      }),
      prisma.page.findMany({
        where: { organizationId: oid, OR: [{ title: mode }, { slug: mode }] },
        select: { id: true, title: true, slug: true },
        take: 8,
      }),
      prisma.theme.findMany({
        where: { organizationId: oid, name: mode },
        select: { id: true, name: true, status: true },
        take: 8,
      }),
      prisma.website.findMany({
        where: { organizationId: oid, OR: [{ name: mode }, { slug: mode }] },
        select: { id: true, name: true, slug: true },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        query: q,
        groups: [
          {
            module: "Catalog",
            items: products.map((p) => ({
              label: p.name,
              href: `/storefront/products`,
              meta: p.slug ?? undefined,
            })),
          },
          {
            module: "Orders",
            items: orders.map((o) => ({
              label: o.orderNumber,
              href: `/storefront/orders`,
              meta: o.status,
            })),
          },
          {
            module: "Customers",
            items: customers.map((c) => ({
              label: c.email,
              href: `/storefront/customers`,
              meta: c.name,
            })),
          },
          {
            module: "Pages",
            items: pages.map((p) => ({
              label: p.title,
              href: `/storefront/pages`,
              meta: p.slug,
            })),
          },
          {
            module: "Themes",
            items: themes.map((t) => ({
              label: t.name,
              href: `/storefront/themes`,
              meta: t.status,
            })),
          },
          {
            module: "Websites",
            items: websites.map((w) => ({
              label: w.name,
              href: `/storefront/websites`,
              meta: w.slug,
            })),
          },
        ].filter((g) => g.items.length > 0),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
