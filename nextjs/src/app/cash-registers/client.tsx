"use client";
import { useEffect, useState } from "react";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";

export default function PosCashRegistersClient() {
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/pos/branches", { credentials: "include" }).then(r => r.json()).then(d =>
      setBranches(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name })))
    );
  }, []);

  return (
    <PosSimpleAdmin
      title="Cash Registers"
      apiPath="/api/pos/cash-registers"
      createTitle="Add Cash Register"
      editTitle="Edit Cash Register"
      columns={[
        { key: "name", label: "Name" },
        { key: "branch", label: "Branch", render: r => (r.branch as Record<string, string> | null)?.name ?? "—" },
        { key: "isActive", label: "Status", render: r => <StatusBadge status={r.isActive ? "active" : "inactive"} /> },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "branchId", label: "Branch", type: "select", options: branches },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      defaultValues={{ isActive: true }}
    />
  );
}
