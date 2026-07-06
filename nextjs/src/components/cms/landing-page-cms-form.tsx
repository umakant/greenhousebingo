"use client";

import * as React from "react";
import { Eye, GripVertical, Palette, Smartphone, ArrowUpDown, Trash2, Plus, Upload, Settings, Image, X } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { formatPhone, unformatPhone } from "@/lib/phone";
import { t } from "@/lib/admin-t";


type LandingConfigSections = {
  sections?: Record<string, any>;
  section_order?: string[];
  section_visibility?: Record<string, boolean>;
  colors?: { primary?: string; secondary?: string; accent?: string };
};

const DEFAULT_SECTION_ORDER = ["header", "hero", "stats", "features", "modules", "benefits", "gallery", "cta", "footer"];
const COLOR_PRESETS: Array<{
  key: string;
  label: string;
  colors: { primary: string; secondary: string; accent: string };
}> = [
  { key: "green", label: "Green", colors: { primary: "#10b981", secondary: "#059669", accent: "#047857" } },
  { key: "blue", label: "Blue", colors: { primary: "#3b82f6", secondary: "#1d4ed8", accent: "#1e3a8a" } },
  { key: "purple", label: "Purple", colors: { primary: "#8b5cf6", secondary: "#6d28d9", accent: "#4c1d95" } },
  { key: "orange", label: "Orange", colors: { primary: "#f97316", secondary: "#ea580c", accent: "#9a3412" } },
  { key: "red", label: "Red", colors: { primary: "#ef4444", secondary: "#dc2626", accent: "#991b1b" } },
];
const SECTION_LABELS: Record<string, string> = {
  header: "Header",
  hero: "Hero",
  stats: "Stats",
  features: "Features",
  modules: "Modules",
  benefits: "Benefits",
  gallery: "Gallery",
  cta: "CTA",
  footer: "Footer",
};

function normalizeConfig(input: unknown): LandingConfigSections {
  const obj = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const sections =
    obj.sections && typeof obj.sections === "object" && !Array.isArray(obj.sections) ? (obj.sections as Record<string, any>) : {};
  const orderRaw = Array.isArray(obj.section_order) ? (obj.section_order as unknown[]) : [];
  const order = orderRaw.map(String).filter(Boolean);
  const dedup = Array.from(new Set(order.length ? order : DEFAULT_SECTION_ORDER));
  const visibilityRaw =
    obj.section_visibility && typeof obj.section_visibility === "object" && !Array.isArray(obj.section_visibility)
      ? (obj.section_visibility as Record<string, unknown>)
      : {};
  const section_visibility: Record<string, boolean> = {};
  for (const k of DEFAULT_SECTION_ORDER) section_visibility[k] = visibilityRaw[k] === false ? false : true;

  const colorsRaw = obj.colors && typeof obj.colors === "object" && !Array.isArray(obj.colors) ? (obj.colors as Record<string, unknown>) : {};
  const colors = {
    primary: typeof colorsRaw.primary === "string" ? colorsRaw.primary : "#10b981",
    secondary: typeof colorsRaw.secondary === "string" ? colorsRaw.secondary : "#059669",
    accent: typeof colorsRaw.accent === "string" ? colorsRaw.accent : "#f59e0b",
  };

  return { sections, section_order: dedup, section_visibility, colors };
}

function SortableSectionRow({
  id,
  index,
  title,
  enabled,
  onToggle,
}: {
  id: string;
  index: number;
  title: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3",
        isDragging ? "shadow-md ring-2 ring-primary/30 opacity-95" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="h-9 w-9 rounded-md border bg-muted/40 text-muted-foreground flex items-center justify-center cursor-grab active:cursor-grabbing"
          aria-label={t("Drag to reorder")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
          {index}
        </div>

        <div className="leading-tight">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{enabled ? t("Enabled") : t("Disabled")}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">{t("Enable")}</div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

function FileUploadButton({
  onUpload,
  label = "Browse",
  size,
}: {
  onUpload: (file: File) => void | Promise<void>;
  label?: string;
  size?: "sm" | "default" | "icon";
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.currentTarget.value = "";
          if (f) void onUpload(f);
        }}
      />
      <Button type="button" size={size} variant="outline" onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </>
  );
}

export default function LandingPageCmsForm() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  const [companyName, setCompanyName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactAddress, setContactAddress] = React.useState("");

  const [landingPageEnabled, setLandingPageEnabled] = React.useState("1");
  const [enableRegistration, setEnableRegistration] = React.useState("on");
  const [logoDark, setLogoDark] = React.useState("");
  const [logoLight, setLogoLight] = React.useState("");

  const [config, setConfig] = React.useState<LandingConfigSections>(normalizeConfig(null));
  const [advancedJson, setAdvancedJson] = React.useState<string>("{}");
  const [previewMobile, setPreviewMobile] = React.useState(true);
  /** Remount iframe so it reloads after save (or manual refresh). */
  const [previewFrameKey, setPreviewFrameKey] = React.useState(0);
  const previewUrl = "/"; // public landing page

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setOkMsg(null);
      try {
        const res = await fetch("/api/cms/landing-page", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(json?.message || "Failed to load landing page settings.");

        const lps = json?.landingPageSetting;
        if (!cancelled) {
          setCompanyName(String(lps?.companyName ?? ""));
          setContactEmail(String(lps?.contactEmail ?? ""));
          setContactPhone(formatPhone(String(lps?.contactPhone ?? "")));
          setContactAddress(String(lps?.contactAddress ?? ""));
          const cfg = normalizeConfig(lps?.configSections ?? null);
          setConfig(cfg);
          setAdvancedJson(JSON.stringify(lps?.configSections ?? {}, null, 2));

          const admin = json?.adminSettings ?? {};
          setLandingPageEnabled(String(admin.landingPageEnabled ?? "1"));
          setEnableRegistration(String(admin.enableRegistration ?? "on"));
          setLogoDark(String(admin.logoDark ?? ""));
          setLogoLight(String(admin.logoLight ?? ""));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSection = (key: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      section_visibility: { ...(prev.section_visibility ?? {}), [key]: enabled },
    }));
  };

  const updateSection = (key: string, patch: Record<string, unknown>) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...(prev.sections ?? {}),
        [key]: { ...((prev.sections ?? {})[key] ?? {}), ...patch },
      },
    }));
  };

  const setSectionField = (sectionKey: string, field: string, value: unknown) => {
    updateSection(sectionKey, { [field]: value });
  };

  const ensureArray = React.useCallback((v: unknown) => (Array.isArray(v) ? (v as any[]) : []), []);

  const setSectionList = (sectionKey: string, field: string, next: any[]) => {
    setConfig((prev) => {
      const current = ((prev.sections ?? {})[sectionKey] ?? {}) as Record<string, any>;
      return {
        ...prev,
        sections: {
          ...(prev.sections ?? {}),
          [sectionKey]: { ...current, [field]: next },
        },
      };
    });
  };

  const updateListItem = (sectionKey: string, field: string, index: number, patch: Record<string, unknown>) => {
    setConfig((prev) => {
      const current = ((prev.sections ?? {})[sectionKey] ?? {}) as Record<string, any>;
      const list = ensureArray(current[field]);
      const next = list.map((it, i) => (i === index ? { ...(it ?? {}), ...patch } : it));
      return {
        ...prev,
        sections: {
          ...(prev.sections ?? {}),
          [sectionKey]: { ...current, [field]: next },
        },
      };
    });
  };

  const addListItem = (sectionKey: string, field: string, initial: Record<string, unknown>) => {
    setConfig((prev) => {
      const current = ((prev.sections ?? {})[sectionKey] ?? {}) as Record<string, any>;
      const list = ensureArray(current[field]);
      return {
        ...prev,
        sections: {
          ...(prev.sections ?? {}),
          [sectionKey]: { ...current, [field]: [...list, initial] },
        },
      };
    });
  };

  const removeListItem = (sectionKey: string, field: string, index: number) => {
    setConfig((prev) => {
      const current = ((prev.sections ?? {})[sectionKey] ?? {}) as Record<string, any>;
      const list = ensureArray(current[field]);
      return {
        ...prev,
        sections: {
          ...(prev.sections ?? {}),
          [sectionKey]: { ...current, [field]: list.filter((_, i) => i !== index) },
        },
      };
    });
  };

  const sectionData = React.useCallback(
    (key: string) => {
      const s = (config.sections ?? {}) as Record<string, any>;
      return (s[key] ?? {}) as Record<string, any>;
    },
    [config.sections],
  );

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("files[]", file);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) throw new Error(json?.message || "Upload failed.");
    const saved = Array.isArray(json?.files) ? (json.files[0] as string | undefined) : undefined;
    if (!saved) throw new Error("Upload failed.");
    return `/uploads/media/${saved}`;
  };

  const setColor = (k: "primary" | "secondary" | "accent", value: string) => {
    setConfig((prev) => ({
      ...prev,
      colors: { ...(prev.colors ?? {}), [k]: value },
    }));
  };

  const activePresetKey = React.useMemo(() => {
    const primary = (config.colors?.primary ?? "").toLowerCase();
    const secondary = (config.colors?.secondary ?? "").toLowerCase();
    const accent = (config.colors?.accent ?? "").toLowerCase();
    const found = COLOR_PRESETS.find(
      (p) =>
        p.colors.primary.toLowerCase() === primary &&
        p.colors.secondary.toLowerCase() === secondary &&
        p.colors.accent.toLowerCase() === accent,
    );
    return found?.key ?? null;
  }, [config.colors?.accent, config.colors?.primary, config.colors?.secondary]);

  const orderItems = React.useMemo(() => config.section_order ?? DEFAULT_SECTION_ORDER, [config.section_order]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function save() {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const effectiveCompanyName = companyName?.trim() || "PaperFlight";
      const normalized = normalizeConfig(config) as any;
      const sections = { ...(normalized.sections ?? {}) };

      if (sections.hero) {
        const hero = { ...sections.hero };
        if (!hero.highlight_text || hero.highlight_text === "WorkDo Dash") hero.highlight_text = effectiveCompanyName;
        const defaultTitle = `Transform Your Business with ${effectiveCompanyName}`;
        if (!hero.title || hero.title === "Transform Your Business with WorkDo Dash") hero.title = defaultTitle;
        else if (hero.title.includes("WorkDo Dash")) hero.title = hero.title.replace(/\bWorkDo Dash\b/gi, effectiveCompanyName);
        sections.hero = hero;
      }
      if (sections.header) {
        const header = { ...sections.header };
        if (!header.company_name || header.company_name === "WorkDo Dash") header.company_name = effectiveCompanyName;
        sections.header = header;
      }

      const configSections = {
        ...normalized,
        sections,
      };

      // Keep any advanced JSON keys (if user edited in Page tab) by shallow-merging.
      const advRaw = advancedJson.trim();
      if (advRaw) {
        const adv = JSON.parse(advRaw);
        if (adv && typeof adv === "object" && !Array.isArray(adv)) Object.assign(configSections, adv);
      }

      const res = await fetch("/api/cms/landing-page", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactEmail,
          contactPhone: unformatPhone(contactPhone),
          contactAddress,
          configSections,
          adminSettings: {
            landingPageEnabled,
            enableRegistration,
            logoDark,
            logoLight,
          },
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.message || "Save failed.");
      setOkMsg(t("Saved."));
      setPreviewFrameKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t("Loading...")}</div>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {okMsg ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {okMsg}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => window.open(previewUrl, "_blank")}>
          <Eye className="h-4 w-4 mr-2" />
          {t("View Landing Page")}
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? t("Saving...") : t("Save Changes")}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8">
          <Tabs defaultValue="setup">
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto border-b rounded-none">
              {[
                { key: "setup", label: t("Setup") },
                { key: "layout", label: t("Layout") },
                { key: "content", label: t("Content") },
                { key: "social", label: t("Social") },
                { key: "engagement", label: t("Engagement") },
                { key: "page", label: t("Page") },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="rounded-none data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="setup" className="mt-4">
              <Tabs defaultValue="general">
                <TabsList className="bg-transparent p-0 h-auto gap-2">
                  <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("General")}
                  </TabsTrigger>
                  <TabsTrigger value="order" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Order")}
                  </TabsTrigger>
                  <TabsTrigger value="colors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Colors")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center font-semibold text-muted-foreground">
                          T
                        </div>
                        <div>
                          <div>{t("Company Information")}</div>
                          <CardDescription>{t("Basic company details for your landing page")}</CardDescription>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Company Name")}</div>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Contact Email")}</div>
                        <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Contact Phone")}</div>
                        <Input
                          value={contactPhone}
                          onChange={(e) => setContactPhone(formatPhone(e.target.value))}
                          placeholder="(000) 000-0000"
                        />
                        <div className="text-xs text-muted-foreground">{t("Format : (000) 000 0000")}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Contact Address")}</div>
                        <Input value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="order" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        {t("Section Order")}
                      </CardTitle>
                      <CardDescription>{t("Drag and drop to reorder sections on your landing page")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                          const { active, over } = event;
                          if (!over) return;
                          if (active.id === over.id) return;
                          const oldIndex = orderItems.indexOf(String(active.id));
                          const newIndex = orderItems.indexOf(String(over.id));
                          if (oldIndex < 0 || newIndex < 0) return;
                          const next = arrayMove(orderItems, oldIndex, newIndex);
                          setConfig((prev) => ({ ...prev, section_order: next }));
                        }}
                      >
                        <SortableContext items={orderItems} strategy={verticalListSortingStrategy}>
                          <div className="space-y-3">
                            {orderItems.map((key, idx) => {
                              const enabled = (config.section_visibility?.[key] ?? true) !== false;
                              return (
                                <SortableSectionRow
                                  key={key}
                                  id={key}
                                  index={idx + 1}
                                  title={SECTION_LABELS[key] ?? key}
                                  enabled={enabled}
                                  onToggle={(v) => toggleSection(key, v)}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="colors" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>{t("Color Settings")}</CardTitle>
                      <CardDescription>{t("Customize the colors for your landing page theme.")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {(
                          [
                            { key: "primary", label: t("Primary Color") },
                            { key: "secondary", label: t("Secondary Color") },
                            { key: "accent", label: t("Accent Color") },
                          ] as const
                        ).map((item) => {
                          const k = item.key;
                          const value = (config.colors?.[k] as string) ?? "#000000";
                          return (
                            <div key={k} className="space-y-2">
                              <div className="text-sm font-medium">{item.label}</div>
                              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                                <input
                                  type="color"
                                  value={value}
                                  onChange={(e) => setColor(k, e.target.value)}
                                  className="h-7 w-10 rounded border border-input bg-background p-0"
                                  aria-label={item.label}
                                />
                                <Input
                                  value={value}
                                  onChange={(e) => setColor(k, e.target.value)}
                                  className="border-0 shadow-none focus-visible:ring-0 px-0 h-7"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">{t("Color Presets")}</div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                          {COLOR_PRESETS.map((p) => {
                            const selected = activePresetKey === p.key;
                            return (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => {
                                  setConfig((prev) => ({
                                    ...prev,
                                    colors: { ...(prev.colors ?? {}), ...p.colors },
                                  }));
                                }}
                                className={[
                                  "rounded-xl border bg-background px-4 py-3 text-left transition",
                                  selected ? "border-primary shadow-sm ring-2 ring-primary/20" : "hover:border-primary/40 hover:shadow-sm",
                                ].join(" ")}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.colors.primary }} />
                                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.colors.secondary }} />
                                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.colors.accent }} />
                                </div>
                                <div className="mt-2 text-xs font-medium text-muted-foreground">{p.label}</div>
                                {selected ? <div className="mt-1 h-1 w-1 rounded-full bg-primary mx-auto" /> : <div className="mt-1 h-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="layout" className="mt-4">
              <Tabs defaultValue="header">
                <TabsList className="bg-transparent p-0 h-auto gap-2">
                  <TabsTrigger value="header" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Header")}
                  </TabsTrigger>
                  <TabsTrigger value="hero" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Hero")}
                  </TabsTrigger>
                  <TabsTrigger value="footer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Footer")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Header Navigation")}</CardTitle>
                          <CardDescription>{t("Logo and navigation menu")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch
                            checked={(config.section_visibility?.header ?? true) !== false}
                            onCheckedChange={(v) => toggleSection("header", v)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Header Variant")}</div>
                        <select
                          value={sectionData("header")?.variant ?? "header1"}
                          onChange={(e) => setSectionField("header", "variant", e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="header1">{t("Standard")}</option>
                          <option value="header2">{t("Centered")}</option>
                          <option value="header3">{t("Glass")}</option>
                          <option value="header4">{t("Transparent")}</option>
                          <option value="header5">{t("Gradient")}</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Company Name")}</div>
                          <Input
                            value={String(sectionData("header")?.company_name ?? "")}
                            onChange={(e) => setSectionField("header", "company_name", e.target.value)}
                            placeholder={t("WorkDo Dash")}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("CTA Button Text")}</div>
                          <Input
                            value={String(sectionData("header")?.cta_text ?? "")}
                            onChange={(e) => setSectionField("header", "cta_text", e.target.value)}
                            placeholder={t("Get Started")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Display Options")}</div>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 rounded-lg border bg-muted/10 p-4">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={(sectionData("header")?.enable_addon_link ?? true) !== false}
                              onCheckedChange={(v) => setSectionField("header", "enable_addon_link", v)}
                            />
                            <div className="text-sm">{t("Enable Addon Link")}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={(sectionData("header")?.enable_pricing_link ?? true) !== false}
                              onCheckedChange={(v) => setSectionField("header", "enable_pricing_link", v)}
                            />
                            <div className="text-sm">{t("Enable Pricing Link")}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{t("Navigation Menu")}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const items = Array.isArray(sectionData("header")?.navigation_items)
                                ? [...sectionData("header").navigation_items]
                                : [];
                              items.push({ text: `Item ${items.length + 1}`, href: "#", target: "" });
                              setSectionField("header", "navigation_items", items);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Add Item")}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {(Array.isArray(sectionData("header")?.navigation_items) ? sectionData("header").navigation_items : []).map(
                            (it: any, idx: number) => (
                              <div key={idx} className="rounded-lg border bg-background p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-sm font-medium">{t("Item")} {idx + 1}</div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => {
                                      const items = [...sectionData("header").navigation_items];
                                      items.splice(idx, 1);
                                      setSectionField("header", "navigation_items", items);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">{t("Menu Text")}</div>
                                    <Input
                                      value={String(it?.text ?? "")}
                                      onChange={(e) => {
                                        const items = [...sectionData("header").navigation_items];
                                        items[idx] = { ...(items[idx] ?? {}), text: e.target.value };
                                        setSectionField("header", "navigation_items", items);
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">{t("Menu Link")}</div>
                                    <Input
                                      value={String(it?.href ?? "")}
                                      onChange={(e) => {
                                        const items = [...sectionData("header").navigation_items];
                                        items[idx] = { ...(items[idx] ?? {}), href: e.target.value };
                                        setSectionField("header", "navigation_items", items);
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">{t("Target")}</div>
                                    <select
                                      value={String(it?.target ?? "")}
                                      onChange={(e) => {
                                        const items = [...sectionData("header").navigation_items];
                                        items[idx] = { ...(items[idx] ?? {}), target: e.target.value };
                                        setSectionField("header", "navigation_items", items);
                                      }}
                                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                                    >
                                      <option value="">{t("Same Tab")}</option>
                                      <option value="_blank">{t("New Tab")}</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="hero" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Hero Content")}</CardTitle>
                          <CardDescription>{t("Main headline and supporting text")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.hero ?? true) !== false} onCheckedChange={(v) => toggleSection("hero", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Hero Variant")}</div>
                        <select
                          value={sectionData("hero")?.variant ?? "hero1"}
                          onChange={(e) => setSectionField("hero", "variant", e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="hero1">{t("Image Left Split")}</option>
                          <option value="hero2">{t("Centered Split")}</option>
                          <option value="hero3">{t("Background Image")}</option>
                          <option value="hero4">{t("Minimal")}</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Hero Title")}</div>
                        <Input value={String(sectionData("hero")?.title ?? "")} onChange={(e) => setSectionField("hero", "title", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Hero Subtitle")}</div>
                        <textarea
                          value={String(sectionData("hero")?.subtitle ?? "")}
                          onChange={(e) => setSectionField("hero", "subtitle", e.target.value)}
                          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Primary Button Text")}</div>
                          <Input
                            value={String(sectionData("hero")?.primary_button_text ?? "")}
                            onChange={(e) => setSectionField("hero", "primary_button_text", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Primary Button Link")}</div>
                          <Input
                            value={String(sectionData("hero")?.primary_button_link ?? "")}
                            onChange={(e) => setSectionField("hero", "primary_button_link", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Secondary Button Text")}</div>
                          <Input
                            value={String(sectionData("hero")?.secondary_button_text ?? "")}
                            onChange={(e) => setSectionField("hero", "secondary_button_text", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Secondary Button Link")}</div>
                          <Input
                            value={String(sectionData("hero")?.secondary_button_link ?? "")}
                            onChange={(e) => setSectionField("hero", "secondary_button_link", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Hero Image")}</div>
                        <div className="flex items-center gap-2">
                          <Input value={String(sectionData("hero")?.image ?? "")} readOnly />
                          <FileUploadButton
                            label={t("Browse")}
                            onUpload={async (f) => {
                              try {
                                const url = await uploadImage(f);
                                setSectionField("hero", "image", url);
                              } catch (err: any) {
                                setError(err?.message || "Upload failed.");
                              }
                            }}
                          />
                          <Button type="button" variant="outline" onClick={() => setSectionField("hero", "image", "")}>
                            {t("X")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="footer" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Footer")}</CardTitle>
                          <CardDescription>{t("Footer layout, links and newsletter")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.footer ?? true) !== false} onCheckedChange={(v) => toggleSection("footer", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Footer Variant")}</div>
                        <select
                          value={sectionData("footer")?.variant ?? "footer1"}
                          onChange={(e) => setSectionField("footer", "variant", e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="footer1">{t("Standard")}</option>
                          <option value="footer2">{t("Minimal")}</option>
                          <option value="footer3">{t("Centered")}</option>
                          <option value="footer4">{t("Split")}</option>
                          <option value="footer5">{t("Modern")}</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Description")}</div>
                        <textarea
                          value={String(sectionData("footer")?.description ?? "")}
                          onChange={(e) => setSectionField("footer", "description", e.target.value)}
                          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Newsletter Title")}</div>
                          <Input
                            value={String(sectionData("footer")?.newsletter_title ?? "")}
                            onChange={(e) => setSectionField("footer", "newsletter_title", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Newsletter Description")}</div>
                          <Input
                            value={String(sectionData("footer")?.newsletter_description ?? "")}
                            onChange={(e) => setSectionField("footer", "newsletter_description", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Newsletter Button Text")}</div>
                          <Input
                            value={String(sectionData("footer")?.newsletter_button_text ?? "")}
                            onChange={(e) => setSectionField("footer", "newsletter_button_text", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Copyright Text")}</div>
                          <Input
                            value={String(sectionData("footer")?.copyright_text ?? "")}
                            onChange={(e) => setSectionField("footer", "copyright_text", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="content" className="mt-4">
              <Tabs defaultValue="features">
                <TabsList className="bg-transparent p-0 h-auto gap-2">
                  {[
                    { key: "features", label: t("Features") },
                    { key: "modules", label: t("Modules") },
                    { key: "benefits", label: t("Benefits") },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="stats" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Stats")}</CardTitle>
                          <CardDescription>{t("Numbers section (title + items).")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.stats ?? true) !== false} onCheckedChange={(v) => toggleSection("stats", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Variant")}</div>
                          <select
                            value={sectionData("stats")?.variant ?? "stats1"}
                            onChange={(e) => setSectionField("stats", "variant", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="stats1">{t("Classic")}</option>
                            <option value="stats2">{t("Cards")}</option>
                            <option value="stats3">{t("Centered")}</option>
                            <option value="stats4">{t("Minimal")}</option>
                            <option value="stats5">{t("Modern")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Title")}</div>
                          <Input value={String(sectionData("stats")?.title ?? "")} onChange={(e) => setSectionField("stats", "title", e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Subtitle")}</div>
                          <Input value={String(sectionData("stats")?.subtitle ?? "")} onChange={(e) => setSectionField("stats", "subtitle", e.target.value)} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium">{t("Items")}</div>
                        <Button type="button" size="sm" variant="outline" onClick={() => addListItem("stats", "stats", { label: "", value: "" })}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Item")}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {ensureArray(sectionData("stats")?.stats).map((it: any, idx: number) => (
                          <div key={idx} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">
                                {t("Stat")} #{idx + 1}
                              </div>
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("stats", "stats", idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Label")}</div>
                                <Input value={String(it?.label ?? "")} onChange={(e) => updateListItem("stats", "stats", idx, { label: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Value")}</div>
                                <Input value={String(it?.value ?? "")} onChange={(e) => updateListItem("stats", "stats", idx, { value: e.target.value })} placeholder="10k+" />
                              </div>
                            </div>
                          </div>
                        ))}
                        {ensureArray(sectionData("stats")?.stats).length === 0 ? (
                          <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{t("No items yet.")}</div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="features" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Features")}</CardTitle>
                          <CardDescription>{t("Feature list with title/description/icon.")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch
                            checked={(config.section_visibility?.features ?? true) !== false}
                            onCheckedChange={(v) => toggleSection("features", v)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Variant")}</div>
                          <select
                            value={sectionData("features")?.variant ?? "features1"}
                            onChange={(e) => setSectionField("features", "variant", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="features1">{t("Grid")}</option>
                            <option value="features2">{t("Cards")}</option>
                            <option value="features3">{t("Centered")}</option>
                            <option value="features4">{t("Minimal")}</option>
                            <option value="features5">{t("Modern")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Title")}</div>
                          <Input value={String(sectionData("features")?.title ?? "")} onChange={(e) => setSectionField("features", "title", e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Subtitle")}</div>
                          <Input value={String(sectionData("features")?.subtitle ?? "")} onChange={(e) => setSectionField("features", "subtitle", e.target.value)} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium">{t("Items")}</div>
                        <Button type="button" size="sm" variant="outline" onClick={() => addListItem("features", "features", { title: "", description: "", icon: "Building2" })}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Feature")}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {ensureArray(sectionData("features")?.features).map((it: any, idx: number) => (
                          <div key={idx} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">
                                {t("Feature")} #{idx + 1}
                              </div>
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("features", "features", idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Title")}</div>
                                <Input value={String(it?.title ?? "")} onChange={(e) => updateListItem("features", "features", idx, { title: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Icon (key)")}</div>
                                <Input value={String(it?.icon ?? "")} onChange={(e) => updateListItem("features", "features", idx, { icon: e.target.value })} placeholder="FolderOpen" />
                                <div className="text-xs text-muted-foreground">{t("Example: FolderOpen, Calculator, UserCheck, Users, CreditCard, Package.")}</div>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <div className="text-sm font-medium">{t("Description")}</div>
                                <textarea
                                  value={String(it?.description ?? "")}
                                  onChange={(e) => updateListItem("features", "features", idx, { description: e.target.value })}
                                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {ensureArray(sectionData("features")?.features).length === 0 ? (
                          <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{t("No items yet.")}</div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="modules" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Modules")}</CardTitle>
                          <CardDescription>{t("Modules grid (title/description/image).")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.modules ?? true) !== false} onCheckedChange={(v) => toggleSection("modules", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Variant")}</div>
                          <select
                            value={sectionData("modules")?.variant ?? "modules1"}
                            onChange={(e) => setSectionField("modules", "variant", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="modules1">{t("Grid")}</option>
                            <option value="modules2">{t("Cards")}</option>
                            <option value="modules3">{t("Centered")}</option>
                            <option value="modules4">{t("Minimal")}</option>
                            <option value="modules5">{t("Modern")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Title")}</div>
                          <Input value={String(sectionData("modules")?.title ?? "")} onChange={(e) => setSectionField("modules", "title", e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Subtitle")}</div>
                          <Input value={String(sectionData("modules")?.subtitle ?? "")} onChange={(e) => setSectionField("modules", "subtitle", e.target.value)} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium">{t("Items")}</div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addListItem("modules", "modules", { key: "", label: "", title: "", description: "", image: "" })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Module")}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {ensureArray(sectionData("modules")?.modules).map((it: any, idx: number) => (
                          <div key={idx} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">
                                {t("Module")} #{idx + 1}
                              </div>
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("modules", "modules", idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Key")}</div>
                                <Input value={String(it?.key ?? "")} onChange={(e) => updateListItem("modules", "modules", idx, { key: e.target.value })} placeholder="taskly" />
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Tab Label")}</div>
                                <Input value={String(it?.label ?? "")} onChange={(e) => updateListItem("modules", "modules", idx, { label: e.target.value })} placeholder="Project" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <div className="text-sm font-medium">{t("Title")}</div>
                                <Input value={String(it?.title ?? "")} onChange={(e) => updateListItem("modules", "modules", idx, { title: e.target.value })} />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <div className="text-sm font-medium">{t("Description")}</div>
                                <textarea
                                  value={String(it?.description ?? "")}
                                  onChange={(e) => updateListItem("modules", "modules", idx, { description: e.target.value })}
                                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Image")}</div>
                                <div className="flex items-center gap-2">
                                  <Input value={String(it?.image ?? "")} onChange={(e) => updateListItem("modules", "modules", idx, { image: e.target.value })} placeholder="/uploads/media/..." />
                                  <FileUploadButton
                                    size="sm"
                                    label={t("Upload")}
                                    onUpload={async (f) => {
                                      try {
                                        const url = await uploadImage(f);
                                        updateListItem("modules", "modules", idx, { image: url });
                                      } catch (err: any) {
                                        setError(err?.message || "Upload failed.");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end">
                                {String(it?.image ?? "") ? (
                                  <img src={String(it?.image)} alt="" className="h-14 w-14 rounded-md object-cover border" />
                                ) : (
                                  <div className="h-14 w-14 rounded-md border bg-muted/20" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {ensureArray(sectionData("modules")?.modules).length === 0 ? (
                          <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{t("No items yet.")}</div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="benefits" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Benefits")}</CardTitle>
                          <CardDescription>{t("Benefits list (title/description).")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.benefits ?? true) !== false} onCheckedChange={(v) => toggleSection("benefits", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Variant")}</div>
                          <select
                            value={sectionData("benefits")?.variant ?? "benefits1"}
                            onChange={(e) => setSectionField("benefits", "variant", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="benefits1">{t("Classic")}</option>
                            <option value="benefits2">{t("Cards")}</option>
                            <option value="benefits3">{t("Centered")}</option>
                            <option value="benefits4">{t("Minimal")}</option>
                            <option value="benefits5">{t("Modern")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Title")}</div>
                          <Input value={String(sectionData("benefits")?.title ?? "")} onChange={(e) => setSectionField("benefits", "title", e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Subtitle")}</div>
                          <Input value={String(sectionData("benefits")?.subtitle ?? "")} onChange={(e) => setSectionField("benefits", "subtitle", e.target.value)} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium">{t("Items")}</div>
                        <Button type="button" size="sm" variant="outline" onClick={() => addListItem("benefits", "benefits", { title: "", description: "" })}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Benefit")}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {ensureArray(sectionData("benefits")?.benefits).map((it: any, idx: number) => (
                          <div key={idx} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">
                                {t("Benefit")} #{idx + 1}
                              </div>
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("benefits", "benefits", idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Title")}</div>
                                <Input value={String(it?.title ?? "")} onChange={(e) => updateListItem("benefits", "benefits", idx, { title: e.target.value })} />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <div className="text-sm font-medium">{t("Description")}</div>
                                <textarea
                                  value={String(it?.description ?? "")}
                                  onChange={(e) => updateListItem("benefits", "benefits", idx, { description: e.target.value })}
                                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {ensureArray(sectionData("benefits")?.benefits).length === 0 ? (
                          <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{t("No items yet.")}</div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="gallery" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Gallery")}</CardTitle>
                          <CardDescription>{t("Gallery images.")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.gallery ?? true) !== false} onCheckedChange={(v) => toggleSection("gallery", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Variant")}</div>
                          <select
                            value={sectionData("gallery")?.variant ?? "gallery1"}
                            onChange={(e) => setSectionField("gallery", "variant", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="gallery1">{t("Grid")}</option>
                            <option value="gallery2">{t("Masonry")}</option>
                            <option value="gallery3">{t("Centered")}</option>
                            <option value="gallery4">{t("Minimal")}</option>
                            <option value="gallery5">{t("Modern")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Title")}</div>
                          <Input value={String(sectionData("gallery")?.title ?? "")} onChange={(e) => setSectionField("gallery", "title", e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Subtitle")}</div>
                          <Input value={String(sectionData("gallery")?.subtitle ?? "")} onChange={(e) => setSectionField("gallery", "subtitle", e.target.value)} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium">{t("Images")}</div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSectionList("gallery", "images", [...ensureArray(sectionData("gallery")?.images).map(String), ""])}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Add Image")}
                          </Button>
                          <FileUploadButton
                            size="sm"
                            label={t("Upload")}
                            onUpload={async (f) => {
                              try {
                                const url = await uploadImage(f);
                                setSectionList("gallery", "images", [...ensureArray(sectionData("gallery")?.images).map(String), url]);
                              } catch (err: any) {
                                setError(err?.message || "Upload failed.");
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        {ensureArray(sectionData("gallery")?.images).map((it: any, idx: number) => (
                          <div key={idx} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">
                                {t("Image")} #{idx + 1}
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setSectionList(
                                    "gallery",
                                    "images",
                                    ensureArray(sectionData("gallery")?.images)
                                      .map(String)
                                      .filter((_, i) => i !== idx),
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Source")}</div>
                                <Input
                                  value={String(it ?? "")}
                                  onChange={(e) => {
                                    const next = ensureArray(sectionData("gallery")?.images).map(String);
                                    next[idx] = e.target.value;
                                    setSectionList("gallery", "images", next);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm font-medium">{t("Preview")}</div>
                                <div className="h-10 rounded-md border bg-muted/20 flex items-center px-3 text-xs text-muted-foreground">
                                  {t("Gallery uses image URLs only (Laravel parity).")}
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                {String(it ?? "") ? (
                                  <img src={String(it ?? "")} alt="" className="h-36 w-full rounded-md object-contain border bg-white" />
                                ) : (
                                  <div className="h-36 w-full rounded-md border bg-muted/20" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {ensureArray(sectionData("gallery")?.images).length === 0 ? (
                          <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{t("No images yet.")}</div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cta" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("CTA")}</CardTitle>
                          <CardDescription>{t("Call to action block.")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.cta ?? true) !== false} onCheckedChange={(v) => toggleSection("cta", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Variant")}</div>
                          <select
                            value={sectionData("cta")?.variant ?? "cta1"}
                            onChange={(e) => setSectionField("cta", "variant", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="cta1">{t("Split")}</option>
                            <option value="cta2">{t("Centered")}</option>
                            <option value="cta3">{t("Minimal")}</option>
                            <option value="cta4">{t("Gradient")}</option>
                            <option value="cta5">{t("Modern")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Title")}</div>
                          <Input value={String(sectionData("cta")?.title ?? "")} onChange={(e) => setSectionField("cta", "title", e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">{t("Subtitle")}</div>
                          <Input value={String(sectionData("cta")?.subtitle ?? "")} onChange={(e) => setSectionField("cta", "subtitle", e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Primary Button Text")}</div>
                          <Input
                            value={String(sectionData("cta")?.primary_button ?? "")}
                            onChange={(e) => setSectionField("cta", "primary_button", e.target.value)}
                            placeholder={t("Get Started")}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Primary Button Link")}</div>
                          <Input
                            value={String(sectionData("cta")?.primary_button_link ?? "")}
                            onChange={(e) => setSectionField("cta", "primary_button_link", e.target.value)}
                            placeholder="/register"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Secondary Button Text")}</div>
                          <Input
                            value={String(sectionData("cta")?.secondary_button ?? "")}
                            onChange={(e) => setSectionField("cta", "secondary_button", e.target.value)}
                            placeholder={t("Learn More")}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Secondary Button Link")}</div>
                          <Input
                            value={String(sectionData("cta")?.secondary_button_link ?? "")}
                            onChange={(e) => setSectionField("cta", "secondary_button_link", e.target.value)}
                            placeholder="#features"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Image (optional)")}</div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={String(sectionData("cta")?.image ?? "")}
                              onChange={(e) => setSectionField("cta", "image", e.target.value)}
                              placeholder="/uploads/media/..."
                            />
                            <FileUploadButton
                              size="sm"
                              label={t("Upload")}
                              onUpload={async (f) => {
                                try {
                                  const url = await uploadImage(f);
                                  setSectionField("cta", "image", url);
                                } catch (err: any) {
                                  setError(err?.message || "Upload failed.");
                                }
                              }}
                            />
                            <Button type="button" size="sm" variant="outline" onClick={() => setSectionField("cta", "image", "")}>
                              {t("Clear")}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          {String(sectionData("cta")?.image ?? "") ? (
                            <img src={String(sectionData("cta")?.image ?? "")} alt="" className="h-14 w-14 rounded-md object-cover border" />
                          ) : (
                            <div className="h-14 w-14 rounded-md border bg-muted/20" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="social" className="mt-4">
              <Tabs defaultValue="links">
                <TabsList className="bg-transparent p-0 h-auto gap-2">
                  <TabsTrigger value="links" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Social Links")}
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Stats")}
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Gallery")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="links" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>{t("Social Media Links")}</CardTitle>
                          <CardDescription>{t("Social icons displayed in the footer. Supported: twitter, linkedin, instagram, youtube, facebook.")}</CardDescription>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addListItem("social", "links", { platform: "twitter", url: "", enabled: true })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Link")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {ensureArray(sectionData("social")?.links).length === 0 ? (
                        <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                          {t("No social links yet. Add one above.")}
                        </div>
                      ) : null}
                      {ensureArray(sectionData("social")?.links).map((link: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">{t("Link")} #{idx + 1}</div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={link?.enabled !== false}
                                onCheckedChange={(v) => updateListItem("social", "links", idx, { enabled: v })}
                              />
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("social", "links", idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <div className="text-sm font-medium">{t("Platform")}</div>
                              <select
                                value={String(link?.platform ?? "twitter")}
                                onChange={(e) => updateListItem("social", "links", idx, { platform: e.target.value })}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                              >
                                <option value="twitter">{t("Twitter / X")}</option>
                                <option value="linkedin">{t("LinkedIn")}</option>
                                <option value="instagram">{t("Instagram")}</option>
                                <option value="youtube">{t("YouTube")}</option>
                                <option value="facebook">{t("Facebook")}</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm font-medium">{t("URL")}</div>
                              <Input
                                value={String(link?.url ?? "")}
                                onChange={(e) => updateListItem("social", "links", idx, { url: e.target.value })}
                                placeholder="https://twitter.com/yourhandle"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="stats" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Settings className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle>{t("Statistics Section")}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t("Key business metrics and numbers")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.stats ?? true) !== false} onCheckedChange={(v) => toggleSection("stats", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Stats Variant")}</div>
                        <select
                          value={sectionData("stats")?.variant ?? "stats1"}
                          onChange={(e) => setSectionField("stats", "variant", e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="stats1">{t("Colored Background")}</option>
                          <option value="stats2">{t("Cards")}</option>
                          <option value="stats3">{t("Minimal")}</option>
                          <option value="stats4">{t("Circular")}</option>
                          <option value="stats5">{t("Gradient")}</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-medium">{t("Statistics")}</div>
                          <Button type="button" size="sm" variant="outline" onClick={() => addListItem("stats", "stats", { label: "", value: "" })}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Add Statistic")}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {ensureArray(sectionData("stats")?.stats).map((it: any, idx: number) => {
                            const total = ensureArray(sectionData("stats")?.stats).length;
                            const disableDelete = total <= 1;
                            return (
                              <div key={idx} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-semibold">
                                    {t("Item")} {idx + 1}
                                  </div>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={disableDelete}
                                    onClick={() => !disableDelete && removeListItem("stats", "stats", idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <div className="text-sm font-medium">{t("Label")} *</div>
                                    <Input value={String(it?.label ?? "")} onChange={(e) => updateListItem("stats", "stats", idx, { label: e.target.value })} placeholder={t("Stat label")} />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="text-sm font-medium">{t("Value")} *</div>
                                    <Input value={String(it?.value ?? "")} onChange={(e) => updateListItem("stats", "stats", idx, { value: e.target.value })} placeholder={t("Stat value")} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="gallery" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Image className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <CardTitle>{t("Image Gallery")}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t("Product showcase slider")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                          <Switch checked={(config.section_visibility?.gallery ?? true) !== false} onCheckedChange={(v) => toggleSection("gallery", v)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Gallery Variant")}</div>
                        <select
                          value={sectionData("gallery")?.variant ?? "gallery1"}
                          onChange={(e) => setSectionField("gallery", "variant", e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="gallery1">{t("Slider")}</option>
                          <option value="gallery2">{t("Grid")}</option>
                          <option value="gallery3">{t("Stacked")}</option>
                          <option value="gallery4">{t("Carousel")}</option>
                          <option value="gallery5">{t("Lightbox")}</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Section Title")}</div>
                        <Input value={String(sectionData("gallery")?.title ?? "")} onChange={(e) => setSectionField("gallery", "title", e.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Section Subtitle")}</div>
                        <Input value={String(sectionData("gallery")?.subtitle ?? "")} onChange={(e) => setSectionField("gallery", "subtitle", e.target.value)} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-medium">{t("Gallery Images")}</div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSectionList("gallery", "images", [...ensureArray(sectionData("gallery")?.images).map(String), ""])}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Add Image")}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {ensureArray(sectionData("gallery")?.images).map((img: any, idx: number) => {
                            const value = String(img ?? "");
                            const total = ensureArray(sectionData("gallery")?.images).length;
                            const disableDelete = total <= 1;
                            return (
                              <div key={idx} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-semibold">
                                    {t("Item")} {idx + 1}
                                  </div>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={disableDelete}
                                    onClick={() => {
                                      if (disableDelete) return;
                                      setSectionList(
                                        "gallery",
                                        "images",
                                        ensureArray(sectionData("gallery")?.images)
                                          .map(String)
                                          .filter((_, i) => i !== idx),
                                      );
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-sm font-medium">{t("Image")} *</div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={value}
                                      onChange={(e) => {
                                        const next = ensureArray(sectionData("gallery")?.images).map(String);
                                        next[idx] = e.target.value;
                                        setSectionList("gallery", "images", next);
                                      }}
                                      placeholder={t("Select image...")}
                                    />
                                    <FileUploadButton
                                      size="sm"
                                      label={t("Browse")}
                                      onUpload={async (f) => {
                                        try {
                                          const url = await uploadImage(f);
                                          const next = ensureArray(sectionData("gallery")?.images).map(String);
                                          next[idx] = url;
                                          setSectionList("gallery", "images", next);
                                        } catch (err: any) {
                                          setError(err?.message || "Upload failed.");
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      onClick={() => {
                                        const next = ensureArray(sectionData("gallery")?.images).map(String);
                                        next[idx] = "";
                                        setSectionList("gallery", "images", next);
                                      }}
                                      aria-label={t("Clear")}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="engagement" className="mt-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <ArrowUpDown className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle>{t("Call to Action")}</CardTitle>
                        <p className="text-sm text-muted-foreground">{t("Final conversion section")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">{t("Enable Section")}</div>
                      <Switch checked={(config.section_visibility?.cta ?? true) !== false} onCheckedChange={(v) => toggleSection("cta", v)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t("CTA Variant")}</div>
                    <select
                      value={sectionData("cta")?.variant ?? "cta1"}
                      onChange={(e) => setSectionField("cta", "variant", e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="cta1">{t("Centered")}</option>
                      <option value="cta2">{t("Split")}</option>
                      <option value="cta3">{t("Card")}</option>
                      <option value="cta4">{t("Gradient")}</option>
                      <option value="cta5">{t("Minimal")}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t("Main Title")}</div>
                    <Input value={String(sectionData("cta")?.title ?? "")} onChange={(e) => setSectionField("cta", "title", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t("Subtitle")}</div>
                    <textarea
                      value={String(sectionData("cta")?.subtitle ?? "")}
                      onChange={(e) => setSectionField("cta", "subtitle", e.target.value)}
                      className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{t("Primary Button Text")}</div>
                      <Input value={String(sectionData("cta")?.primary_button ?? "")} onChange={(e) => setSectionField("cta", "primary_button", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{t("Secondary Button Text")}</div>
                      <Input value={String(sectionData("cta")?.secondary_button ?? "")} onChange={(e) => setSectionField("cta", "secondary_button", e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{t("Primary Button Link")}</div>
                      <Input value={String(sectionData("cta")?.primary_button_link ?? "")} onChange={(e) => setSectionField("cta", "primary_button_link", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{t("Secondary Button Link")}</div>
                      <Input value={String(sectionData("cta")?.secondary_button_link ?? "")} onChange={(e) => setSectionField("cta", "secondary_button_link", e.target.value)} />
                    </div>
                  </div>

                  {(sectionData("cta")?.variant ?? "cta1") === "cta2" ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{t("CTA Image (Split Layout)")}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={String(sectionData("cta")?.image ?? "")}
                          onChange={(e) => setSectionField("cta", "image", e.target.value)}
                          placeholder="/uploads/media/..."
                        />
                        <FileUploadButton
                          size="sm"
                          label={t("Browse")}
                          onUpload={async (f) => {
                            try {
                              const url = await uploadImage(f);
                              setSectionField("cta", "image", url);
                            } catch (err: any) {
                              setError(err?.message || "Upload failed.");
                            }
                          }}
                        />
                        <Button type="button" size="icon" variant="outline" onClick={() => setSectionField("cta", "image", "")} aria-label={t("Clear")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="page" className="mt-4">
              <Tabs defaultValue="addon">
                <TabsList className="bg-transparent p-0 h-auto gap-2">
                  <TabsTrigger value="addon" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Addon")}
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {t("Pricing")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="addon" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>{t("Add-Ons Page Settings")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Page Title")}</div>
                          <Input
                            value={String(sectionData("addons")?.title ?? "Premium Addons")}
                            onChange={(e) => setSectionField("addons", "title", e.target.value)}
                            placeholder={t("Enter page title")}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Card Variant")}</div>
                          <select
                            value={String(sectionData("addons")?.card_variant ?? "card1")}
                            onChange={(e) => setSectionField("addons", "card_variant", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="card1">{t("Overlapping")}</option>
                            <option value="card2">{t("Modern Gradient")}</option>
                            <option value="card3">{t("Premium Glass")}</option>
                            <option value="card4">{t("Horizontal")}</option>
                            <option value="card5">{t("Colorful Floating")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Page Subtitle")}</div>
                          <textarea
                            value={String(sectionData("addons")?.subtitle ?? "Extend your WorkDo Dash with powerful premium modules designed to enhance your business operations")}
                            onChange={(e) => setSectionField("addons", "subtitle", e.target.value)}
                            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Empty State Message")}</div>
                          <textarea
                            value={String(sectionData("addons")?.empty_message ?? "No addons available. Check back later for new premium addons and modules.")}
                            onChange={(e) => setSectionField("addons", "empty_message", e.target.value)}
                            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Items Per Page")}</div>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={String(sectionData("addons")?.per_page ?? 20)}
                            onChange={(e) => setSectionField("addons", "per_page", Math.max(1, Number(e.target.value || 20)))}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Default Price Type")}</div>
                          <select
                            value={String(sectionData("addons")?.default_price_type ?? "monthly")}
                            onChange={(e) => setSectionField("addons", "default_price_type", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="monthly">{t("Monthly")}</option>
                            <option value="yearly">{t("Yearly")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">{t("Filter Options")}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Switch checked={sectionData("addons")?.show_search !== false} onCheckedChange={(v) => setSectionField("addons", "show_search", v)} />
                            <div className="text-sm">{t("Show Search")}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={sectionData("addons")?.show_price !== false} onCheckedChange={(v) => setSectionField("addons", "show_price", v)} />
                            <div className="text-sm">{t("Show Price Filter")}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={sectionData("addons")?.show_sort !== false} onCheckedChange={(v) => setSectionField("addons", "show_sort", v)} />
                            <div className="text-sm">{t("Show Sort Options")}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pricing" className="mt-4">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>{t("Pricing Page Settings")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Page Title")}</div>
                          <Input
                            value={String(sectionData("pricing")?.title ?? "Subscription Setting")}
                            onChange={(e) => setSectionField("pricing", "title", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Page Subtitle")}</div>
                          <textarea
                            value={String(sectionData("pricing")?.subtitle ?? "Choose the perfect subscription plan for your business needs")}
                            onChange={(e) => setSectionField("pricing", "subtitle", e.target.value)}
                            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Default Subscription Type")}</div>
                          <select
                            value={String(sectionData("pricing")?.default_subscription_type ?? "pre-package")}
                            onChange={(e) => setSectionField("pricing", "default_subscription_type", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="pre-package">{t("Pre Package Subscription")}</option>
                            <option value="usage">{t("Usage Subscription")}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t("Default Price Type")}</div>
                          <select
                            value={String(sectionData("pricing")?.default_price_type ?? "monthly")}
                            onChange={(e) => setSectionField("pricing", "default_price_type", e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="monthly">{t("Monthly")}</option>
                            <option value="yearly">{t("Yearly")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("Empty State Message")}</div>
                        <textarea
                          value={String(sectionData("pricing")?.empty_message ?? "No plans available. Check back later for new pricing plans.")}
                          onChange={(e) => setSectionField("pricing", "empty_message", e.target.value)}
                          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">{t("Display Options")}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Switch checked={sectionData("pricing")?.show_pre_package !== false} onCheckedChange={(v) => setSectionField("pricing", "show_pre_package", v)} />
                            <div className="text-sm">{t("Show Pre Package Subscription")}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={sectionData("pricing")?.show_usage_subscription !== false}
                              onCheckedChange={(v) => setSectionField("pricing", "show_usage_subscription", v)}
                            />
                            <div className="text-sm">{t("Show Usage Subscription")}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={sectionData("pricing")?.show_monthly_yearly_toggle !== false}
                              onCheckedChange={(v) => setSectionField("pricing", "show_monthly_yearly_toggle", v)}
                            />
                            <div className="text-sm">{t("Show Monthly/Yearly Toggle")}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t("Live Preview")}</CardTitle>
              <CardDescription className="flex flex-col gap-3">
                <span className="inline-flex items-start gap-2 text-muted-foreground">
                  <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {t("Public home page (/) — same as visitors see. Unsaved edits appear after you save, or use Refresh.")}
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setPreviewFrameKey((k) => k + 1)}>
                    {t("Refresh")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPreviewMobile((v) => !v)}>
                    {t("Mobile View")}
                  </Button>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div
                  className="rounded-2xl border bg-muted/30 overflow-hidden shadow-sm"
                  style={{
                    width: previewMobile ? 360 : 640,
                    height: previewMobile ? 720 : 760,
                  }}
                >
                  <iframe
                    key={previewFrameKey}
                    title={t("Landing page preview")}
                    src="/"
                    className="w-full h-full border-0 bg-background"
                  />
                </div>
              </div>
              <div className="mt-2 text-center">
                <Button type="button" variant="ghost" size="sm" onClick={() => window.open(previewUrl, "_blank")}>
                  {t("Open full page preview")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

