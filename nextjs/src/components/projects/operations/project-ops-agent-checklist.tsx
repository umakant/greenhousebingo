"use client";

import * as React from "react";
import {
  Car,
  Check,
  FileText,
  Home,
  LogIn,
  MessageCircle,
  ShieldCheck,
  Shirt,
  UserCheck,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  agentChecklistColumnsFromForm,
  useProjectSectionForm,
} from "./project-ops-dynamic-form";

const DEFAULT_COLS = [
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "housing", label: "Housing", icon: Home },
  { key: "attire", label: "Attire", icon: Shirt },
  { key: "meals", label: "Meals", icon: UtensilsCrossed },
  { key: "parking", label: "Parking", icon: Car },
  { key: "policy", label: "Policy", icon: FileText },
  { key: "check_in", label: "Check-In", icon: LogIn },
  { key: "hotel_security", label: "Hotel Security", icon: ShieldCheck },
] as const;

const ICON_BY_KEY: Record<string, React.ComponentType<{ className?: string }>> = {
  confirmed: Check,
  whatsapp: MessageCircle,
  housing: Home,
  attire: Shirt,
  meals: UtensilsCrossed,
  parking: Car,
  policy: FileText,
  check_in: LogIn,
  hotel_security: ShieldCheck,
};

type AgentChecklistRow = {
  user_id: number;
  name: string;
  confirmed: boolean;
  whatsapp: boolean;
  housing: boolean;
  attire: boolean;
  meals: boolean;
  parking: boolean;
  policy: boolean;
  check_in: boolean;
  hotel_security: boolean;
};

export function AgentChecklistTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [rows, setRows] = React.useState<AgentChecklistRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { form } = useProjectSectionForm("agent_checklist");

  const columns = React.useMemo(() => {
    if (form?.fields?.length) {
      return agentChecklistColumnsFromForm(form.fields).map((c) => ({
        ...c,
        icon: ICON_BY_KEY[c.key] ?? Check,
      }));
    }
    return [...DEFAULT_COLS];
  }, [form]);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/project/${projectId}/agent-checklist`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.data) ? d.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const toggle = async (userId: number, field: string, value: boolean) => {
    if (!canManage) return;
    await fetch(`/api/project/${projectId}/agent-checklist`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, field, value: !value }),
    });
    load();
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Agent Checklist</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Column labels are managed in Form Builder → Project — Agent Checklist.
        </p>
      </div>

      <div className="overflow-x-auto p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents assigned yet.</p>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Agent</th>
                {columns.map((col) => (
                  <th key={col.key} className="pb-3 px-2 text-center font-medium">
                    <span className="inline-flex flex-col items-center gap-1">
                      <col.icon className="h-4 w-4" />
                      {col.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium text-foreground">{row.name}</td>
                  {columns.map((col) => {
                    const val = row[col.key as keyof AgentChecklistRow];
                    const checked = val === true;
                    return (
                      <td key={col.key} className="px-2 py-3 text-center">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => void toggle(row.user_id, col.key, checked)}
                          className={cn(
                            "mx-auto flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                            checked
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-600"
                              : "border-muted-foreground/30 hover:border-primary",
                            !canManage && "cursor-default opacity-60",
                          )}
                        >
                          {checked ? <Check className="h-4 w-4" /> : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
