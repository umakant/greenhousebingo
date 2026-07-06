import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";
import { serializeProduct } from "@/lib/marketplace-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.products.edit");
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const productId = parseId(id);
  if (!productId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await prisma.marketplaceProduct.findFirst({
    where: { id: productId, vendorId: session.vendorId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name != null) data.name = String(body.name).trim();
  if (body.sku != null) data.sku = String(body.sku).trim() || null;
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.imageUrl != null || body.image_url != null)
    data.imageUrl = String(body.imageUrl ?? body.image_url).trim() || null;
  if (body.category != null) data.category = String(body.category).trim() || null;
  if (body.status != null) data.status = String(body.status).trim() || "active";
  if (body.price !== undefined) {
    const n = Number(body.price);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ ok: false, message: "Invalid price." }, { status: 400 });
    }
    data.price = n;
  }
  if (body.stock !== undefined) {
    data.stock = body.stock == null || String(body.stock).trim() === "" ? null : Number(body.stock);
  }

  const product = await prisma.marketplaceProduct.update({
    where: { id: productId },
    data,
    include: { vendor: { select: { name: true, logoUrl: true, logo: true } } },
  });

  return NextResponse.json({ ok: true, item: serializeProduct(product) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.products.delete");
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const productId = parseId(id);
  if (!productId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await prisma.marketplaceProduct.findFirst({
    where: { id: productId, vendorId: session.vendorId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.marketplaceProduct.delete({ where: { id: productId } });
  return NextResponse.json({ ok: true });
}
