"use client";

import * as React from "react";
import { Check, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { t } from "@/lib/admin-t";
import {
  applyThemeToDocument,
  getEffectiveColorScheme,
  getStoredThemeMode,
  getSystemTheme,
  PF_THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/theme-mode";


export default function AppearanceDropdown() {
  const [mode, setMode] = React.useState<ThemeMode>("system");
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    const saved = getStoredThemeMode();
    setMode(saved);
    applyThemeToDocument(saved);
    setMounted(true);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const current = getStoredThemeMode();
      if (current === "system") applyThemeToDocument("system");
    };
    mq?.addEventListener?.("change", onSystemChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== PF_THEME_STORAGE_KEY || e.newValue == null) return;
      const v = e.newValue as ThemeMode;
      if (v === "light" || v === "dark" || v === "system") {
        setMode(v);
        applyThemeToDocument(v);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mq?.removeEventListener?.("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const iconTheme = mounted ? (mode === "system" ? getSystemTheme() : mode) : "light";

  const select = (next: ThemeMode) => {
    if (next === mode) return;
    localStorage.setItem(PF_THEME_STORAGE_KEY, next);
    setMode(next);
    applyThemeToDocument(next);
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("Toggle theme")}>
          {iconTheme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="sr-only">{t("Toggle theme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem onClick={() => select("light")} className="justify-between gap-2">
          {t("Light")}
          {mode === "light" ? <Check className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => select("dark")} className="justify-between gap-2">
          {t("Dark")}
          {mode === "dark" ? <Check className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => select("system")} className="justify-between gap-2">
          <span className="flex flex-col gap-0.5">
            <span>{t("System")}</span>
            {mode === "system" ? (
              <span className="text-xs font-normal text-muted-foreground">
                {getEffectiveColorScheme("system") === "dark" ? t("Using dark (OS)") : t("Using light (OS)")}
              </span>
            ) : null}
          </span>
          {mode === "system" ? <Check className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
