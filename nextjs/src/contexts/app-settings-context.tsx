"use client";

import * as React from "react";

export type AppSettings = Record<string, string>;

type Ctx = {
  settings: AppSettings;
  refresh: () => Promise<void>;
};

const AppSettingsContext = React.createContext<Ctx | null>(null);

const DEFAULT_APP_SETTINGS: AppSettings = { titleText: "SecurX" };

function mergeAppSettings(prev: AppSettings, patch: Partial<AppSettings>): AppSettings {
  const next: AppSettings = { ...prev };
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "string") next[key] = value;
  }
  return next;
}

export function AppSettingsProvider({ children, initialSettings }: { children: React.ReactNode; initialSettings?: AppSettings }) {
  const [settings, setSettings] = React.useState<AppSettings>({ ...DEFAULT_APP_SETTINGS, ...initialSettings });

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/app-settings", { credentials: "same-origin" });
    const data = (await res.json().catch(() => null)) as any;
    if (res.ok && data?.ok && data?.settings && typeof data.settings === "object") {
      setSettings(data.settings as AppSettings);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Partial<AppSettings>>).detail;
      if (detail && typeof detail === "object" && Object.keys(detail).length > 0) {
        setSettings((prev) => mergeAppSettings(prev, detail));
        return;
      }
      void refresh();
    };
    window.addEventListener("pf:app-settings-updated", handler);
    return () => window.removeEventListener("pf:app-settings-updated", handler);
  }, [refresh]);

  const value = React.useMemo<Ctx>(() => ({ settings, refresh }), [settings, refresh]);
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = React.useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}

/** Use when component may render outside AppSettingsProvider; returns null when outside. */
export function useAppSettingsOptional(): Ctx | null {
  return React.useContext(AppSettingsContext);
}

