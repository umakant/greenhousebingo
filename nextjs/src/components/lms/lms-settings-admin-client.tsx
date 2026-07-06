"use client";

import * as React from "react";
import {
  Cookie,
  Languages,
  Layout,
  Loader2,
  Plus,
  Receipt,
  Settings,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import type { LmsAdBanner, LmsOrgSettings, LmsRtlMode } from "@/lib/lms-org-settings";
import {
  SettingsSectionShell,
  SettingsSidebarLayout,
  type SettingsSidebarSection,
} from "@/components/settings/settings-section-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALES = ["en", "es", "fr", "de", "ar", "he", "pt", "pt-BR", "zh", "ja"];

const LMS_FONT_FAMILIES: { value: string; label: string }[] = [
  { value: "__inherit__", label: "Inherit from brand" },
  { value: "Inter, system-ui, sans-serif", label: "Inter" },
  { value: "system-ui, sans-serif", label: "System UI" },
  {
    value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    label: "Segoe UI / System",
  },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: '"Open Sans", sans-serif', label: "Open Sans" },
  { value: "Lato, sans-serif", label: "Lato" },
  { value: "Poppins, sans-serif", label: "Poppins" },
  { value: "Montserrat, sans-serif", label: "Montserrat" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: '"Times New Roman", Times, serif', label: "Times New Roman" },
  { value: '"Courier New", Courier, monospace', label: "Courier New" },
];

const COLOR_PICKER_FALLBACK = "#2563eb";

function hexForNativeColorPicker(value: string, fallback = COLOR_PICKER_FALLBACK): string {
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/i.test(v)) return `#${v.toLowerCase()}`;
  return fallback;
}

function normalizeHexInput(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^#[0-9A-Fa-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/i.test(v)) return `#${v.toLowerCase()}`;
  return v;
}

function fontFamilySelectOptions(current: string) {
  if (current && !LMS_FONT_FAMILIES.some((o) => o.value === current)) {
    const short = current.length > 48 ? `${current.slice(0, 48)}…` : current;
    return [...LMS_FONT_FAMILIES, { value: current, label: `Custom (${short})` }];
  }
  return LMS_FONT_FAMILIES;
}

type LmsSettingsSectionId =
  | "access"
  | "locale"
  | "privacy"
  | "theme"
  | "ads"
  | "commerce"
  | "integrations";

const LMS_SECTIONS: SettingsSidebarSection[] = [
  { id: "access", title: "Access", icon: Shield },
  { id: "locale", title: "Language & RTL", icon: Languages },
  { id: "privacy", title: "GDPR", icon: Cookie },
  { id: "theme", title: "Theme", icon: Settings },
  { id: "ads", title: "Banners", icon: Layout },
  { id: "commerce", title: "Coupons", icon: Receipt },
  { id: "integrations", title: "Integrations", icon: Zap },
];

const SECTION_META: Record<
  LmsSettingsSectionId,
  { title: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  access: {
    title: "Access",
    description: "Maintenance and device restrictions for the learner portal.",
    icon: Shield,
  },
  locale: {
    title: "Language & RTL",
    description:
      "Locale and RTL inherit from Settings → System / Brand when not overridden here.",
    icon: Languages,
  },
  privacy: {
    title: "GDPR",
    description: "Consent banner and requirements on learner LMS pages.",
    icon: Cookie,
  },
  theme: {
    title: "Theme",
    description: "Overrides brand colors and fonts for the LMS learner UI only.",
    icon: Settings,
  },
  ads: {
    title: "Banners",
    description: "Promotional banners shown in the learner catalog and dashboard.",
    icon: Layout,
  },
  commerce: {
    title: "Coupons",
    description: "Discount codes for first-time storefront purchases.",
    icon: Receipt,
  },
  integrations: {
    title: "Integrations",
    description: "Webhooks and external update checks for your LMS deployment.",
    icon: Zap,
  },
};

export function LmsSettingsAdminClient() {
  const [settings, setSettings] = React.useState<LmsOrgSettings | null>(null);
  const [adminBaseUrl, setAdminBaseUrl] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [active, setActive] = React.useState<LmsSettingsSectionId>("access");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/settings", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        settings?: LmsOrgSettings;
        adminBaseUrl?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.settings) throw new Error(data.message ?? "Load failed");
      setSettings(data.settings);
      setAdminBaseUrl(data.adminBaseUrl ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lms/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
      toast.success(data.message ?? "LMS settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function triggerUpdateHook() {
    try {
      const res = await fetch("/api/lms/settings/update-check", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      toast.success(data.message ?? "Hook sent");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  function patch(p: Partial<LmsOrgSettings>) {
    setSettings((s) => (s ? { ...s, ...p } : s));
  }

  function updateBanner(index: number, patchBanner: Partial<LmsAdBanner>) {
    setSettings((s) => {
      if (!s) return s;
      const banners = [...s.adBanners];
      banners[index] = { ...banners[index], ...patchBanner };
      return { ...s, adBanners: banners };
    });
  }

  function addBanner() {
    setSettings((s) => {
      if (!s) return s;
      return {
        ...s,
        adBanners: [
          ...s.adBanners,
          { id: `b-${Date.now()}`, title: "", imageUrl: "", linkUrl: "", active: true },
        ],
      };
    });
  }

  function removeBanner(index: number) {
    setSettings((s) => {
      if (!s) return s;
      return { ...s, adBanners: s.adBanners.filter((_, i) => i !== index) };
    });
  }

  function renderSectionContent(section: LmsSettingsSectionId) {
    if (!settings) return null;

    switch (section) {
      case "access":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="font-medium">Maintenance mode</p>
                <p className="text-sm text-muted-foreground">
                  Blocks learner catalog and course pages with a message.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="maint">Enable maintenance</Label>
                <Switch
                  id="maint"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(v) => patch({ maintenanceMode: v })}
                />
              </div>
              <Textarea
                value={settings.maintenanceMessage}
                onChange={(e) => patch({ maintenanceMessage: e.target.value })}
                rows={3}
              />
            </div>
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="font-medium">Mobile-only mode</p>
                <p className="text-sm text-muted-foreground">
                  Restrict the learner portal to phones and tablets.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="mobile">Mobile only</Label>
                <Switch
                  id="mobile"
                  checked={settings.mobileOnlyMode}
                  onCheckedChange={(v) => patch({ mobileOnlyMode: v })}
                />
              </div>
            </div>
          </div>
        );
      case "locale":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="font-medium">Multilingual</p>
                <p className="text-sm text-muted-foreground">
                  Uses the app translation system (same locales as System Settings).
                </p>
              </div>
              <div className="space-y-2">
                <Label>LMS default locale (empty = inherit)</Label>
                <Select
                  value={settings.defaultLocale || "__inherit__"}
                  onValueChange={(v) => patch({ defaultLocale: v === "__inherit__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__inherit__">Inherit from system</SelectItem>
                    {LOCALES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>RTL layout</Label>
                <Select
                  value={settings.rtlMode}
                  onValueChange={(v) => patch({ rtlMode: v as LmsRtlMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit brand direction</SelectItem>
                    <SelectItem value="ltr">LTR</SelectItem>
                    <SelectItem value="rtl">RTL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      case "privacy":
        return (
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label>Show GDPR banner</Label>
              <Switch checked={settings.gdprEnabled} onCheckedChange={(v) => patch({ gdprEnabled: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label>Require consent before access</Label>
              <Switch
                checked={settings.gdprRequireConsent}
                onCheckedChange={(v) => patch({ gdprRequireConsent: v })}
              />
            </div>
            <Textarea
              value={settings.gdprBannerText}
              onChange={(e) => patch({ gdprBannerText: e.target.value })}
              rows={4}
            />
          </div>
        );
      case "theme": {
        const fontOptions = fontFamilySelectOptions(settings.fontFamily);
        const fontSelectValue = settings.fontFamily || "__inherit__";
        const pickerHex = hexForNativeColorPicker(settings.primaryColor);

        return (
          <div className="grid gap-6 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="lms-primary-color">Primary color</Label>
              <p className="text-xs text-muted-foreground">
                Pick a color or enter a hex value. Leave empty to use your brand theme color.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="lms-primary-color-picker"
                  type="color"
                  aria-label="Primary color picker"
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5"
                  value={pickerHex}
                  onChange={(e) => patch({ primaryColor: e.target.value })}
                />
                <Input
                  id="lms-primary-color"
                  value={settings.primaryColor}
                  onChange={(e) => patch({ primaryColor: normalizeHexInput(e.target.value) })}
                  onBlur={(e) => patch({ primaryColor: normalizeHexInput(e.target.value) })}
                  placeholder="Inherit from brand"
                  className="font-mono flex-1 min-w-[10rem]"
                />
                {settings.primaryColor ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => patch({ primaryColor: "" })}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lms-font-family">Font family</Label>
              <p className="text-xs text-muted-foreground">
                Applies to the learner LMS portal only. Choose inherit to use brand typography.
              </p>
              <Select
                value={fontSelectValue}
                onValueChange={(v) => patch({ fontFamily: v === "__inherit__" ? "" : v })}
              >
                <SelectTrigger id="lms-font-family" className="w-full">
                  <SelectValue placeholder="Select font family" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} style={{ fontFamily: opt.value === "__inherit__" ? undefined : opt.value }}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }
      case "ads":
        return (
          <div className="space-y-4">
            {settings.adBanners.map((b, i) => (
              <Card key={b.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between gap-2">
                    <Switch checked={b.active} onCheckedChange={(v) => updateBanner(i, { active: v })} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeBanner(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Title"
                    value={b.title}
                    onChange={(e) => updateBanner(i, { title: e.target.value })}
                  />
                  <Input
                    placeholder="Image URL"
                    value={b.imageUrl}
                    onChange={(e) => updateBanner(i, { imageUrl: e.target.value })}
                  />
                  <Input
                    placeholder="Link URL"
                    value={b.linkUrl}
                    onChange={(e) => updateBanner(i, { linkUrl: e.target.value })}
                  />
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addBanner}>
              <Plus className="mr-2 h-4 w-4" />
              Add banner
            </Button>
          </div>
        );
      case "commerce":
        return (
          <div className="space-y-2">
            <Label>First purchase coupon code</Label>
            <p className="text-sm text-muted-foreground">
              Shown to learners with no prior paid enrollments. Create the code under Storefront discounts.
            </p>
            <Input
              value={settings.firstPurchaseCouponCode}
              onChange={(e) => patch({ firstPurchaseCouponCode: e.target.value })}
              placeholder="WELCOME10"
            />
          </div>
        );
      case "integrations":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Admin entry URL is global (
              <code className="text-xs">{adminBaseUrl || "/dashboard"}</code>).
            </p>
            <div className="space-y-2">
              <Label>Update system hook URL</Label>
              <p className="text-xs text-muted-foreground">
                POST JSON to this URL when settings change or when you run a manual check.
              </p>
              <Input
                value={settings.updateWebhookUrl}
                onChange={(e) => patch({ updateWebhookUrl: e.target.value })}
                placeholder="https://your-updater.example/hooks/lms"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Last reported version: {settings.updateLastVersion || "—"}
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void triggerUpdateHook()}>
              Send update check now
            </Button>
          </div>
        );
      default:
        return null;
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const meta = SECTION_META[active];

  return (
    <SettingsSidebarLayout sections={LMS_SECTIONS} active={active} onSelect={(id) => setActive(id as LmsSettingsSectionId)}>
      <SettingsSectionShell
        title={meta.title}
        description={meta.description}
        icon={meta.icon}
        canEdit
        onSave={() => void save()}
        saving={saving}
      >
        {renderSectionContent(active)}
      </SettingsSectionShell>
    </SettingsSidebarLayout>
  );
}
