"use client";
import { PosReportPage } from "@/components/pos/pos-report-page";

export default function ExpensesReportClient() {
  return (
    <PosReportPage
      reportType="expenses"
      title="Expenses Report"
      summaryCards={s => [
        { label: "Total Expenses", value: `$${Number(s.total ?? 0).toFixed(2)}`, color: "text-orange-600" },
        { label: "Transactions", value: String(s.count ?? 0) },
      ]}
      columns={[
        { key: "title", label: "Title" },
        { key: "category", label: "Category", render: r => (r.category as Record<string, string> | null)?.name ?? "—" },
        { key: "amount", label: "Amount", render: r => `$${Number(r.amount ?? 0).toFixed(2)}` },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
    />
  );
}
