"use client";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

export default function PosExpCatClient() {
  return (
    <PosSimpleAdmin
      title="Expense Categories"
      apiPath="/api/pos/expense-categories"
      createTitle="Add Category"
      editTitle="Edit Category"
      columns={[{ key: "name", label: "Name" }]}
      fields={[{ key: "name", label: "Name", required: true }]}
    />
  );
}
