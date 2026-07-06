import { prisma } from "@/lib/prisma";
import { parseFullNameToLeadParts } from "@/lib/crm-lead-name";
import { resolveDefaultLeadPlacement } from "@/lib/crm-default-pipeline";

import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";

function genCustomerCode(): string {
  return `SF-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Days 36–39 — link storefront activity to accounting `Customer` (CRM-facing contact).
 */
export async function findOrCreateCrmCustomerForStorefrontOrder(params: {
  organizationId: bigint;
  websiteId?: bigint | null;
  email: string;
  name: string | null;
  shippingAddress?: unknown;
}): Promise<bigint | null> {
  const email = params.email.trim().toLowerCase();
  if (!email) return null;

  const existing = await prisma.customer.findFirst({
    where: {
      createdBy: params.organizationId,
      contactPersonEmail: { equals: email, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.customer.create({
    data: {
      customerCode: genCustomerCode(),
      companyName: params.name?.trim() || email.split("@")[0] || "Storefront customer",
      contactPersonName: params.name?.trim() || "Customer",
      contactPersonEmail: email,
      contactPersonMobile: null,
      createdBy: params.organizationId,
      billingAddress: params.shippingAddress ? (params.shippingAddress as object) : undefined,
      shippingAddress: params.shippingAddress ? (params.shippingAddress as object) : undefined,
    },
    select: { id: true },
  });

  await publishStorefrontEvent({
    organizationId: params.organizationId,
    websiteId: params.websiteId ?? undefined,
    eventType: STOREFRONT_EVENTS.CUSTOMER_CREATED,
    resourceType: "crm_customer",
    resourceId: created.id.toString(),
    message: "CRM contact created from storefront",
    metadata: { email },
  });

  return created.id;
}

export async function recordCrmLeadFromForm(params: {
  organizationId: bigint;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  notes?: string;
}): Promise<bigint | null> {
  if (!params.email?.trim()) return null;
  const email = params.email.trim().toLowerCase();

  const dup = await prisma.crmLead.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (dup) return dup.id;

  const parts = parseFullNameToLeadParts(params.name || "");
  const firstName = parts.firstName || email.split("@")[0] || "Lead";
  const placement = await resolveDefaultLeadPlacement(params.organizationId);
  const lead = await prisma.crmLead.create({
    data: {
      firstName,
      lastName: parts.lastName,
      email,
      phone: params.phone,
      source: params.source,
      notes: params.notes ?? null,
      status: "new",
      pipelineId: placement?.pipelineId ?? null,
      stageId: placement?.stageId ?? null,
      createdBy: params.organizationId,
    },
    select: { id: true },
  });
  return lead.id;
}
