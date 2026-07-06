import crypto from "node:crypto";

export function generateSalesInvoiceNumber(createdBy: bigint, seq: number): string {
  const n = String(seq).padStart(3, "0");
  return `INV#${n}`;
}

export function generateInvoiceShortCode(projectName?: string | null, customerCode?: string | null): string {
  const fromProject = (projectName ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  if (fromProject.length >= 2) return fromProject;
  const fromCustomer = (customerCode ?? "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return fromCustomer || "INV";
}

export function generatePaymentToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function computeInvoiceStatus(total: number, paid: number): "paid" | "unpaid" | "partially_paid" {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partially_paid";
}

export function unpaidAmount(total: number, paid: number): number {
  return Math.max(0, total - paid);
}

export type SerializedSalesInvoiceRow = {
  id: string;
  invoice_number: string;
  short_code: string;
  project_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  customer_id: string;
  customer: {
    id: string;
    company_name: string;
    contact_person_name: string;
    contact_person_email: string;
    customer_code: string;
  } | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  status: string;
  display_status: "paid" | "unpaid" | "partially_paid";
  notes: string | null;
  terms: string | null;
  payment_token: string | null;
  created_at: string | null;
};

export function serializeSalesInvoiceRow(
  inv: {
    id: bigint;
    invoiceNumber: string;
    shortCode: string | null;
    invoiceDate: Date;
    dueDate: Date | null;
    customerId: bigint;
    projectName: string | null;
    subtotal: unknown;
    taxAmount: unknown;
    discountAmount: unknown;
    totalAmount: unknown;
    paidAmount: unknown;
    status: string;
    notes: string | null;
    terms: string | null;
    paymentToken: string | null;
    createdAt: Date | null;
  },
  customer: {
    id: bigint;
    companyName: string;
    contactPersonName: string;
    contactPersonEmail: string;
    customerCode: string;
  } | null,
): SerializedSalesInvoiceRow {
  const total = Number(inv.totalAmount);
  const paid = Number(inv.paidAmount);
  const displayStatus = computeInvoiceStatus(total, paid);
  return {
    id: inv.id.toString(),
    invoice_number: inv.invoiceNumber,
    short_code: inv.shortCode ?? "",
    project_name: inv.projectName,
    invoice_date: inv.invoiceDate?.toISOString?.()?.slice(0, 10) ?? null,
    due_date: inv.dueDate?.toISOString?.()?.slice(0, 10) ?? null,
    customer_id: inv.customerId.toString(),
    customer: customer
      ? {
          id: customer.id.toString(),
          company_name: customer.companyName,
          contact_person_name: customer.contactPersonName,
          contact_person_email: customer.contactPersonEmail,
          customer_code: customer.customerCode,
        }
      : null,
    subtotal: Number(inv.subtotal),
    tax_amount: Number(inv.taxAmount),
    discount_amount: Number(inv.discountAmount),
    total_amount: total,
    paid_amount: paid,
    unpaid_amount: unpaidAmount(total, paid),
    status: inv.status,
    display_status: displayStatus,
    notes: inv.notes,
    terms: inv.terms,
    payment_token: inv.paymentToken,
    created_at: inv.createdAt?.toISOString?.() ?? null,
  };
}
