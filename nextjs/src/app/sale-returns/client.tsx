"use client";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";

export default function PosSaleReturnsClient() {
  return (
    <PosSimpleAdmin
      title="Sale Returns"
      apiPath="/api/pos/sale-returns"
      createTitle="Add Return"
      editTitle="Edit Return"
      columns={[
        { key: "number", label: "Return #" },
        { key: "sale", label: "Sale Invoice", render: r => (r.sale as Record<string, string> | null)?.number ?? "—" },
        { key: "total", label: "Total", render: r => `$${Number(r.total ?? 0).toFixed(2)}` },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status", render: r => <StatusBadge status={String(r.status)} /> },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
      fields={[
        { key: "status", label: "Status", type: "select", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] },
        { key: "reason", label: "Reason", type: "textarea" },
      ]}
      defaultValues={{ status: "pending" }}
    />
  );
}
