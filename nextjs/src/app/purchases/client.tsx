"use client";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";

export default function PosPurchasesClient() {
  return (
    <PosSimpleAdmin
      title="Purchases"
      apiPath="/api/pos/purchases"
      createTitle="Add Purchase"
      editTitle="Edit Purchase"
      columns={[
        { key: "number", label: "PO #" },
        { key: "vendor", label: "Vendor", render: r => (r.vendor as Record<string, string> | null)?.name ?? "—" },
        { key: "branch", label: "Branch", render: r => (r.branch as Record<string, string> | null)?.name ?? "—" },
        { key: "total", label: "Total", render: r => `$${Number(r.total ?? 0).toFixed(2)}` },
        { key: "paid", label: "Paid", render: r => `$${Number(r.paid ?? 0).toFixed(2)}` },
        { key: "status", label: "Status", render: r => <StatusBadge status={String(r.status)} /> },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
      fields={[
        { key: "status", label: "Status", type: "select", options: [{ value: "received", label: "Received" }, { value: "pending", label: "Pending" }, { value: "cancelled", label: "Cancelled" }] },
        { key: "paid", label: "Paid Amount", type: "number" },
        { key: "note", label: "Note", type: "textarea" },
      ]}
      defaultValues={{ status: "received", paid: 0 }}
    />
  );
}
