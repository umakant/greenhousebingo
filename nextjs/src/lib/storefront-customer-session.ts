import { randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authCookieOptions } from "@/lib/cookie-options";
import {
  STOREFRONT_CUSTOMER_SESSION_COOKIE,
  STOREFRONT_CUSTOMER_SESSION_MAX_AGE_SEC,
} from "@/lib/storefront-customer-constants";
import { hashOpaqueToken } from "@/lib/storefront-customer-auth";

export type StorefrontCustomerSessionContext = {
  sessionId: bigint;
  customerId: bigint;
  websiteId: bigint;
  organizationId: bigint;
  email: string;
  name: string | null;
};

function clientMeta(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? undefined;
  const xf = req.headers.get("x-forwarded-for");
  const ip = xf?.split(",")[0]?.trim() || undefined;
  return { userAgent: ua, ipAddress: ip };
}

export async function createStorefrontCustomerSession(
  req: NextRequest,
  res: NextResponse,
  customerId: bigint,
): Promise<void> {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashOpaqueToken(raw);
  const expiresAt = new Date(Date.now() + STOREFRONT_CUSTOMER_SESSION_MAX_AGE_SEC * 1000);
  const { userAgent, ipAddress } = clientMeta(req);

  await prisma.storefrontCustomerSession.create({
    data: {
      customerId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  res.cookies.set(STOREFRONT_CUSTOMER_SESSION_COOKIE, raw, {
    ...authCookieOptions(req, STOREFRONT_CUSTOMER_SESSION_MAX_AGE_SEC),
  });
}

export async function verifyStorefrontCustomerSessionToken(
  rawToken: string | undefined,
): Promise<StorefrontCustomerSessionContext | null> {
  if (!rawToken?.trim()) return null;
  const tokenHash = hashOpaqueToken(rawToken.trim());
  const row = await prisma.storefrontCustomerSession.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      customer: { status: "active" },
    },
    select: {
      id: true,
      customerId: true,
      customer: {
        select: {
          websiteId: true,
          organizationId: true,
          email: true,
          name: true,
          website: { select: { id: true, status: true } },
        },
      },
    },
  });
  if (!row) return null;
  const ws = row.customer.website?.status;
  if (!ws || ws === "suspended" || ws === "archived") return null;
  return {
    sessionId: row.id,
    customerId: row.customerId,
    websiteId: row.customer.websiteId,
    organizationId: row.customer.organizationId,
    email: row.customer.email,
    name: row.customer.name,
  };
}

export async function destroyStorefrontCustomerSessionByToken(rawToken: string | undefined): Promise<void> {
  if (!rawToken?.trim()) return;
  const tokenHash = hashOpaqueToken(rawToken.trim());
  await prisma.storefrontCustomerSession.deleteMany({ where: { tokenHash } });
}

export function clearStorefrontCustomerSessionCookie(req: NextRequest, res: NextResponse): void {
  res.cookies.set(STOREFRONT_CUSTOMER_SESSION_COOKIE, "", {
    ...authCookieOptions(req, 0),
    maxAge: 0,
  });
}
