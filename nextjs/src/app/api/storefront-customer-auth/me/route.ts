import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { parseWebsiteId } from "@/lib/storefront-customer-auth";
import { getStorefrontCustomerFromRequest } from "@/lib/storefront-customer-api-guard";

export async function GET(req: NextRequest) {
  const widRaw = req.nextUrl.searchParams.get("websiteId");
  let ctx;
  if (widRaw != null && widRaw !== "") {
    const expected = parseWebsiteId(widRaw);
    if (expected == null) {
      return NextResponse.json({ ok: false, message: "Invalid websiteId." }, { status: 400 });
    }
    ctx = await getStorefrontCustomerFromRequest(req, expected);
  } else {
    ctx = await getStorefrontCustomerFromRequest(req);
  }
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const row = await prisma.storefrontCustomer.findFirst({
    where: { id: ctx.customerId, websiteId: ctx.websiteId },
    select: { phone: true, savedAddresses: true, accountingCustomerId: true },
  });

  return NextResponse.json({
    ok: true,
    customer: {
      email: ctx.email,
      name: ctx.name,
      phone: row?.phone ?? null,
      savedAddresses: row?.savedAddresses ?? null,
      accountingCustomerId: row?.accountingCustomerId?.toString() ?? null,
      websiteId: ctx.websiteId.toString(),
      organizationId: ctx.organizationId.toString(),
    },
  });
}
