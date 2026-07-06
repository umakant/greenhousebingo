import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assignCustomerClientRoleToUser,
  ensureCustomerClientRoleWithPermissions,
} from "@/lib/account-customer-role";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generatePortalPlainPassword(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 10);
}

async function generateCustomerCode(createdBy: bigint): Promise<string> {
  const last = await prisma.customer.findFirst({
    where: { customerCode: { startsWith: "CUST-" }, createdBy },
    orderBy: { id: "desc" },
    select: { customerCode: true },
  });
  const nextNum = last ? Number.parseInt(last.customerCode.slice(5), 10) + 1 : 1;
  return "CUST-" + String(nextNum).padStart(4, "0");
}

function isP2002DuplicateUserId(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const targets = (err.meta?.target as string[] | undefined) ?? [];
  return targets.length === 1 && targets[0] === "id";
}

/** Create a new `client` login user. Caller must ensure `email` is free. */
async function createClientUser(
  email: string,
  name: string,
  companyId: bigint,
): Promise<{ userId: bigint; plainPassword: string }> {
  const plainPassword = generatePortalPlainPassword();
  const hashed = await bcrypt.hash(plainPassword, 10);

  await ensureCustomerClientRoleWithPermissions();

  const maxAttempts = 8;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const maxUser = await prisma.user.aggregate({ _max: { id: true } });
    const newId = (maxUser._max.id ?? 0n) + 1n;
    try {
      await prisma.user.create({
        data: {
          id: newId,
          name,
          email,
          password: hashed,
          type: "client",
          isActive: true,
          isEnableLogin: true,
          createdBy: companyId,
          emailVerifiedAt: new Date(),
        },
      });
      await assignCustomerClientRoleToUser(newId);
      return { userId: newId, plainPassword };
    } catch (e) {
      if (isP2002DuplicateUserId(e) && attempt < maxAttempts - 1) continue;
      throw e;
    }
  }
  throw new Error("USER_ID_ALLOCATION_EXHAUSTED");
}

export type WaterIceCustomerResult = {
  customerId: bigint;
  userId: bigint | null;
  /** Plain password for a newly created login (null when reused/no login). */
  plainPassword: string | null;
  /** True when a brand-new accounting customer row was created this call. */
  createdCustomer: boolean;
};

/**
 * Idempotently ensure an accounting `Customer` (+ optional `client` login) for a
 * Water Ice Express buyer. Reused for returning buyers (matched by company + email)
 * so repeat checkouts never error or duplicate.
 */
export async function findOrCreateWaterIceCustomerWithLogin(params: {
  organizationId: bigint;
  actorId?: bigint | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  shippingAddress?: Prisma.InputJsonValue | null;
}): Promise<WaterIceCustomerResult> {
  const companyId = params.organizationId;
  const email = normalizeEmail(params.email);
  const fullName = `${params.firstName} ${params.lastName}`.trim() || email.split("@")[0] || "Customer";

  // Returning buyer: reuse the existing accounting customer for this company.
  const existingCustomer = await prisma.customer.findFirst({
    where: { createdBy: companyId, contactPersonEmail: { equals: email, mode: "insensitive" } },
    select: { id: true, userId: true },
  });
  if (existingCustomer) {
    return {
      customerId: existingCustomer.id,
      userId: existingCustomer.userId ?? null,
      plainPassword: null,
      createdCustomer: false,
    };
  }

  // Decide the login user: link a free `client` account, otherwise create one.
  // If the email already belongs to a non-client account, skip login creation
  // and just record the customer (avoids hijacking staff/company accounts).
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true },
  });

  let userId: bigint | null = null;
  let plainPassword: string | null = null;

  if (existingUser) {
    if ((existingUser.type ?? "") === "client") {
      userId = existingUser.id;
      await assignCustomerClientRoleToUser(userId);
    }
    // Non-client existing email -> leave userId null (customer record only).
  } else {
    const created = await createClientUser(email, fullName, companyId);
    userId = created.userId;
    plainPassword = created.plainPassword;
  }

  const customerCode = await generateCustomerCode(companyId);
  const customer = await prisma.customer.create({
    data: {
      userId: userId ?? undefined,
      customerCode,
      companyName: fullName,
      contactPersonName: fullName,
      contactPersonEmail: email,
      contactPersonMobile: params.phone?.trim() || null,
      billingAddress: params.shippingAddress ?? undefined,
      shippingAddress: params.shippingAddress ?? undefined,
      creatorId: params.actorId ?? companyId,
      createdBy: companyId,
    },
    select: { id: true },
  });

  return { customerId: customer.id, userId, plainPassword, createdCustomer: true };
}
