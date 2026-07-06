"use client";
import { useEffect, useState } from "react";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";

export default function PosSessionsClient() {
  const [registers, setRegisters] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/pos/cash-registers", { credentials: "include" }).then(r => r.json()).then(d =>
      setRegisters(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name })))
    );
  }, []);

  return (
    <PosSimpleAdmin
      title="POS Sessions"
      apiPath="/api/pos/sessions"
      createTitle="Open Session"
      editTitle="Edit Session"
      columns={[
        { key: "cashRegister", label: "Cash Register", render: r => (r.cashRegister as Record<string, string> | null)?.name ?? "—" },
        { key: "status", label: "Status", render: r => <StatusBadge status={String(r.status)} /> },
        { key: "openingBalance", label: "Opening Balance", render: r => `$${Number(r.openingBalance ?? 0).toFixed(2)}` },
        { key: "closingBalance", label: "Closing Balance", render: r => r.closingBalance ? `$${Number(r.closingBalance).toFixed(2)}` : "—" },
        { key: "openedAt", label: "Opened At", render: r => new Date(r.openedAt as string).toLocaleString() },
      ]}
      fields={[
        { key: "cashRegisterId", label: "Cash Register", type: "select", options: registers },
        { key: "openingBalance", label: "Opening Balance", type: "number" },
        { key: "status", label: "Status", type: "select", options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }], readOnly: true },
        { key: "closingBalance", label: "Closing Balance", type: "number", readOnly: true },
        { key: "note", label: "Note", type: "textarea" },
      ]}
      defaultValues={{ openingBalance: 0, status: "open" }}
    />
  );
}
