import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { parseWebsiteId } from "@/lib/storefront-customer-auth";
import { getStorefrontCustomerFromRequest } from "@/lib/storefront-customer-api-guard";

export const dynamic = "force-dynamic";

/** Day 34 — Profile + saved addresses for storefront customer accounts. */
export async function PATCH(req: NextRequest) {
  const widRaw = req.nextUrl.searchParams.get("websiteId");
  if (widRaw == null || widRaw === "") {
    return NextResponse.json({ ok: false, message: "websiteId is required." }, { status: 400 });
  }
  const expected = parseWebsiteId(widRaw);
  if (expected == null) {
    return NextResponse.json({ ok: false, message: "Invalid websiteId." }, { status: 400 });
  }
  const ctx = await getStorefrontCustomerFromRequest(req, expected);
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const data: Prisma.StorefrontCustomerUpdateInput = {};
  if (body.name !== undefined) data.name = body.name === null ? null : String(body.name).trim() || null;
  if (body.phone !== undefined) data.phone = body.phone === null ? null : String(body.phone).trim() || null;
  if (body.savedAddresses !== undefined) {
    if (body.savedAddresses === null) {
      data.savedAddresses = [];
    } else if (Array.isArray(body.savedAddresses)) {
      data.savedAddresses = body.savedAddresses as Prisma.InputJsonValue;
    } else {
      return NextResponse.json({ ok: false, message: "savedAddresses must be an array." }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "No changes." }, { status: 400 });
  }

  await prisma.storefrontCustomer.update({
    where: { id: ctx.customerId },
    data,
  });

  return NextResponse.json({ ok: true });
}
