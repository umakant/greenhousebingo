"use client";
import { PosReportPage } from "@/components/pos/pos-report-page";

export default function InventoryReportClient() {
  return (
    <PosReportPage
      reportType="inventory"
      title="Inventory Report"
      summaryCards={s => [
        { label: "Total Products", value: String(s.count ?? 0) },
        { label: "Total Stock Value", value: `$${Number(s.totalValue ?? 0).toFixed(2)}`, color: "text-blue-600" },
        { label: "Low Stock Items", value: String(s.lowStock ?? 0), color: "text-red-600" },
      ]}
      columns={[
        { key: "name", label: "Product" },
        { key: "category", label: "Category", render: r => (r.category as Record<string, string> | null)?.name ?? "—" },
        { key: "brand", label: "Brand", render: r => (r.brand as Record<string, string> | null)?.name ?? "—" },
        { key: "price", label: "Price", render: r => `$${Number(r.price ?? 0).toFixed(2)}` },
        { key: "stock", label: "Stock" },
        { key: "stockAlert", label: "Alert At" },
        { key: "stockValue", label: "Stock Value", render: r => `$${(Number(r.price ?? 0) * Number(r.stock ?? 0)).toFixed(2)}` },
      ]}
    />
  );
}
