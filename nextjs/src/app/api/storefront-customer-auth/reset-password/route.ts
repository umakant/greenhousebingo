import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  assertOrganizationHasStorefrontAddon,
  getWebsiteForStorefrontCustomerAuth,
  hashOpaqueToken,
  normalizeStorefrontCustomerEmail,
  parseWebsiteId,
} from "@/lib/storefront-customer-auth";
import { STOREFRONT_CUSTOMER_SESSION_COOKIE } from "@/lib/storefront-customer-constants";
import {
  clearStorefrontCustomerSessionCookie,
  destroyStorefrontCustomerSessionByToken,
} from "@/lib/storefront-customer-session";

type Body = {
  websiteId?: unknown;
  email?: unknown;
  token?: unknown;
  password?: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const websiteId = parseWebsiteId(body.websiteId);
  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");
  const emailRaw = String(body.email ?? "").trim();
  const emailNorm = emailRaw ? normalizeStorefrontCustomerEmail(emailRaw) : null;

  if (!websiteId || !token) {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
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

  const tokenHash = hashOpaqueToken(token);
  const customer = await prisma.storefrontCustomer.findFirst({
    where: {
      websiteId: website.id,
      resetTokenHash: tokenHash,
      resetTokenExpires: { gt: new Date() },
      status: "active",
      ...(emailNorm ? { email: emailNorm } : {}),
    },
    select: { id: true },
  });

  if (!customer) {
    return NextResponse.json({ ok: false, message: "Invalid or expired reset link." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.storefrontCustomer.update({
    where: { id: customer.id },
    data: {
      password: passwordHash,
      resetTokenHash: null,
      resetTokenExpires: null,
    },
  });

  await prisma.storefrontCustomerSession.deleteMany({ where: { customerId: customer.id } });

  const res = NextResponse.json({ ok: true });
  const rawSession = req.cookies.get(STOREFRONT_CUSTOMER_SESSION_COOKIE)?.value;
  await destroyStorefrontCustomerSessionByToken(rawSession);
  clearStorefrontCustomerSessionCookie(req, res);
  return res;
}
