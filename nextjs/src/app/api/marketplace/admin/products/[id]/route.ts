import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { serializeProduct } from "@/lib/marketplace-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.vendor.manage");
  if (denied) return denied;

  const { id } = await ctx.params;
  const productId = parseId(id);
  if (!productId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name != null) data.name = String(body.name).trim();
  if (body.sku != null) data.sku = String(body.sku).trim() || null;
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.imageUrl != null || body.image_url != null)
    data.imageUrl = String(body.imageUrl ?? body.image_url).trim() || null;
  if (body.category != null) data.category = String(body.category).trim() || null;
  if (body.currency != null) data.currency = String(body.currency).trim() || "USD";
  if (body.status != null) data.status = String(body.status).trim() || "active";
  if (body.price !== undefined) {
    const n = Number(body.price);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ ok: false, message: "Price must be a non-negative number." }, { status: 400 });
    }
    data.price = n;
  }
  if (body.stock !== undefined) {
    if (body.stock == null || String(body.stock).trim() === "") {
      data.stock = null;
    } else {
      const s = Number(body.stock);
      if (!Number.isInteger(s) || s < 0) {
        return NextResponse.json({ ok: false, message: "Stock must be a non-negative integer." }, { status: 400 });
      }
      data.stock = s;
    }
  }
  if (body.vendorId != null || body.vendor_id != null) {
    try {
      data.vendorId = BigInt(String(body.vendorId ?? body.vendor_id));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid vendor." }, { status: 400 });
    }
  }

  const product = await prisma.marketplaceProduct.update({
    where: { id: productId },
    data,
    include: { vendor: { select: { name: true } } },
  });

  return NextResponse.json({ ok: true, item: serializeProduct(product) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.vendor.manage");
  if (denied) return denied;

  const { id } = await ctx.params;
  const productId = parseId(id);
  if (!productId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  await prisma.marketplaceProduct.delete({ where: { id: productId } });
  return NextResponse.json({ ok: true });
}
