"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Monitor,
  RefreshCw,
  Save,
  Smartphone,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";

import type {
  CompanyThemeCustomizerField,
  CompanyThemeCustomizerPanel,
  CompanyThemeCustomizerSchema,
} from "@/lib/company-themes/customizer-schema";
import { listCustomizerPanels, listFieldsForPanel } from "@/lib/company-themes/customizer-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import MediaPicker from "@/components/MediaPicker";
import { getImagePath } from "@/utils/image-path";

type PreviewDevice = "desktop" | "tablet" | "mobile";
type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

function previewPathToUrl(path: string, cacheBust?: number): string {
  const base = path === "/" ? "/company-website" : `/company-website${path.endsWith("/") ? path : `${path}/`}`;
  return cacheBust ? `${base}?_=${cacheBust}` : base;
}

function FieldEditor({
  field,
  value,
  disabled,
  onChange,
}: {
  field: CompanyThemeCustomizerField;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.id}`;

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{field.label}</Label>
        <Textarea id={id} value={value} disabled={disabled} rows={3} onChange={(e) => onChange(e.target.value)} />
        {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      </div>
    );
  }

  if (field.type === "color") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{field.label}</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={value || "#c01120"}
            disabled={disabled}
            className="h-10 w-14 p-1"
            onChange={(e) => onChange(e.target.value)}
          />
          <Input id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        </div>
        {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      </div>
    );
  }

  if (field.type === "image") {
    const previewSrc = value ? getImagePath(value) : "";
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{field.label}</Label>
        <div className="flex flex-col gap-3">
          <div className="flex h-24 items-center justify-center rounded-md border bg-muted/30 p-3">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">No image selected</span>
            )}
          </div>
          <MediaPicker
            id={id}
            value={value}
            onChange={(url) => onChange(Array.isArray(url) ? (url[0] ?? "") : String(url ?? ""))}
            placeholder="Select from media library or paste URL"
            showPreview={false}
            disabled={disabled}
          />
        </div>
        {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{field.label}</Label>
      <Input id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
    </div>
  );
}

function PanelListItem({
  panel,
  fieldCount,
  onSelect,
}: {
  panel: CompanyThemeCustomizerPanel;
  fieldCount: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between rounded-none border-b px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium">{panel.label}</p>
        {panel.description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{panel.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <span className="text-xs">{fieldCount}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

export function CompanyWebsiteThemeCustomizer() {
  const [loading, setLoading] = React.useState(true);
  const [schema, setSchema] = React.useState<CompanyThemeCustomizerSchema | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = React.useState<Record<string, string>>({});
  const [canEdit, setCanEdit] = React.useState(false);
  const [activePage, setActivePage] = React.useState("/");
  const [activePanelId, setActivePanelId] = React.useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = React.useState<PreviewDevice>("desktop");
  const [previewKey, setPreviewKey] = React.useState(0);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company-themes/customizer", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not load theme customizer.");
        return;
      }
      const loadedValues = (data.values as Record<string, string>) ?? {};
      setSchema(data.schema as CompanyThemeCustomizerSchema);
      setValues(loadedValues);
      setSavedValues(loadedValues);
      setCanEdit(Boolean(data.canEdit));
      setActivePage((data.schema as CompanyThemeCustomizerSchema).pages[0]?.path ?? "/");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const panels = schema ? listCustomizerPanels(schema, activePage) : [];
  const activePanel = panels.find((p) => p.id === activePanelId) ?? null;
  const panelFields =
    schema && activePanelId ? listFieldsForPanel(schema, activePanelId, activePage) : [];

  const persist = React.useCallback(
    async (nextValues: Record<string, string>) => {
      if (!schema || !canEdit) return;
      setSaveState("saving");
      try {
        const res = await fetch("/api/company-themes/customizer", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: schema.slug, values: nextValues }),
        });
        const data = await res.json().catch(() => null);
        if (!isMountedRef.current) return;
        if (!res.ok || !data?.ok) {
          setSaveState("error");
          toast.error(data?.message ?? "Could not save customizations.");
          return;
        }
        setSavedValues(nextValues);
        setSaveState("saved");
        setPreviewKey((k) => k + 1);
      } catch {
        if (isMountedRef.current) setSaveState("error");
      }
    },
    [schema, canEdit],
  );

  const scheduleSave = React.useCallback(
    (nextValues: Record<string, string>) => {
      if (!canEdit) return;
      setSaveState("pending");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persist(nextValues);
      }, 900);
    },
    [canEdit, persist],
  );

  const updateField = (id: string, next: string) => {
    setValues((prev) => {
      const updated = { ...prev, [id]: next };
      scheduleSave(updated);
      return updated;
    });
  };

  const saveNow = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persist(values);
  };

  const hasUnsavedChanges = React.useMemo(() => {
    const keys = new Set([...Object.keys(values), ...Object.keys(savedValues)]);
    for (const key of keys) {
      if ((values[key] ?? "") !== (savedValues[key] ?? "")) return true;
    }
    return false;
  }, [values, savedValues]);

  React.useEffect(() => {
    setActivePanelId(null);
  }, [activePage]);

  const previewWidth =
    previewDevice === "mobile" ? "max-w-[390px]" : previewDevice === "tablet" ? "max-w-[768px]" : "w-full";

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "pending" || hasUnsavedChanges
        ? "Unsaved changes"
        : saveState === "saved"
          ? "Saved"
          : saveState === "error"
            ? "Save failed"
            : "Up to date";

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading theme customizer…
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="rounded-lg border bg-muted/20 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Select and save a company website theme before using the customizer.
        </p>
        <Button asChild className="mt-4">
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-xs",
              saveState === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {saveLabel}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPreviewKey((k) => k + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh preview
          </Button>
          {canEdit ? (
            <Button size="sm" onClick={() => void saveNow()} disabled={saveState === "saving"}>
              {saveState === "saving" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save changes
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 pt-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border bg-card lg:max-h-[calc(100vh-11rem)]">
          <div className="space-y-3 border-b bg-muted/20 p-4">
            <div>
              <p className="text-sm font-semibold">{schema.name}</p>
              <p className="text-xs text-muted-foreground">Customize sections like WordPress Customizer.</p>
            </div>
            <div className="space-y-2">
              <Label>Preview page</Label>
              <Select value={activePage} onValueChange={setActivePage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schema.pages.map((page) => (
                    <SelectItem key={page.path} value={page.path}>
                      {page.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activePanel ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <button
                type="button"
                className="flex items-center gap-2 border-b px-4 py-3 text-left text-sm font-medium hover:bg-muted/40"
                onClick={() => setActivePanelId(null)}
              >
                <ChevronLeft className="h-4 w-4" />
                {activePanel.label}
              </button>
              <ScrollArea className="flex-1">
                <div className="space-y-5 p-4">
                  {panelFields.map((field) => (
                    <FieldEditor
                      key={field.id}
                      field={field}
                      value={values[field.id] ?? field.defaultValue}
                      disabled={!canEdit}
                      onChange={(next) => updateField(field.id, next)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div>
                {panels.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    Customization panels for this page are coming soon.
                  </p>
                ) : (
                  panels.map((panel) => (
                    <PanelListItem
                      key={panel.id}
                      panel={panel}
                      fieldCount={listFieldsForPanel(schema, panel.id, activePage).length}
                      onSelect={() => setActivePanelId(panel.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </aside>

        <div className="flex min-h-[560px] flex-col rounded-lg border bg-muted/10 lg:max-h-[calc(100vh-11rem)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-sm font-medium">Live preview</p>
            <div className="flex items-center gap-1 rounded-md border bg-background p-1">
              {(
                [
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["mobile", Smartphone],
                ] as const
              ).map(([device, Icon]) => (
                <Button
                  key={device}
                  type="button"
                  size="icon"
                  variant={previewDevice === device ? "default" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setPreviewDevice(device)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-1 justify-center overflow-auto p-4">
            <div
              className={cn(
                "h-[min(78vh,820px)] w-full overflow-hidden rounded-md border bg-background shadow-sm",
                previewWidth,
              )}
            >
              <iframe
                key={`${previewKey}-${activePage}-${previewDevice}`}
                title="Company website preview"
                src={previewPathToUrl(activePage, previewKey || undefined)}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
