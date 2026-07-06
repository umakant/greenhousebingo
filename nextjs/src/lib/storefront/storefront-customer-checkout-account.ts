import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import {
  assertEmailAllowedForStorefrontCustomerLogin,
  assertEmailAllowedForStorefrontCustomerSignup,
  normalizeStorefrontCustomerEmail,
} from "@/lib/storefront-customer-auth";

export async function linkGuestOrdersToStorefrontCustomer(params: {
  customerId: bigint;
  websiteId: bigint;
  organizationId: bigint;
  email: string;
}): Promise<number> {
  const email = normalizeStorefrontCustomerEmail(params.email);
  const result = await prisma.storefrontOrder.updateMany({
    where: {
      organizationId: params.organizationId,
      websiteId: params.websiteId,
      customerEmail: email,
      storefrontCustomerId: null,
    },
    data: { storefrontCustomerId: params.customerId },
  });
  return result.count;
}

export type CompleteStorefrontAccountResult =
  | { ok: true; customerId: bigint; linkedOrders: number; created: boolean }
  | { ok: false; status: number; message: string };

/** Create or sign in a storefront customer and attach guest orders (including this checkout order). */
export async function completeStorefrontCustomerAccountForOrder(params: {
  organizationId: bigint;
  websiteId: bigint;
  orderId: bigint;
  password?: string;
  name?: string | null;
  sessionCustomerId?: bigint | null;
}): Promise<CompleteStorefrontAccountResult> {
  const order = await prisma.storefrontOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
      websiteId: params.websiteId,
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      customerEmail: true,
      customerName: true,
      storefrontCustomerId: true,
    },
  });
  if (!order) return { ok: false, status: 404, message: "Order not found." };

  const paidEnough =
    order.status === "paid" || order.paymentStatus === "paid" || order.status === "pending_payment";
  if (!paidEnough) {
    return { ok: false, status: 400, message: "Order is not paid yet." };
  }

  if (!order.customerEmail?.trim()) {
    return { ok: false, status: 400, message: "Order has no customer email." };
  }

  const email = normalizeStorefrontCustomerEmail(order.customerEmail);
  const displayName = params.name?.trim() || order.customerName?.trim() || null;

  if (params.sessionCustomerId) {
    const customerId = params.sessionCustomerId;
    if (order.storefrontCustomerId && order.storefrontCustomerId !== customerId) {
      return { ok: false, status: 403, message: "This order belongs to another account." };
    }
    const linked = await linkGuestOrdersToStorefrontCustomer({
      customerId,
      websiteId: params.websiteId,
      organizationId: params.organizationId,
      email,
    });
    if (!order.storefrontCustomerId) {
      await prisma.storefrontOrder.update({
        where: { id: order.id },
        data: { storefrontCustomerId: customerId },
      });
    }
    return { ok: true, customerId, linkedOrders: linked, created: false };
  }

  if (order.storefrontCustomerId) {
    const existing = await prisma.storefrontCustomer.findFirst({
      where: { id: order.storefrontCustomerId, websiteId: params.websiteId, status: "active" },
      select: { id: true, password: true, linkedUserId: true },
    });
    if (!existing) return { ok: false, status: 400, message: "Customer account not found." };
    if (!params.password) {
      return { ok: false, status: 400, message: "Password is required to sign in." };
    }
    const match = await bcrypt.compare(params.password, existing.password);
    if (!match) {
      return { ok: false, status: 401, message: "Invalid password for this account." };
    }
    try {
      await assertEmailAllowedForStorefrontCustomerLogin({
        email,
        websiteOrganizationId: params.organizationId,
        linkedUserId: existing.linkedUserId,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Cannot sign in.";
      return { ok: false, status: 403, message };
    }
    const linked = await linkGuestOrdersToStorefrontCustomer({
      customerId: existing.id,
      websiteId: params.websiteId,
      organizationId: params.organizationId,
      email,
    });
    return { ok: true, customerId: existing.id, linkedOrders: linked, created: false };
  }

  if (!params.password || params.password.length < 8) {
    return { ok: false, status: 400, message: "Password must be at least 8 characters." };
  }

  const existingByEmail = await prisma.storefrontCustomer.findFirst({
    where: { websiteId: params.websiteId, email },
    select: { id: true, password: true, status: true, linkedUserId: true },
  });

  if (existingByEmail) {
    if (existingByEmail.status !== "active") {
      return { ok: false, status: 403, message: "Account is not active." };
    }
    const match = await bcrypt.compare(params.password, existingByEmail.password);
    if (!match) {
      return {
        ok: false,
        status: 409,
        message: "An account with this email already exists. Use your existing password or reset it.",
      };
    }
    try {
      await assertEmailAllowedForStorefrontCustomerLogin({
        email,
        websiteOrganizationId: params.organizationId,
        linkedUserId: existingByEmail.linkedUserId,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Cannot sign in.";
      return { ok: false, status: 403, message };
    }
    const linked = await linkGuestOrdersToStorefrontCustomer({
      customerId: existingByEmail.id,
      websiteId: params.websiteId,
      organizationId: params.organizationId,
      email,
    });
    return { ok: true, customerId: existingByEmail.id, linkedOrders: linked, created: false };
  }

  try {
    await assertEmailAllowedForStorefrontCustomerSignup({
      email,
      websiteOrganizationId: params.organizationId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cannot create account.";
    return { ok: false, status: 403, message };
  }

  const passwordHash = await bcrypt.hash(params.password, 10);
  try {
    const customer = await prisma.storefrontCustomer.create({
      data: {
        organizationId: params.organizationId,
        websiteId: params.websiteId,
        email,
        password: passwordHash,
        name: displayName,
        status: "active",
      },
      select: { id: true },
    });
    const linked = await linkGuestOrdersToStorefrontCustomer({
      customerId: customer.id,
      websiteId: params.websiteId,
      organizationId: params.organizationId,
      email,
    });
    return { ok: true, customerId: customer.id, linkedOrders: linked, created: true };
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return { ok: false, status: 409, message: "An account with this email already exists." };
    }
    return { ok: false, status: 500, message: "Could not create account." };
  }
}
