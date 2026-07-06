"use client";
import { PosReportPage } from "@/components/pos/pos-report-page";
import { StatusBadge } from "@/components/pos/pos-simple-admin";

export default function PurchasesReportClient() {
  return (
    <PosReportPage
      reportType="purchases"
      title="Purchases Report"
      summaryCards={s => [
        { label: "Total Spent", value: `$${Number(s.total ?? 0).toFixed(2)}`, color: "text-red-600" },
        { label: "Total Orders", value: String(s.count ?? 0) },
      ]}
      columns={[
        { key: "number", label: "PO #" },
        { key: "vendor", label: "Vendor", render: r => (r.vendor as Record<string, string> | null)?.name ?? "—" },
        { key: "branch", label: "Branch", render: r => (r.branch as Record<string, string> | null)?.name ?? "—" },
        { key: "total", label: "Total", render: r => `$${Number(r.total ?? 0).toFixed(2)}` },
        { key: "paid", label: "Paid", render: r => `$${Number(r.paid ?? 0).toFixed(2)}` },
        { key: "status", label: "Status", render: r => <StatusBadge status={String(r.status)} /> },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
    />
  );
}
