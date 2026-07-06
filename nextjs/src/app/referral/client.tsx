"use client";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";

export default function PosReferralClient() {
  return (
    <PosSimpleAdmin
      title="Referral Codes"
      apiPath="/api/pos/referrals"
      createTitle="Add Code"
      editTitle="Edit Code"
      columns={[
        { key: "code", label: "Code" },
        { key: "discount", label: "Discount", render: r => r.type === "percentage" ? `${r.discount}%` : `$${Number(r.discount).toFixed(2)}` },
        { key: "type", label: "Type" },
        { key: "usageCount", label: "Used" },
        { key: "usageLimit", label: "Limit" },
        { key: "isActive", label: "Status", render: r => <StatusBadge status={r.isActive ? "active" : "inactive"} /> },
      ]}
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "discount", label: "Discount", type: "number", required: true },
        { key: "type", label: "Type", type: "select", options: [{ value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed Amount" }] },
        { key: "usageLimit", label: "Usage Limit", type: "number" },
        { key: "expiresAt", label: "Expires At", type: "date" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      defaultValues={{ discount: 0, type: "percentage", isActive: true }}
    />
  );
}
