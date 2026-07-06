import { prisma } from "@/lib/prisma";
import {
  assertEmailAllowedForStorefrontCustomerSignup,
  normalizeStorefrontCustomerEmail,
} from "@/lib/storefront-customer-auth";

export type StorefrontCustomerEmailCheckResult = {
  ok: boolean;
  allowedForSignup: boolean;
  existingCustomer: boolean;
  message: string | null;
};

/** Whether checkout can create a new storefront customer with this email. */
export async function checkStorefrontCustomerEmailForCheckout(params: {
  email: string;
  websiteId: bigint;
  organizationId: bigint;
}): Promise<StorefrontCustomerEmailCheckResult> {
  const email = normalizeStorefrontCustomerEmail(params.email);
  if (!email.includes("@")) {
    return {
      ok: false,
      allowedForSignup: false,
      existingCustomer: false,
      message: "Enter a valid email address.",
    };
  }

  const existing = await prisma.storefrontCustomer.findFirst({
    where: { websiteId: params.websiteId, email, status: "active" },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: true,
      allowedForSignup: false,
      existingCustomer: true,
      message: "An account already exists for this email. Please sign in to continue.",
    };
  }

  try {
    await assertEmailAllowedForStorefrontCustomerSignup({
      email,
      websiteOrganizationId: params.organizationId,
    });
    return { ok: true, allowedForSignup: true, existingCustomer: false, message: null };
  } catch (e) {
    return {
      ok: true,
      allowedForSignup: false,
      existingCustomer: false,
      message: e instanceof Error ? e.message : "This email cannot be used for a customer account.",
    };
  }
}
