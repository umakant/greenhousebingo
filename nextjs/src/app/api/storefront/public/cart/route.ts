import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  addCartLine,
  cartTotals,
  consolidateStorefrontCartLines,
  CART_COOKIE,
  getOrCreateCart,
  removeCartLine,
  setCartLineQuantity,
} from "@/lib/storefront/cart-service";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

function serLine(l: {
  id: bigint;
  quantity: number;
  variantKey: string;
  unitPrice: { toString(): string };
  product: {
    id: bigint;
    name: string;
    slug: string | null;
    image: string | null;
    stock: number;
  } | null;
}) {
  return {
    id: l.id.toString(),
    quantity: l.quantity,
    variantKey: l.variantKey,
    unitPrice: Number(l.unitPrice.toString()),
    product: l.product
      ? {
          id: l.product.id.toString(),
          name: l.product.name,
          slug: l.product.slug,
          image: l.product.image,
          stock: l.product.stock,
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found for this host" }, { status: 404 });

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value ?? null;
  const cart = await getOrCreateCart({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    cartId,
    guestToken: null,
  });
  await consolidateStorefrontCartLines(cart.id);
  const cartMerged = await getOrCreateCart({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    cartId: cart.id,
    guestToken: null,
  });

  const lineRows = cartMerged.lines.map(serLine);
  const subtotal = cartTotals(
    cartMerged.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
  ).subtotal;

  const res = NextResponse.json({
    ok: true,
    cart: {
      id: cartMerged.id,
      lines: lineRows,
      subtotal,
      currency: "USD",
    },
  });
  if (!cartId || cartId !== cartMerged.id) {
    res.cookies.set(CART_COOKIE, cartMerged.id, { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  }
  return res;
}

export async function POST(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productId = body?.productId != null ? String(body.productId) : "";
  const quantity = body?.quantity != null ? Number(body.quantity) : 1;
  const variantKey = body?.variantKey != null ? String(body.variantKey) : "";
  if (!productId) return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });

  const cookieStore = await cookies();
  let cartId = cookieStore.get(CART_COOKIE)?.value ?? null;
  const cart = await getOrCreateCart({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    cartId,
    guestToken: null,
  });
  const resolvedCartId = cart.id;

  let pid: bigint;
  try {
    pid = BigInt(productId);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid product" }, { status: 400 });
  }

  try {
    await addCartLine({
      cartId: resolvedCartId,
      organizationId: ctx.organizationId,
      productId: pid,
      variantKey,
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
    });
    await consolidateStorefrontCartLines(resolvedCartId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not add to cart";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const refreshed = await getOrCreateCart({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    cartId: resolvedCartId,
    guestToken: null,
  });

  const subtotal = cartTotals(
    refreshed.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
  ).subtotal;

  const res = NextResponse.json({
    ok: true,
    cart: {
      id: refreshed.id,
      lines: refreshed.lines.map(serLine),
      subtotal,
      currency: "USD",
    },
  });
  res.cookies.set(CART_COOKIE, refreshed.id, { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  return res;
}

export async function PATCH(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const lineId = body?.lineId != null ? String(body.lineId) : "";
  const quantity = body?.quantity != null ? Number(body.quantity) : 0;
  if (!lineId) return NextResponse.json({ ok: false, error: "lineId required" }, { status: 400 });

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;
  if (!cartId) return NextResponse.json({ ok: false, error: "No cart" }, { status: 400 });

  let lid: bigint;
  try {
    lid = BigInt(lineId);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid line" }, { status: 400 });
  }

  await setCartLineQuantity(cartId, lid, Math.floor(quantity));
  await consolidateStorefrontCartLines(cartId);

  const refreshed = await getOrCreateCart({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    cartId,
    guestToken: null,
  });

  const subtotal = cartTotals(
    refreshed.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
  ).subtotal;

  return NextResponse.json({
    ok: true,
    cart: {
      id: refreshed.id,
      lines: refreshed.lines.map(serLine),
      subtotal,
      currency: "USD",
    },
  });
}

export async function DELETE(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const lineId = body?.lineId != null ? String(body.lineId) : "";
  if (!lineId) return NextResponse.json({ ok: false, error: "lineId required" }, { status: 400 });

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;
  if (!cartId) return NextResponse.json({ ok: false, error: "No cart" }, { status: 400 });

  let lid: bigint;
  try {
    lid = BigInt(lineId);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid line" }, { status: 400 });
  }

  try {
    await removeCartLine({
      cartId,
      lineId: lid,
      organizationId: ctx.organizationId,
      websiteId: ctx.websiteId,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not remove line" }, { status: 400 });
  }

  await consolidateStorefrontCartLines(cartId);

  const refreshed = await getOrCreateCart({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    cartId,
    guestToken: null,
  });
  const subtotal = cartTotals(
    refreshed.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
  ).subtotal;

  return NextResponse.json({
    ok: true,
    cart: {
      id: refreshed.id,
      lines: refreshed.lines.map(serLine),
      subtotal,
      currency: "USD",
    },
  });
}
