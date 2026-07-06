import { prisma } from "@/lib/prisma";

export type SalesInvoiceCustomerOption = {
  id: string;
  name: string;
  company_name: string;
  email: string;
  customer_code: string;
};

export function serializeSalesInvoiceCustomer(c: {
  id: bigint;
  companyName: string;
  contactPersonName: string;
  contactPersonEmail: string;
  customerCode: string;
}): SalesInvoiceCustomerOption {
  return {
    id: c.id.toString(),
    name: c.contactPersonName?.trim() || c.companyName,
    company_name: c.companyName,
    email: c.contactPersonEmail,
    customer_code: c.customerCode,
  };
}

export async function listSalesInvoiceCustomers(companyId: bigint): Promise<SalesInvoiceCustomerOption[]> {
  const rows = await prisma.customer.findMany({
    where: { createdBy: companyId },
    select: {
      id: true,
      companyName: true,
      contactPersonName: true,
      contactPersonEmail: true,
      customerCode: true,
    },
    orderBy: [{ companyName: "asc" }, { contactPersonName: "asc" }],
    take: 500,
  });
  return rows.map(serializeSalesInvoiceCustomer);
}
