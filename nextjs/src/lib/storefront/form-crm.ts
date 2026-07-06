import { prisma } from "@/lib/prisma";

import { findOrCreateCrmCustomerForStorefrontOrder, recordCrmLeadFromForm } from "@/lib/storefront/crm-bridge";
import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";

function inferEmailFromResponseData(data: Record<string, unknown>): string | null {
  for (const v of Object.values(data)) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t.includes("@") && t.length > 3) return t.toLowerCase();
    }
  }
  return null;
}

/** Day 38 — FormConversion drives CRM side-effects (module_name / submodule_name). */
export async function processFormConversionAfterSubmit(params: {
  formId: bigint;
  organizationId: bigint;
  responseId: bigint;
  responseData: Record<string, unknown>;
  websiteId?: bigint | null;
  pageSlug?: string | null;
}): Promise<void> {
  const form = await prisma.form.findFirst({
    where: { id: params.formId },
    include: { conversion: true },
  });
  if (!form) return;

  await publishStorefrontEvent({
    organizationId: params.organizationId,
    websiteId: params.websiteId ?? undefined,
    eventType: STOREFRONT_EVENTS.FORM_SUBMITTED,
    resourceType: "form_response",
    resourceId: params.responseId.toString(),
    message: `Form "${form.name}" submitted`,
    metadata: {
      formId: params.formId.toString(),
      pageSlug: params.pageSlug ?? undefined,
    },
  });

  if (!form.conversion?.isActive) return;

  const conv = form.conversion;
  const mappings = conv.fieldMappings as Record<string, string> | null;
  const pick = (key: string) => {
    if (!mappings?.[key]) return null;
    const label = mappings[key];
    const entry = Object.entries(params.responseData).find(([k]) => k === label);
    return entry ? String(entry[1] ?? "").trim() : null;
  };

  const email = pick("email") ?? pick("Email") ?? inferEmailFromResponseData(params.responseData);
  const name = pick("name") ?? pick("Name") ?? email?.split("@")[0] ?? "Form submitter";
  const phone = pick("phone") ?? pick("Phone");

  const mod = (conv.moduleName ?? "").toLowerCase();
  const sub = (conv.submoduleName ?? "").toLowerCase();

  if (mod === "crm" || mod === "storefront_crm") {
    if (sub === "lead" || sub === "leads") {
      await recordCrmLeadFromForm({
        organizationId: params.organizationId,
        name,
        email,
        phone,
        source: `form:${form.code}`,
        notes: `Form response ${params.responseId}`,
      });
      return;
    }
    if (sub === "contact" || sub === "contacts" || sub === "") {
      if (email) {
        await findOrCreateCrmCustomerForStorefrontOrder({
          organizationId: params.organizationId,
          websiteId: params.websiteId ?? null,
          email,
          name,
          shippingAddress: params.responseData,
        });
      }
    }
  }
}
