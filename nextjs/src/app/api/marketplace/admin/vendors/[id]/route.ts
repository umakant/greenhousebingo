import { NextResponse, type NextRequest } from "next/server";

import { combineHolderName } from "@/lib/brand-ownership-holder-name";
import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { serializeVendor } from "@/lib/marketplace-service";
import { loadVendorLoginAccess } from "@/lib/marketplace-vendor-portal-permissions";
import {
  parseVendorLoginAccessBody,
  provisionMarketplaceVendorLogin,
} from "@/lib/marketplace-vendor-user-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.vendor.view");
  if (denied) return denied;

  const { id } = await ctx.params;
  const vendorId = parseId(id);
  if (!vendorId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const vendor = await prisma.marketplaceVendor.findFirst({
    where: { id: vendorId },
    include: { _count: { select: { products: true } } },
  });
  if (!vendor) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const loginAccess = await loadVendorLoginAccess(vendorId);

  return NextResponse.json({
    ok: true,
    item: serializeVendor(vendor),
    loginAccess,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.vendor.manage");
  if (denied) return denied;

  const { id } = await ctx.params;
  const vendorId = parseId(id);
  if (!vendorId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name != null) data.name = String(body.name).trim();
  else if (body.firstName != null || body.lastName != null) {
    const combined = combineHolderName(String(body.firstName ?? ""), String(body.lastName ?? ""));
    if (combined) data.name = combined;
  }
  if (body.contactEmail != null || body.contact_email != null)
    data.contactEmail = String(body.contactEmail ?? body.contact_email).trim() || null;
  if (body.phone != null) data.phone = String(body.phone).trim() || null;
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.logoUrl != null || body.logo_url != null) {
    const logoUrl = String(body.logoUrl ?? body.logo_url).trim() || null;
    data.logoUrl = logoUrl;
    data.logo = logoUrl;
  }
  if (body.status != null) data.status = String(body.status).trim() || "active";
  const rate = body.commissionRate ?? body.commission_rate;
  if (rate !== undefined) {
    if (rate == null || String(rate).trim() === "") {
      data.commissionRate = null;
    } else {
      const n = Number(rate);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json({ ok: false, message: "Commission rate must be between 0 and 100." }, { status: 400 });
      }
      data.commissionRate = n;
    }
  }

  const vendor = await prisma.marketplaceVendor.update({
    where: { id: vendorId },
    data,
    include: { _count: { select: { products: true } } },
  });

  const loginAccessInput = parseVendorLoginAccessBody(body);
  if (loginAccessInput) {
    const loginEmail =
      loginAccessInput.loginEmail || vendor.contactEmail || String(body.contactEmail ?? "").trim();
    const result = await provisionMarketplaceVendorLogin(vendor.id, vendor.name, {
      ...loginAccessInput,
      loginEmail,
    });
    if (result.error) {
      return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
    }
  }

  const loginAccess = await loadVendorLoginAccess(vendor.id);

  return NextResponse.json({ ok: true, item: serializeVendor(vendor), loginAccess });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.vendor.manage");
  if (denied) return denied;

  const { id } = await ctx.params;
  const vendorId = parseId(id);
  if (!vendorId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  await prisma.marketplaceVendor.delete({ where: { id: vendorId } });
  return NextResponse.json({ ok: true });
}
