"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";
import { formatPhoneDisplay } from "@/lib/phone";

export default function PosBranchesClient() {
  return (
    <PosSimpleAdmin
      title="Branches"
      apiPath="/api/pos/branches"
      createTitle="Add Branch"
      editTitle="Edit Branch"
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone", render: (row) => formatPhoneDisplay(row.phone as string, "-") },
        { key: "city", label: "City" },
        { key: "country", label: "Country" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "city", label: "City" },
        { key: "country", label: "Country" },
        { key: "address", label: "Address", type: "address" },
      ]}
    />
  );
}
