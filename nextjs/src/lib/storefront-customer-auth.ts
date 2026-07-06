import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getActivatedPackagesForUser } from "@/lib/addons-server";

/** SaaS `users.type` values that must not use storefront customer auth unless `StorefrontCustomer.linkedUserId` matches. */
const BLOCKED_USER_TYPES = new Set([
  "superadmin",
  "super_admin",
  "staff",
  "company",
  "company_admin",
  "vendor",
]);

export function normalizeStorefrontCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export type StorefrontWebsitePublic = {
  id: bigint;
  organizationId: bigint;
  status: string;
  name: string;
  slug: string;
};

/**
 * Load website by id only; tenant scope is website.organizationId (never trust client org id).
 */
export async function getWebsiteForStorefrontCustomerAuth(
  websiteId: bigint,
): Promise<StorefrontWebsitePublic | null> {
  const row = await prisma.website.findFirst({
    where: {
      id: websiteId,
      status: { notIn: ["suspended", "archived"] },
    },
    select: { id: true, organizationId: true, status: true, name: true, slug: true },
  });
  return row;
}

/**
 * Ensures the storefront add-on is globally enabled and on the tenant’s plan.
 * `organizationOwnerUserId` is `Website.organizationId` / company tenant row in `users` (not an arbitrary org table).
 */
export async function assertOrganizationHasStorefrontAddon(organizationOwnerUserId: bigint): Promise<void> {
  const activated = await getActivatedPackagesForUser(organizationOwnerUserId, false);
  if (!activated.map((m) => m.toLowerCase()).includes("storefront")) {
    throw new Error("Storefront is not enabled for this organization.");
  }
}

/**
 * Block staff/tenant-admin emails from becoming storefront shoppers unless explicitly linked (`linkedUserId`).
 */
export async function assertEmailAllowedForStorefrontCustomerSignup(params: {
  email: string;
  websiteOrganizationId: bigint;
}): Promise<void> {
  const email = normalizeStorefrontCustomerEmail(params.email);
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true },
  });
  if (!user) return;
  const ut = (user.type ?? "").trim().toLowerCase();
  if (BLOCKED_USER_TYPES.has(ut)) {
    throw new Error("This email is reserved for staff or tenant administration. Use a different email or ask an admin to link your account.");
  }
  if (user.id === params.websiteOrganizationId) {
    throw new Error("This email belongs to the store owner account and cannot be used for customer signup.");
  }
}

export async function assertEmailAllowedForStorefrontCustomerLogin(params: {
  email: string;
  websiteOrganizationId: bigint;
  linkedUserId: bigint | null;
}): Promise<void> {
  const email = normalizeStorefrontCustomerEmail(params.email);
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true },
  });
  if (!user) return;
  if (params.linkedUserId != null && user.id === params.linkedUserId) return;
  const ut = (user.type ?? "").trim().toLowerCase();
  if (BLOCKED_USER_TYPES.has(ut)) {
    throw new Error("Sign in with your staff account on the main login page, or use a linked customer account.");
  }
  if (user.id === params.websiteOrganizationId) {
    throw new Error("Use the main application login for the store owner account.");
  }
}

export function parseWebsiteId(raw: unknown): bigint | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}
