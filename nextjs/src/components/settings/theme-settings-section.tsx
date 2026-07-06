"use client";

import * as React from "react";
import { Check, Layout, Moon, Palette, SidebarIcon } from "lucide-react";
import { toast } from "sonner";

import { SettingsSectionShell } from "@/components/settings/settings-section-layout";
import { ThemePreview } from "@/components/settings/theme-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getImagePath } from "@/utils/image-path";

const NAVY_LEFT = "#0f172a";
const NAVY_FORM = "#1e293b";

type Props = {
  isSuperAdmin: boolean;
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
};

async function saveThemeSettings(settings: Record<string, unknown>) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ section: "brand", settings }),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || "Failed to save theme settings.");
  }
}

export function ThemeSettingsSection({ isSuperAdmin, canEdit, initial, onFlash }: Props) {
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState({
    sidebarVariant: initial.sidebarVariant ?? "inset",
    sidebarStyle: initial.sidebarStyle ?? "plain",
    layoutDirection: initial.layoutDirection ?? "ltr",
    themeMode: initial.themeMode ?? "light",
    themeColor: initial.themeColor ?? "green",
    customColor: initial.customColor ?? "#10b981",
    loginBgColor: initial.loginBgColor ?? "",
    loginFormBgColor: initial.loginFormBgColor ?? "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await saveThemeSettings(settings);
      onFlash({ type: "success", message: "Theme settings saved." });
      toast.success("Theme settings saved.");
      window.dispatchEvent(new Event("pf:app-settings-updated"));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save theme settings.";
      onFlash({ type: "error", message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const logoDark = initial.logo_dark ?? "";
  const logoLight = initial.logo_light ?? "";
  const loginImage = initial.loginImage ?? "";
  const titleText = initial.titleText ?? "WorkDo";
  const footerText = initial.footerText ?? "© WorkDo. All rights reserved.";

  return (
    <SettingsSectionShell
      title="Dashboard Theme"
      description="Customize colors, layout, sidebar, and dashboard appearance."
      icon={Layout}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={`flex flex-col space-y-8 ${!canEdit ? "pointer-events-none opacity-60" : ""}`}>
            <div className="space-y-4">
              <div className="flex items-center">
                <Palette className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-medium">Theme Color</h3>
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-6 gap-2">
                {Object.entries({
                  blue: "#3b82f6",
                  green: "#10b981",
                  purple: "#8b5cf6",
                  orange: "#f97316",
                  red: "#ef4444",
                }).map(([color, hex]) => (
                  <Button
                    key={color}
                    type="button"
                    variant={settings.themeColor === color ? "default" : "outline"}
                    className="relative h-8 w-full p-0"
                    style={{ backgroundColor: settings.themeColor === color ? hex : "transparent" }}
                    onClick={() => handleSelectChange("themeColor", color)}
                  >
                    <span className="absolute inset-1 rounded-sm" style={{ backgroundColor: hex }} />
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={settings.themeColor === "custom" ? "default" : "outline"}
                  className="relative h-8 w-full p-0"
                  style={{
                    backgroundColor: settings.themeColor === "custom" ? settings.customColor : "transparent",
                  }}
                  onClick={() => handleSelectChange("themeColor", "custom")}
                >
                  <span
                    className="absolute inset-1 rounded-sm"
                    style={{ backgroundColor: settings.customColor }}
                  />
                </Button>
              </div>
              {settings.themeColor === "custom" ? (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="customColor">Custom Color</Label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Input
                        id="colorPicker"
                        type="color"
                        value={settings.customColor}
                        onChange={(e) => handleSelectChange("customColor", e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                      <div
                        className="h-10 w-10 cursor-pointer rounded border"
                        style={{ backgroundColor: settings.customColor }}
                      />
                    </div>
                    <Input
                      id="customColor"
                      name="customColor"
                      type="text"
                      value={settings.customColor}
                      onChange={(e) => handleSelectChange("customColor", e.target.value)}
                      placeholder="#10b981"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <SidebarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-medium">Sidebar</h3>
              </div>
              <Separator className="my-2" />
              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">Sidebar Variant</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {["inset", "floating", "minimal"].map((variant) => (
                      <Button
                        key={variant}
                        type="button"
                        variant={settings.sidebarVariant === variant ? "default" : "outline"}
                        className="h-10 justify-start"
                        onClick={() => handleSelectChange("sidebarVariant", variant)}
                      >
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                        {settings.sidebarVariant === variant ? <Check className="ml-2 h-4 w-4" /> : null}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Sidebar Style</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "plain", name: "Plain" },
                      { id: "colored", name: "Colored" },
                      { id: "gradient", name: "Gradient" },
                    ].map((style) => (
                      <Button
                        key={style.id}
                        type="button"
                        variant={settings.sidebarStyle === style.id ? "default" : "outline"}
                        className="h-10 justify-start"
                        onClick={() => handleSelectChange("sidebarStyle", style.id)}
                      >
                        {style.name}
                        {settings.sidebarStyle === style.id ? <Check className="ml-2 h-4 w-4" /> : null}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <Layout className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-medium">Layout</h3>
              </div>
              <Separator className="my-2" />
              <div className="space-y-2">
                <Label className="mb-2 block">Layout Direction</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={settings.layoutDirection === "ltr" ? "default" : "outline"}
                    className="h-10 justify-start"
                    onClick={() => handleSelectChange("layoutDirection", "ltr")}
                  >
                    Left-to-Right
                    {settings.layoutDirection === "ltr" ? <Check className="ml-2 h-4 w-4" /> : null}
                  </Button>
                  <Button
                    type="button"
                    variant={settings.layoutDirection === "rtl" ? "default" : "outline"}
                    className="h-10 justify-start"
                    onClick={() => handleSelectChange("layoutDirection", "rtl")}
                  >
                    Right-to-Left
                    {settings.layoutDirection === "rtl" ? <Check className="ml-2 h-4 w-4" /> : null}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <Moon className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-medium">Theme Mode</h3>
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={settings.themeMode === mode ? "default" : "outline"}
                    className="h-10 justify-start"
                    onClick={() => handleSelectChange("themeMode", mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    {settings.themeMode === mode ? <Check className="ml-2 h-4 w-4" /> : null}
                  </Button>
                ))}
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Palette className="mr-2 h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Login Page Backgrounds</h3>
                </div>
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground">
                  Colors for the split auth layout (login, register, forgot password). The left color is
                  used behind the branding column and as the page backdrop on small screens; the right
                  color fills the form column.
                </p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="loginBgColorTheme">Left panel (branding)</Label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Input
                          id="loginBgColorPickerTheme"
                          type="color"
                          value={settings.loginBgColor || "#0a1628"}
                          onChange={(e) => handleSelectChange("loginBgColor", e.target.value)}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <div
                          className="h-10 w-10 cursor-pointer rounded border"
                          style={{ backgroundColor: settings.loginBgColor || "#0a1628" }}
                        />
                      </div>
                      <Input
                        id="loginBgColorTheme"
                        name="loginBgColor"
                        type="text"
                        value={settings.loginBgColor}
                        onChange={handleInputChange}
                        placeholder="#0a1628"
                      />
                      {settings.loginBgColor ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectChange("loginBgColor", "")}
                          className="shrink-0"
                        >
                          Reset
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginFormBgColorTheme">Right panel (sign-in form)</Label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Input
                          id="loginFormBgColorPickerTheme"
                          type="color"
                          value={settings.loginFormBgColor || "#0d1a30"}
                          onChange={(e) => handleSelectChange("loginFormBgColor", e.target.value)}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <div
                          className="h-10 w-10 cursor-pointer rounded border"
                          style={{ backgroundColor: settings.loginFormBgColor || "#0d1a30" }}
                        />
                      </div>
                      <Input
                        id="loginFormBgColorTheme"
                        name="loginFormBgColor"
                        type="text"
                        value={settings.loginFormBgColor}
                        onChange={handleInputChange}
                        placeholder="#0d1a30"
                      />
                      {settings.loginFormBgColor ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectChange("loginFormBgColor", "")}
                          className="shrink-0"
                        >
                          Reset
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-6">
            <div className="rounded-md border p-4">
              <div className="mb-4 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <h3 className="font-medium">Dashboard Preview</h3>
              </div>
              <ThemePreview
                logoDark={logoDark}
                logoLight={logoLight}
                themeColor={settings.themeColor}
                customColor={settings.customColor}
                sidebarVariant={settings.sidebarVariant}
                sidebarStyle={settings.sidebarStyle}
                layoutDirection={settings.layoutDirection}
                themeMode={settings.themeMode}
              />
              <div className="mt-4 border-t pt-4">
                <div className="mb-2 text-xs text-muted-foreground">
                  Title: <span className="font-medium text-foreground">{titleText}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Footer: <span className="font-medium text-foreground">{footerText}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Layout className="h-4 w-4" />
                <h3 className="font-medium">Login Preview</h3>
              </div>
              <div className="overflow-hidden rounded-md border bg-muted/40">
                <div className="flex h-40">
                  <div
                    className="relative hidden w-1/2 items-center justify-center border-r bg-slate-900/90 text-white sm:flex"
                    style={{ backgroundColor: settings.loginBgColor || NAVY_LEFT }}
                  >
                    {loginImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImagePath(loginImage)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-2 text-center">
                        <div className="h-8 w-8 rounded-full border border-white/30" />
                        <div className="h-2 w-16 rounded-full bg-white/40" />
                        <div className="h-2 w-10 rounded-full bg-white/25" />
                      </div>
                    )}
                  </div>
                  <div
                    className="flex flex-1 flex-col justify-between bg-slate-900 px-3 py-3 text-[10px]"
                    style={{ backgroundColor: settings.loginFormBgColor || NAVY_FORM }}
                  >
                    <div>
                      <div className="h-2 w-2/3 rounded bg-white/80" />
                      <div className="mt-1 h-1.5 w-3/4 rounded bg-white/25" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded bg-slate-700" />
                      <div className="h-1.5 w-full rounded bg-slate-700" />
                      <div className="h-1.5 w-1/2 rounded bg-primary/80" />
                    </div>
                    <div className="text-center text-[9px] text-slate-400">&copy; Paper Flight</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsSectionShell>
  );
}
