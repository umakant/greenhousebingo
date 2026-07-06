import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  assertEmailAllowedForStorefrontCustomerLogin,
  assertOrganizationHasStorefrontAddon,
  getWebsiteForStorefrontCustomerAuth,
  normalizeStorefrontCustomerEmail,
  parseWebsiteId,
} from "@/lib/storefront-customer-auth";
import { createStorefrontCustomerSession } from "@/lib/storefront-customer-session";
import { linkGuestOrdersToStorefrontCustomer } from "@/lib/storefront/storefront-customer-checkout-account";

type Body = {
  websiteId?: unknown;
  email?: unknown;
  password?: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const websiteId = parseWebsiteId(body.websiteId);
  const email = normalizeStorefrontCustomerEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (!websiteId) {
    return NextResponse.json({ ok: false, message: "Invalid website." }, { status: 400 });
  }
  if (!email.includes("@") || !password) {
    return NextResponse.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }

  const website = await getWebsiteForStorefrontCustomerAuth(websiteId);
  if (!website) {
    return NextResponse.json({ ok: false, message: "Store not found." }, { status: 404 });
  }

  try {
    await assertOrganizationHasStorefrontAddon(website.organizationId);
  } catch {
    return NextResponse.json({ ok: false, message: "Storefront is not enabled for this organization." }, { status: 403 });
  }

  const customer = await prisma.storefrontCustomer.findFirst({
    where: { websiteId: website.id, email },
    select: { id: true, password: true, status: true, linkedUserId: true },
  });

  if (!customer || customer.status !== "active") {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  const match = await bcrypt.compare(password, customer.password);
  if (!match) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  try {
    await assertEmailAllowedForStorefrontCustomerLogin({
      email,
      websiteOrganizationId: website.organizationId,
      linkedUserId: customer.linkedUserId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cannot sign in.";
    return NextResponse.json({ ok: false, message }, { status: 403 });
  }

  await linkGuestOrdersToStorefrontCustomer({
    customerId: customer.id,
    websiteId: website.id,
    organizationId: website.organizationId,
    email,
  });

  const res = NextResponse.json({
    ok: true,
    redirect: `/storefront/account/w/${website.id.toString()}/dashboard`,
  });
  await createStorefrontCustomerSession(req, res, customer.id);
  return res;
}
