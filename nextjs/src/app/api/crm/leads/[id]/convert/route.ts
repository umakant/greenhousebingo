import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCrmActor,
  getCrmPerms,
  checkPerm,
  getCompanyId,
  jsonR,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/crm-auth";
import { hasPermission } from "@/lib/authz";
import { createAccountCustomer } from "@/lib/account-customer-service";
import { formatCrmLeadFullName } from "@/lib/crm-lead-name";

/**
 * Convert a CRM lead into an accounting Customer (with a client portal login).
 * Reuses the same customer-creation flow as POST /api/account/customers and, on
 * success, flips the lead status to "converted".
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();

  const perms = await getCrmPerms(req);
  // Caller must be able to read leads AND create customers.
  if (!checkPerm(perms, "view-leads", "manage-leads", "create-leads", "manage-crm")) {
    return forbidden();
  }
  const canCreateCustomer =
    perms.includes("*") ||
    hasPermission(perms, "manage-customers") ||
    hasPermission(perms, "create-customers");
  if (!canCreateCustomer) {
    return jsonR(
      { ok: false, message: "You do not have permission to create customers." },
      403,
    );
  }

  try {
    const { id } = await params;
    const companyId = getCompanyId(actor);

    const lead = await prisma.crmLead.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
    });
    if (!lead) return jsonR({ ok: false, message: "Lead not found" }, 404);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const contactName =
      (typeof body.contact_person_name === "string" && body.contact_person_name.trim()) ||
      (() => {
        const full = formatCrmLeadFullName(lead.firstName, lead.lastName);
        return full === "—" ? (lead.name ?? "") : full;
      })();

    const email =
      (typeof body.contact_person_email === "string" && body.contact_person_email.trim()) ||
      (lead.email ?? "").trim();

    if (!email) {
      return jsonR(
        {
          ok: false,
          message: "This lead has no email. Add an email to the lead before converting.",
        },
        422,
      );
    }

    const companyName =
      (typeof body.company_name === "string" && body.company_name.trim()) ||
      (lead.company ?? "").trim() ||
      contactName;

    const mobile =
      typeof body.contact_person_mobile === "string"
        ? body.contact_person_mobile
        : (lead.phone ?? null);

    const result = await createAccountCustomer({
      companyId,
      actorId: actor.id,
      companyName,
      contactPersonName: contactName,
      contactPersonEmail: email,
      contactPersonMobile: mobile,
      taxNumber: typeof body.tax_number === "string" ? body.tax_number : null,
      paymentTerms: typeof body.payment_terms === "string" ? body.payment_terms : null,
      billingAddress: body.billing_address as Record<string, unknown> | undefined,
      shippingAddress: body.shipping_address as Record<string, unknown> | undefined,
      sameAsBilling: Boolean(body.same_as_billing),
      notes:
        typeof body.notes === "string"
          ? body.notes
          : (lead.notes ?? null),
    });

    if (!result.ok) {
      return jsonR({ ok: false, message: result.error }, result.status);
    }

    // Mark the lead converted (best-effort; customer already created).
    const markConverted = body.mark_converted === undefined ? true : Boolean(body.mark_converted);
    if (markConverted && lead.status !== "converted") {
      await prisma.crmLead
        .update({
          where: { id: lead.id },
          data: { status: "converted", updatedAt: new Date() },
        })
        .catch(() => null);
    }

    return jsonR(
      {
        ok: true,
        message: "Customer created from lead",
        customer_id: result.customerId,
        customer_code: result.customerCode,
        portal_password: result.portalPassword ?? undefined,
        welcome_email_sent: result.welcomeEmailSent,
        welcome_email_error: result.welcomeEmailError,
        lead_status: markConverted ? "converted" : lead.status,
      },
      201,
    );
  } catch (e) {
    return serverError(e);
  }
}
