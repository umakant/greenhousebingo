"use client";
import { useEffect, useState } from "react";
import { PosSimpleAdmin } from "@/components/pos/pos-simple-admin";

export default function PosExpensesClient() {
  const [cats, setCats] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/pos/expense-categories", { credentials: "include" }).then(r => r.json()).then(d =>
      setCats(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name })))
    );
  }, []);

  const today = new Date().toISOString().split("T")[0];

  return (
    <PosSimpleAdmin
      title="Expenses"
      apiPath="/api/pos/expenses"
      createTitle="Add Expense"
      editTitle="Edit Expense"
      columns={[
        { key: "title", label: "Title" },
        { key: "category", label: "Category", render: r => (r.category as Record<string, string> | null)?.name ?? "—" },
        { key: "amount", label: "Amount", render: r => `$${Number(r.amount ?? 0).toFixed(2)}` },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "categoryId", label: "Category", type: "select", options: cats },
        { key: "date", label: "Date", type: "date" },
        { key: "note", label: "Note", type: "textarea" },
      ]}
      defaultValues={{ amount: 0, date: today }}
    />
  );
}
