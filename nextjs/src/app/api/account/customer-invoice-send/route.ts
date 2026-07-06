import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasAccountPermission } from "@/lib/authz";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmail } from "@/lib/send-templated-email";

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

/**
 * Sends the "Customer Invoice Send" template when invoice URLs are provided manually (no invoice entity in this app yet).
 * Body: invoice_number (required), optional customer_id or mail_to, optional invoice_name, invoice_url, pay_invoice_url.
 */
export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasAccountPermission(perms, "manage-customer-payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true, createdBy: true } });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const invoiceNumber = body?.invoice_number != null ? String(body.invoice_number).trim() : "";
  if (!invoiceNumber) {
    return NextResponse.json({ error: "invoice_number is required" }, { status: 400 });
  }

  let mailTo = body?.mail_to != null ? String(body.mail_to).trim().toLowerCase() : "";
  if (!mailTo?.includes("@") && body?.customer_id != null) {
    const cust = await prisma.customer.findFirst({
      where: { id: BigInt(Number(body.customer_id)), createdBy: companyId },
      select: { contactPersonEmail: true, companyName: true, contactPersonName: true },
    });
    mailTo = cust?.contactPersonEmail?.trim().toLowerCase() ?? "";
  }
  if (!mailTo?.includes("@")) {
    return NextResponse.json({ error: "mail_to or customer_id with a valid contact email is required" }, { status: 400 });
  }

  const settings = await getSettingsForOwner(companyId);
  if (!isCompanyEmailNotificationEnabled(settings, "Customer Invoice Send")) {
    return NextResponse.json({ ok: false, message: "Customer Invoice Send email is disabled in company settings" }, { status: 400 });
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  let invoiceName = body?.invoice_name != null ? String(body.invoice_name).trim() : "";
  if (!invoiceName && body?.customer_id != null) {
    const cust = await prisma.customer.findFirst({
      where: { id: BigInt(Number(body.customer_id)), createdBy: companyId },
      select: { companyName: true, contactPersonName: true },
    });
    invoiceName = (cust?.contactPersonName ?? cust?.companyName ?? "").trim() || mailTo;
  }
  if (!invoiceName) invoiceName = mailTo;

  const invoiceUrl =
    body?.invoice_url != null && String(body.invoice_url).trim()
      ? String(body.invoice_url).trim()
      : base
        ? `${base}/account`
        : "-";
  const payInvoiceUrl =
    body?.pay_invoice_url != null && String(body.pay_invoice_url).trim()
      ? String(body.pay_invoice_url).trim()
      : base
        ? `${base}/account`
        : "-";

  const result = await sendTemplatedEmail({
    templateName: "Customer Invoice Send",
    mailTo: [mailTo],
    ownerId: companyId,
    variables: {
      invoice_name: invoiceName,
      invoice_number: invoiceNumber,
      invoice_url: invoiceUrl,
      pay_invoice_url: payInvoiceUrl,
    },
  });

  if (!result.is_success) {
    return NextResponse.json(
      { ok: false, message: typeof result.error === "string" ? result.error : "Failed to send email" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
