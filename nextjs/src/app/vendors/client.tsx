"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";
import { formatPhoneDisplay } from "@/lib/phone";

export default function PosVendorsClient() {
  return (
    <PosSimpleAdmin
      title="Vendors"
      apiPath="/api/pos/vendors"
      createTitle="Add Vendor"
      editTitle="Edit Vendor"
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone", render: (row) => formatPhoneDisplay(row.phone as string, "-") },
        { key: "address", label: "Address" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "address", label: "Address", type: "address" },
      ]}
    />
  );
}
