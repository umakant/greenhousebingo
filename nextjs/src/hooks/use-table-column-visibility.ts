"use client";

import * as React from "react";

/**
 * Persisted column visibility for data tables. Pass stable `defaultVisibility` (module-level const).
 */
export function useTableColumnVisibility<T extends string>(
  storageKey: string,
  defaultVisibility: Record<T, boolean>,
) {
  const [visibility, setVisibility] = React.useState<Record<T, boolean>>(() => ({
    ...defaultVisibility,
  }));

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<T, boolean>>;
      setVisibility((prev) => ({ ...prev, ...parsed }));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibility));
    } catch {
      /* ignore */
    }
  }, [storageKey, visibility]);

  const columnVisible = React.useCallback(
    (id: T) => visibility[id] ?? defaultVisibility[id] ?? true,
    [visibility, defaultVisibility],
  );

  const resetVisibility = React.useCallback(() => {
    setVisibility({ ...defaultVisibility });
  }, [defaultVisibility]);

  /** Count visible data columns plus optional Actions column (default: include actions). */
  const visibleDataColumnCount = React.useCallback(
    (orderedIds: readonly T[], options?: { includeActions?: boolean }) => {
      const data = orderedIds.filter((id) => columnVisible(id)).length;
      const actions = options?.includeActions === false ? 0 : 1;
      return data + actions;
    },
    [columnVisible],
  );

  return {
    visibility,
    setVisibility,
    columnVisible,
    resetVisibility,
    visibleDataColumnCount,
  };
}
