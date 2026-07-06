import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/send-welcome-email";
import {
  assignCustomerClientRoleToUser,
  ensureCustomerClientRoleWithPermissions,
} from "@/lib/account-customer-role";

export type AddressInput = Record<string, unknown> | null | undefined;

export type CreateAccountCustomerInput = {
  /** Owning company (createdBy scope). */
  companyId: bigint;
  /** User id of the actor performing the create (creatorId). */
  actorId: bigint;
  companyName: string;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonMobile?: string | null;
  taxNumber?: string | null;
  paymentTerms?: string | null;
  billingAddress?: AddressInput;
  shippingAddress?: AddressInput;
  sameAsBilling?: boolean;
  notes?: string | null;
};

export type CreateAccountCustomerResult =
  | {
      ok: true;
      customerId: bigint;
      userId: bigint;
      customerCode: string;
      portalPassword: string | null;
      welcomeEmailSent: boolean;
      welcomeEmailError?: string;
    }
  | { ok: false; status: number; error: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

function generatePortalPlainPassword(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 10);
}

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
      if (isP2002DuplicateUserId(e) && attempt < maxAttempts - 1) {
        continue;
      }
      throw e;
    }
  }

  throw new Error("USER_ID_ALLOCATION_EXHAUSTED");
}

async function linkExistingClientPortalUser(
  userId: bigint,
  email: string,
  name: string,
  companyId: bigint,
): Promise<{ plainPassword: string }> {
  const plainPassword = generatePortalPlainPassword();
  const hashed = await bcrypt.hash(plainPassword, 10);
  await ensureCustomerClientRoleWithPermissions();
  await prisma.user.update({
    where: { id: userId },
    data: {
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
  await assignCustomerClientRoleToUser(userId);
  return { plainPassword };
}

export function accountCustomerErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === "USER_ID_ALLOCATION_EXHAUSTED") {
    return "Could not create the login account (ID conflict). Please try again.";
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const targets = (err.meta?.target as string[] | undefined) ?? [];
      const t = targets.join(", ").toLowerCase();
      const constraint = String(
        (err.meta as { constraint?: string }).constraint ?? "",
      ).toLowerCase();
      const blob = `${t} ${constraint}`;
      if (t.includes("email") || blob.includes("email"))
        return "This email is already registered.";
      if (t === "id" || blob.includes("pkey") || blob.includes("users_pkey")) {
        return "Could not create the login account (temporary conflict). Please try again.";
      }
      if (t.includes("customer_code") || blob.includes("customer_code"))
        return "Customer number conflict. Please try again.";
      if (
        blob.includes("model_has_roles") ||
        t.includes("role_id") ||
        (t.includes("model_id") && t.includes("model_type"))
      ) {
        return "Could not assign customer role. Please try again.";
      }
      return "A unique value in the database conflicts with this save. If it persists, try a different email or contact support.";
    }
    if (err.code === "P2003")
      return "Invalid reference (user or company). Refresh and try again.";
  }
  return "Could not save the customer. Please try again or contact support.";
}

function normalizeAddress(addr: AddressInput) {
  const a = (addr as Record<string, unknown>) ?? {};
  return {
    name: String(a.name ?? "").trim(),
    address_line_1: String(a.address_line_1 ?? "").trim(),
    address_line_2:
      a.address_line_2 != null ? String(a.address_line_2).trim() : undefined,
    city: String(a.city ?? "").trim(),
    state: String(a.state ?? "").trim(),
    country: String(a.country ?? "").trim(),
    zip_code: String(a.zip_code ?? "").trim(),
  };
}

/**
 * Creates an accounting Customer (and its client portal login) scoped to a company.
 * Mirrors POST /api/account/customers so the CRM "convert lead" flow stays consistent.
 * Never throws for known/validation cases; returns a structured result instead.
 */
export async function createAccountCustomer(
  input: CreateAccountCustomerInput,
): Promise<CreateAccountCustomerResult> {
  const companyName = input.companyName.trim();
  const customerName = input.contactPersonName.trim();
  const customerEmail = normalizeEmail(input.contactPersonEmail);

  if (!companyName || !customerName || !customerEmail) {
    return {
      ok: false,
      status: 400,
      error: "Company name, contact name and email are required.",
    };
  }

  const duplicateInCompany = await prisma.customer.findFirst({
    where: { createdBy: input.companyId, contactPersonEmail: customerEmail },
    select: { id: true },
  });
  if (duplicateInCompany) {
    return {
      ok: false,
      status: 400,
      error:
        "A customer with this email is already in your list. Use a different email or edit the existing customer.",
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: customerEmail },
    select: { id: true, type: true },
  });
  if (existingUser?.type && existingUser.type !== "client") {
    return {
      ok: false,
      status: 400,
      error:
        "This email is already registered to another account. Use a different email for the customer contact.",
    };
  }
  if (existingUser) {
    const customerForUser = await prisma.customer.findFirst({
      where: { userId: existingUser.id },
      select: { id: true },
    });
    if (customerForUser) {
      return {
        ok: false,
        status: 400,
        error: "A customer with this email already exists. Use a different email.",
      };
    }
  }

  const sameAsBilling = Boolean(input.sameAsBilling);

  try {
    let userId: bigint;
    let plainPassword: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
      const linked = await linkExistingClientPortalUser(
        userId,
        customerEmail,
        customerName,
        input.companyId,
      );
      plainPassword = linked.plainPassword;
    } else {
      const created = await createClientUser(
        customerEmail,
        customerName,
        input.companyId,
      );
      userId = created.userId;
      plainPassword = created.plainPassword;
    }

    const customerCode = await generateCustomerCode(input.companyId);
    const billingAddr = normalizeAddress(input.billingAddress);
    const shippingAddr = sameAsBilling
      ? billingAddr
      : normalizeAddress(input.shippingAddress);

    const customer = await prisma.customer.create({
      data: {
        userId,
        customerCode,
        companyName,
        contactPersonName: customerName,
        contactPersonEmail: customerEmail,
        contactPersonMobile:
          input.contactPersonMobile != null
            ? String(input.contactPersonMobile).trim() || null
            : null,
        taxNumber:
          input.taxNumber != null ? String(input.taxNumber).trim() || null : null,
        paymentTerms:
          input.paymentTerms != null
            ? String(input.paymentTerms).trim() || null
            : null,
        billingAddress: billingAddr,
        shippingAddress: shippingAddr,
        sameAsBilling,
        notes: input.notes != null ? String(input.notes).trim() || null : null,
        creatorId: input.actorId,
        createdBy: input.companyId,
      },
      select: { id: true },
    });

    let welcomeEmailSent = false;
    let welcomeEmailError: string | undefined;
    if (plainPassword) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
      const companyRow = await prisma.user.findUnique({
        where: { id: input.companyId },
        select: { name: true },
      });
      const welcome = await sendWelcomeEmail({
        to: customerEmail,
        name: customerName,
        email: customerEmail,
        password: plainPassword,
        appUrl: appUrl || undefined,
        companyName: companyRow?.name?.trim() || undefined,
        companyId: input.companyId,
      });
      welcomeEmailSent = welcome.ok;
      welcomeEmailError = welcome.error;
      if (!welcome.ok) {
        console.warn("[createAccountCustomer] Welcome email failed:", welcome.error);
      }
    }

    return {
      ok: true,
      customerId: customer.id,
      userId,
      customerCode,
      portalPassword: plainPassword,
      welcomeEmailSent,
      welcomeEmailError,
    };
  } catch (err) {
    console.error("[createAccountCustomer]", err);
    const message = accountCustomerErrorMessage(err);
    const status =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2002" || err.code === "P2003")
        ? 400
        : 500;
    return { ok: false, status, error: message };
  }
}
