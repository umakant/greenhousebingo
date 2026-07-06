"use client";
import { useEffect, useState } from "react";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

const MONTHS = [
  { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
  { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
  { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
];

export default function PosBranchTargetsClient() {
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/pos/branches", { credentials: "include" }).then(r => r.json()).then(d =>
      setBranches(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name })))
    );
  }, []);

  const year = new Date().getFullYear();

  return (
    <PosSimpleAdmin
      title="Branch Sales Targets"
      apiPath="/api/pos/branch-targets"
      createTitle="Add Target"
      editTitle="Edit Target"
      columns={[
        { key: "branch", label: "Branch", render: r => (r.branch as Record<string, string> | null)?.name ?? "All Branches" },
        { key: "period", label: "Period" },
        { key: "year", label: "Year" },
        { key: "month", label: "Month", render: r => r.month ? MONTHS.find(m => m.value === String(r.month))?.label ?? String(r.month) : "—" },
        { key: "target", label: "Target", render: r => `$${Number(r.target ?? 0).toFixed(2)}` },
        { key: "achieved", label: "Achieved", render: r => `$${Number(r.achieved ?? 0).toFixed(2)}` },
      ]}
      fields={[
        { key: "branchId", label: "Branch", type: "select", options: branches },
        { key: "target", label: "Target Amount", type: "number", required: true },
        { key: "period", label: "Period", type: "select", options: [{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }] },
        { key: "year", label: "Year", type: "number" },
        { key: "month", label: "Month", type: "select", options: MONTHS },
        { key: "achieved", label: "Achieved", type: "number", readOnly: true },
      ]}
      defaultValues={{ period: "monthly", year, target: 0, achieved: 0 }}
    />
  );
}
