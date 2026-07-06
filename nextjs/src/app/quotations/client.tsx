"use client";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";

export default function PosQuotationsClient() {
  return (
    <PosSimpleAdmin
      title="Quotations"
      apiPath="/api/pos/quotations"
      createTitle="Add Quotation"
      editTitle="Edit Quotation"
      columns={[
        { key: "number", label: "Number" },
        { key: "customer", label: "Customer", render: r => (r.customer as Record<string, string> | null)?.name ?? "Walk-in" },
        { key: "total", label: "Total", render: r => `$${Number(r.total ?? 0).toFixed(2)}` },
        { key: "status", label: "Status", render: r => <StatusBadge status={String(r.status)} /> },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
      fields={[
        { key: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "approved", label: "Approved" }, { value: "cancelled", label: "Cancelled" }] },
        { key: "note", label: "Note", type: "textarea" },
      ]}
      defaultValues={{ status: "draft" }}
    />
  );
}
