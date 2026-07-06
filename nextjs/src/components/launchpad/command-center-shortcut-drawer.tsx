"use client";

import * as React from "react";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";
import {
  COMMAND_CENTER_SCOPE_COLOR,
  COMMAND_CENTER_SCOPE_ICON,
  type DashboardShortcutOption,
} from "@/lib/launchpad/command-center-shortcut-nav";
import {
  type CommandCenterShortcutDirectory,
  type CommandCenterSubLink,
  loadCommandCenterShortcutDirs,
  newShortcutId,
  saveCommandCenterShortcutDirs,
} from "@/lib/launchpad/command-center-shortcut-prefs";

type DrawerMode = "create" | "edit" | "browse";

function linksFromOption(option: DashboardShortcutOption, selectedHrefs: Set<string>): CommandCenterSubLink[] {
  return option.children
    .filter((child) => selectedHrefs.has(child.href))
    .map((child) => ({
      id: newShortcutId(),
      label: child.label,
      href: child.href,
    }));
}

export function CommandCenterShortcutDrawer({
  open,
  onOpenChange,
  tenantId,
  mode,
  directory,
  dashboardOptions,
  onSaved,
  onEditRequest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  mode: DrawerMode;
  directory: CommandCenterShortcutDirectory | null;
  dashboardOptions: DashboardShortcutOption[];
  onSaved?: () => void;
  onEditRequest?: () => void;
}) {
  const [selectedScope, setSelectedScope] = React.useState("");
  const [selectedHrefs, setSelectedHrefs] = React.useState<Set<string>>(new Set());

  const activeOption = React.useMemo(
    () => dashboardOptions.find((opt) => opt.scope === selectedScope) ?? null,
    [dashboardOptions, selectedScope],
  );

  React.useEffect(() => {
    if (!open) return;

    if (mode === "browse" && directory) {
      setSelectedScope(directory.dashboardScope ?? "");
      setSelectedHrefs(new Set(directory.children.map((c) => c.href)));
      return;
    }

    if (mode === "edit" && directory) {
      const scope = directory.dashboardScope ?? "";
      setSelectedScope(scope);
      setSelectedHrefs(new Set(directory.children.map((c) => c.href)));
      return;
    }

    setSelectedScope("");
    setSelectedHrefs(new Set());
  }, [open, mode, directory]);

  const toggleHref = (href: string, checked: boolean) => {
    setSelectedHrefs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(href);
      else next.delete(href);
      return next;
    });
  };

  const handleScopeChange = (scope: string) => {
    setSelectedScope(scope);
    if (mode === "browse") return;
    const option = dashboardOptions.find((opt) => opt.scope === scope);
    if (option) {
      setSelectedHrefs(new Set(option.children.map((c) => c.href)));
    }
  };

  const handleSave = () => {
    if (!tenantId || !activeOption) return;
    const validChildren = linksFromOption(activeOption, selectedHrefs);
    if (!validChildren.length) return;

    const scope = activeOption.scope;
    const existing = loadCommandCenterShortcutDirs(tenantId);
    const payload: CommandCenterShortcutDirectory = {
      id: directory?.id ?? newShortcutId(),
      label: activeOption.label,
      dashboardScope: scope,
      icon: COMMAND_CENTER_SCOPE_ICON[scope] ?? directory?.icon ?? "folder",
      colorClass: COMMAND_CENTER_SCOPE_COLOR[scope] ?? directory?.colorClass ?? "bg-indigo-500/15 text-indigo-600",
      children: validChildren,
    };

    const next =
      mode === "edit" && directory
        ? existing.map((d) => (d.id === directory.id ? payload : d))
        : [...existing.filter((d) => d.dashboardScope !== scope), payload];

    saveCommandCenterShortcutDirs(tenantId, next);
    onSaved?.();
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!tenantId || !directory) return;
    const next = loadCommandCenterShortcutDirs(tenantId).filter((d) => d.id !== directory.id);
    saveCommandCenterShortcutDirs(tenantId, next);
    onSaved?.();
    onOpenChange(false);
  };

  const isBrowse = mode === "browse" && directory;
  const allSelected =
    activeOption != null &&
    activeOption.children.length > 0 &&
    activeOption.children.every((c) => selectedHrefs.has(c.href));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>
            {isBrowse ? directory.label : mode === "edit" ? t("Edit Shortcuts") : t("Add Shortcuts")}
          </SheetTitle>
          <SheetDescription>
            {isBrowse
              ? t("Open a page below or edit this shortcut group.")
              : t("Choose a dashboard page, then pick the feature pages to include.")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isBrowse ? (
            <div className="space-y-2">
              {directory.children.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No pages selected. Edit to add some.")}</p>
              ) : (
                directory.children.map((child) => (
                  <Link
                    key={child.id}
                    href={child.href}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/40"
                    onClick={() => onOpenChange(false)}
                  >
                    <span>{child.label}</span>
                    <span className="max-w-[140px] truncate text-xs text-muted-foreground">{child.href}</span>
                  </Link>
                ))
              )}
            </div>
          ) : dashboardOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No dashboard pages are available for your account.")}
            </p>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cc-dir-dashboard">{t("Dashboard page")}</Label>
                <Select value={selectedScope || undefined} onValueChange={handleScopeChange}>
                  <SelectTrigger id="cc-dir-dashboard" className="w-full">
                    <SelectValue placeholder={t("Select a dashboard…")} />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboardOptions.map((opt) => (
                      <SelectItem key={opt.scope} value={opt.scope}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeOption ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("Feature pages")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        if (!activeOption) return;
                        if (allSelected) {
                          setSelectedHrefs(new Set());
                        } else {
                          setSelectedHrefs(new Set(activeOption.children.map((c) => c.href)));
                        }
                      }}
                    >
                      {allSelected ? t("Clear all") : t("Select all")}
                    </Button>
                  </div>
                  {activeOption.children.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("No inner pages found for this dashboard.")}
                    </p>
                  ) : (
                    <ul className="max-h-[340px] space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                      {activeOption.children.map((child) => {
                        const checked = selectedHrefs.has(child.href);
                        return (
                          <li key={child.href}>
                            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleHref(child.href, value === true)}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium leading-snug">{child.label}</span>
                                <span className="block truncate text-[11px] text-muted-foreground">{child.href}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-between">
          {mode === "edit" && directory ? (
            <Button type="button" variant="destructive" onClick={handleDelete}>
              {t("Delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            {isBrowse ? (
              <Button type="button" onClick={() => onEditRequest?.()}>
                {t("Edit shortcuts")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                disabled={!tenantId || !activeOption || selectedHrefs.size === 0}
              >
                {t("Save shortcuts")}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CommandCenterAddDirectoryCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-dashed border-border/80 bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/20",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FolderPlus className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="text-[13px] font-medium leading-tight text-foreground">{t("Add Shortcuts")}</span>
    </button>
  );
}
