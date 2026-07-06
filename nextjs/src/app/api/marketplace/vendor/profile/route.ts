import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";

export async function GET(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.profile.manage");
  if (session instanceof NextResponse) return session;

  const [user, vendor] = await Promise.all([
    prisma.user.findFirst({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, forcePasswordReset: true },
    }),
    prisma.marketplaceVendor.findFirst({
      where: { id: session.vendorId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        phone: true,
        description: true,
        logoUrl: true,
        status: true,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, user, vendor });
}

export async function PATCH(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.profile.manage");
  if (session instanceof NextResponse) return session;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.newPassword != null) {
    const password = String(body.newPassword);
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        password: await bcrypt.hash(password, 10),
        forcePasswordReset: false,
        updatedAt: new Date(),
      },
    });
  }

  const vendorData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.phone != null) vendorData.phone = String(body.phone).trim() || null;
  if (body.description != null) vendorData.description = String(body.description).trim() || null;
  if (body.logoUrl != null) vendorData.logoUrl = String(body.logoUrl).trim() || null;

  const vendor = await prisma.marketplaceVendor.update({
    where: { id: session.vendorId },
    data: vendorData,
  });

  return NextResponse.json({ ok: true, vendor });
}
