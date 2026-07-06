import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  assertEmailAllowedForStorefrontCustomerSignup,
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
  name?: unknown;
  phone?: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const websiteId = parseWebsiteId(body.websiteId);
  const email = normalizeStorefrontCustomerEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim() || null;
  const phone = String(body.phone ?? "").trim() || null;

  if (!websiteId) {
    return NextResponse.json({ ok: false, message: "Invalid website." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
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

  try {
    await assertEmailAllowedForStorefrontCustomerSignup({
      email,
      websiteOrganizationId: website.organizationId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cannot sign up with this email.";
    return NextResponse.json({ ok: false, message }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const customer = await prisma.storefrontCustomer.create({
      data: {
        organizationId: website.organizationId,
        websiteId: website.id,
        email,
        password: passwordHash,
        name,
        phone,
        status: "active",
      },
      select: { id: true },
    });

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
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ ok: false, message: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "Could not create account." }, { status: 500 });
  }
}
