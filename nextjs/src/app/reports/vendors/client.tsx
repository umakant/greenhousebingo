"use client";
import { PosReportPage } from "@/components/pos/pos-report-page";
import { formatPhoneDisplay } from "@/lib/phone";

export default function VendorsReportClient() {
  return (
    <PosReportPage
      reportType="vendors"
      title="Vendors Report"
      summaryCards={s => [
        { label: "Total Vendors", value: String(s.count ?? 0) },
      ]}
      columns={[
        { key: "name", label: "Vendor" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone", render: r => formatPhoneDisplay(r.phone as string, "-") },
        { key: "orderCount", label: "Orders" },
        { key: "totalPurchased", label: "Total Purchased", render: r => `$${Number(r.totalPurchased ?? 0).toFixed(2)}` },
      ]}
    />
  );
}
