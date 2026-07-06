"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

export default function PosCategoriesClient() {
  return (
    <PosSimpleAdmin
      title="Categories"
      apiPath="/api/pos/categories"
      createTitle="Add Category"
      editTitle="Edit Category"
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
