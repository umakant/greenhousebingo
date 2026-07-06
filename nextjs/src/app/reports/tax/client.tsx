"use client";
import { PosReportPage } from "@/components/pos/pos-report-page";

export default function TaxReportClient() {
  return (
    <PosReportPage
      reportType="tax"
      title="Tax Report"
      summaryCards={s => [
        { label: "Total Tax Collected", value: `$${Number(s.totalTax ?? 0).toFixed(2)}`, color: "text-purple-600" },
        { label: "Transactions", value: String(s.count ?? 0) },
      ]}
      columns={[
        { key: "number", label: "Invoice #" },
        { key: "total", label: "Sale Total", render: r => `$${Number(r.total ?? 0).toFixed(2)}` },
        { key: "taxAmount", label: "Tax Amount", render: r => `$${Number(r.taxAmount ?? 0).toFixed(2)}` },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
    />
  );
}
