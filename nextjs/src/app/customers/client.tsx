"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

export default function PosCustomersClient() {
  return (
    <PosSimpleAdmin
      title="Customers"
      apiPath="/api/pos/customers"
      createTitle="Add Customer"
      editTitle="Edit Customer"
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
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
