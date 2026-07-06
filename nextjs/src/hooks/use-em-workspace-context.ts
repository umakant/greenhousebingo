"use client";

import * as React from "react";

import type { EmWorkspaceContextDto } from "@/lib/em-workspace-types";
import { EM_WORKSPACE_CONTEXT_CHANGED_EVENT } from "@/lib/em-workspace-events";

export function useEmWorkspaceContext() {
  const [data, setData] = React.useState<EmWorkspaceContextDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/expense-management/workspace-context", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { data?: EmWorkspaceContextDto; error?: string } | null;
      if (!res.ok) throw new Error(json?.error || "Failed to load workspace.");
      setData(json?.data ?? null);
    } catch (e: unknown) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(EM_WORKSPACE_CONTEXT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(EM_WORKSPACE_CONTEXT_CHANGED_EVENT, onChange);
  }, [load]);

  const patch = React.useCallback(
    async (body: Partial<EmWorkspaceContextDto>) => {
      const res = await fetch("/api/expense-management/workspace-context", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { data?: EmWorkspaceContextDto; error?: string } | null;
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setData(json?.data ?? null);
      window.dispatchEvent(new Event(EM_WORKSPACE_CONTEXT_CHANGED_EVENT));
      return json?.data ?? null;
    },
    [],
  );

  return { data, loading, error, reload: load, patch };
}
