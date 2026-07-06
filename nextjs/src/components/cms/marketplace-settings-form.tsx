"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Pencil, Search, Save } from "lucide-react";
import { t } from "@/lib/admin-t";


type ActiveModule = { module: string; name: string; packageName?: string | null };

export default function MarketplaceSettingsForm({ initialModule }: { initialModule?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  const [modules, setModules] = React.useState<ActiveModule[]>([]);
  const [selectedModule, setSelectedModule] = React.useState<string>("");
  const [addonSearch, setAddonSearch] = React.useState("");

  const [primaryTab, setPrimaryTab] = React.useState("setup");
  const [setupSubTab, setSetupSubTab] = React.useState("general");

  const [title, setTitle] = React.useState("Marketplace");
  const [subtitle, setSubtitle] = React.useState("");
  const [configSectionsText, setConfigSectionsText] = React.useState<string>("{}");

  const load = React.useCallback(
    async (module?: string) => {
      setLoading(true);
      setError(null);
      setOkMsg(null);
      try {
        const url = module
          ? `/api/cms/marketplace-settings?module=${encodeURIComponent(module)}`
          : "/api/cms/marketplace-settings";
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load marketplace settings.");

        const mods = (json?.activeModules ?? []) as ActiveModule[];
        setModules(mods);

        const nextModule = module || json?.selectedModule || mods?.[0]?.module || "";
        setSelectedModule(nextModule);

        const settings = json?.settings ?? null;
        setTitle(String(settings?.title ?? "Marketplace"));
        setSubtitle(String(settings?.subtitle ?? ""));
        setConfigSectionsText(JSON.stringify(settings?.configSections ?? {}, null, 2));

        // Sync URL with selected module
        const next = new URLSearchParams(searchParams?.toString() ?? "");
        next.set("module", nextModule);
        router.replace(`/marketplace/settings?${next.toString()}`, { scroll: false });
      } catch (e: any) {
        setError(e?.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    void load(initialModule);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  const loadSettingsForModule = React.useCallback(async (moduleCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/cms/marketplace-settings?module=${encodeURIComponent(moduleCode)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load settings.");

      setSelectedModule(moduleCode);
      const settings = json?.settings ?? null;
      setTitle(String(settings?.title ?? "Marketplace"));
      setSubtitle(String(settings?.subtitle ?? ""));
      setConfigSectionsText(JSON.stringify(settings?.configSections ?? {}, null, 2));

      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.set("module", moduleCode);
      router.replace(`/marketplace/settings?${next.toString()}`, { scroll: false });
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router, searchParams]);

  async function save() {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      if (!selectedModule) throw new Error(t("Please select an add-on."));

      let configSections: any = {};
      const raw = configSectionsText.trim();
      if (raw) configSections = JSON.parse(raw);

      const res = await fetch("/api/cms/marketplace-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          module: selectedModule,
          title,
          subtitle,
          configSections,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Save failed.");
      setOkMsg(t("Saved."));
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const filteredModules = React.useMemo(() => {
    const q = addonSearch.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.module || "").toLowerCase().includes(q) ||
        (m.packageName || "").toLowerCase().includes(q),
    );
  }, [modules, addonSearch]);

  const selectedAddon = React.useMemo(
    () => modules.find((m) => m.module === selectedModule),
    [modules, selectedModule],
  );
  const selectedName = selectedAddon?.name ?? selectedModule;

  if (loading && modules.length === 0) {
    return <div className="text-sm text-muted-foreground">{t("Loading...")}</div>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {okMsg ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {okMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Active Add-Ons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              {t("Active Add-Ons")}
            </CardTitle>
            <CardDescription>{t("Select addon to configure marketplace settings")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("Search addons...")}
                value={addonSearch}
                onChange={(e) => setAddonSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-md border border-border bg-muted/30">
              {filteredModules.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t("No add-ons found.")}</div>
              ) : (
                <ul className="p-1">
                  {filteredModules.map((m) => {
                    const isSelected = m.module === selectedModule;
                    return (
                      <li key={m.module}>
                        <button
                          type="button"
                          onClick={() => loadSettingsForModule(m.module)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span className="min-w-0 truncate">{m.name}</span>
                          {isSelected && <Pencil className="h-3.5 w-3.5 flex-shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: [Add-on name] Marketplace Settings */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                {selectedName} {t("Marketplace Settings")}
              </CardTitle>
              <CardDescription>
                {t("Configure marketplace settings for")} {selectedName}
              </CardDescription>
            </div>
            <Button onClick={save} disabled={saving} className="flex-shrink-0 gap-2">
              <Save className="h-4 w-4" />
              {saving ? t("Saving...") : t("Save Changes")}
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs value={primaryTab} onValueChange={setPrimaryTab} className="w-full">
              <TabsList className="mb-4 h-10 w-full justify-start rounded-md bg-muted p-1 sm:inline-flex sm:w-auto">
                <TabsTrigger value="setup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t("Setup")}
                </TabsTrigger>
                <TabsTrigger value="content">{t("Content")}</TabsTrigger>
                <TabsTrigger value="social">{t("Social")}</TabsTrigger>
              </TabsList>

              <TabsContent value="setup" className="mt-4">
                <Tabs value={setupSubTab} onValueChange={setSetupSubTab} className="w-full">
                  <TabsList className="mb-4 h-9 w-full justify-start rounded-md bg-muted/80 p-1 sm:inline-flex sm:w-auto">
                    <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {t("General")}
                    </TabsTrigger>
                    <TabsTrigger value="hero">{t("Hero")}</TabsTrigger>
                    <TabsTrigger value="order">{t("Order")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("Title")}</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("e.g. Product & Service Module Marketplace")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("Subtitle")}</label>
                      <Input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder={t("Optional subtitle")}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="hero" className="mt-4">
                    <p className="text-sm text-muted-foreground">{t("Hero section configuration (coming soon).")}</p>
                  </TabsContent>

                  <TabsContent value="order" className="mt-4">
                    <p className="text-sm text-muted-foreground">{t("Order section configuration (coming soon).")}</p>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="content" className="mt-4">
                <p className="text-sm text-muted-foreground">{t("Content configuration (coming soon).")}</p>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <p className="text-sm text-muted-foreground">{t("Social links configuration (coming soon).")}</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
