import { redirect } from "next/navigation";

export default function SalesInvoiceCreatePage() {
  redirect("/sales-invoices?create=1");
}
