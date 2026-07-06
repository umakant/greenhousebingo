"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

export default function PosBrandsClient() {
  return (
    <PosSimpleAdmin
      title="Brands"
      apiPath="/api/pos/brands"
      createTitle="Add Brand"
      editTitle="Edit Brand"
      columns={[
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}
