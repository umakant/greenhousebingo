"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

export default function PosUnitsClient() {
  return (
    <PosSimpleAdmin
      title="Units"
      apiPath="/api/pos/units"
      createTitle="Add Unit"
      editTitle="Edit Unit"
      columns={[
        { key: "name", label: "Name" },
        { key: "shortName", label: "Short Name" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "shortName", label: "Short Name", required: true },
      ]}
    />
  );
}
