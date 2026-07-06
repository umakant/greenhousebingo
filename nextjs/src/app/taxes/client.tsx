"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

export default function PosTaxesClient() {
  return (
    <PosSimpleAdmin
      title="Taxes"
      apiPath="/api/pos/taxes"
      createTitle="Add Tax"
      editTitle="Edit Tax"
      columns={[
        { key: "name", label: "Name" },
        { key: "rate", label: "Rate (%)" },
        { key: "type", label: "Type" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "rate", label: "Rate (%)", type: "number", required: true },
        { key: "type", label: "Type", type: "select", options: [{ value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed" }] },
      ]}
      defaultValues={{ type: "percentage", rate: 0 }}
    />
  );
}
