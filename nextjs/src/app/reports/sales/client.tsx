"use client";
import { PosReportPage } from "@/components/pos/pos-report-page";
import { StatusBadge } from "@/components/pos/pos-simple-admin";

export default function SalesReportClient() {
  return (
    <PosReportPage
      reportType="sales"
      title="Sales Report"
      summaryCards={s => [
        { label: "Total Revenue", value: `$${Number(s.total ?? 0).toFixed(2)}`, color: "text-green-600" },
        { label: "Total Orders", value: String(s.count ?? 0) },
      ]}
      columns={[
        { key: "number", label: "Invoice #" },
        { key: "customer", label: "Customer", render: r => (r.customer as Record<string, string> | null)?.name ?? "Walk-in" },
        { key: "branch", label: "Branch", render: r => (r.branch as Record<string, string> | null)?.name ?? "—" },
        { key: "total", label: "Total", render: r => `$${Number(r.total ?? 0).toFixed(2)}` },
        { key: "paymentMethod", label: "Payment" },
        { key: "status", label: "Status", render: r => <StatusBadge status={String(r.status)} /> },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
    />
  );
}
