import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  assertEmailAllowedForStorefrontCustomerLogin,
  assertOrganizationHasStorefrontAddon,
  getWebsiteForStorefrontCustomerAuth,
  hashOpaqueToken,
  normalizeStorefrontCustomerEmail,
  parseWebsiteId,
} from "@/lib/storefront-customer-auth";
import { STOREFRONT_RESET_TOKEN_MAX_AGE_MS } from "@/lib/storefront-customer-constants";
import { buildStorefrontAccountResetUrl, sendStorefrontCustomerPasswordResetEmail } from "@/lib/storefront-customer-mail";

type Body = {
  websiteId?: unknown;
  email?: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const websiteId = parseWebsiteId(body.websiteId);
  const email = normalizeStorefrontCustomerEmail(String(body.email ?? ""));

  if (!websiteId) {
    return NextResponse.json({ ok: false, message: "Invalid website." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Valid email is required." }, { status: 400 });
  }

  const website = await getWebsiteForStorefrontCustomerAuth(websiteId);
  if (!website) {
    return NextResponse.json({ ok: true, message: "If an account exists, we sent reset instructions." });
  }

  try {
    await assertOrganizationHasStorefrontAddon(website.organizationId);
  } catch {
    return NextResponse.json({ ok: true, message: "If an account exists, we sent reset instructions." });
  }

  const customer = await prisma.storefrontCustomer.findFirst({
    where: { websiteId: website.id, email, status: "active" },
    select: { id: true, linkedUserId: true },
  });

  if (!customer) {
    return NextResponse.json({ ok: true, message: "If an account exists, we sent reset instructions." });
  }

  try {
    await assertEmailAllowedForStorefrontCustomerLogin({
      email,
      websiteOrganizationId: website.organizationId,
      linkedUserId: customer.linkedUserId,
    });
  } catch {
    return NextResponse.json({ ok: true, message: "If an account exists, we sent reset instructions." });
  }

  const rawToken = randomBytes(32).toString("hex");
  const resetTokenHash = hashOpaqueToken(rawToken);
  const resetTokenExpires = new Date(Date.now() + STOREFRONT_RESET_TOKEN_MAX_AGE_MS);

  await prisma.storefrontCustomer.update({
    where: { id: customer.id },
    data: { resetTokenHash, resetTokenExpires },
  });

  const resetUrl = buildStorefrontAccountResetUrl(req, website.id.toString(), rawToken);
  const sent = await sendStorefrontCustomerPasswordResetEmail({
    req,
    organizationId: website.organizationId,
    to: email,
    resetUrl,
    storeName: website.name,
  });

  if (!sent.ok) {
    await prisma.storefrontCustomer.update({
      where: { id: customer.id },
      data: { resetTokenHash: null, resetTokenExpires: null },
    });
    return NextResponse.json(
      { ok: false, message: sent.message || "Could not send email. Check store SMTP settings." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "If an account exists, we sent reset instructions." });
}
