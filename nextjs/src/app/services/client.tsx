"use client";

import { useEffect, useState } from "react";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

export default function PosServicesClient() {
  const { settings } = useAppSettings();
  const formatMoney = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? formatCurrency(n, settings) : "—";
  };
  const [units, setUnits] = useState<{ value: string; label: string }[]>([]);
  const [taxes, setTaxes] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/pos/units", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUnits(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name }))));
    fetch("/api/pos/taxes", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTaxes(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name }))));
  }, []);

  return (
    <PosSimpleAdmin
      title="Services"
      apiPath="/api/pos/services"
      createTitle="Add Service"
      editTitle="Edit Service"
      columns={[
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "rate", label: "Rate", render: (r) => formatMoney(r.rate) },
        { key: "unit", label: "Unit", render: (r) => (r.unit as Record<string, string> | null)?.shortName ?? "—" },
        { key: "isActive", label: "Status", render: (r) => <StatusBadge status={r.isActive ? "active" : "inactive"} /> },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code" },
        { key: "rate", label: "Rate", type: "currency", required: true },
        { key: "unitId", label: "Unit", type: "select", options: units },
        { key: "taxId", label: "Tax", type: "select", options: taxes },
        { key: "description", label: "Description", type: "textarea" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      defaultValues={{ rate: 0, isActive: true }}
    />
  );
}
