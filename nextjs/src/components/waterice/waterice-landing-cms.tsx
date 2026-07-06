"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImageIcon, Loader2, Plus, RefreshCw, Save, Smartphone, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";


type HeroSlide = { image: string; kicker: string; title: string; subtitle: string };
type LandingCta = { label: string; href: string };
type LandingConfig = {
  heroSlides: HeroSlide[];
  heroCtaLabel: string;
  heroCtaHref: string;
  welcome: { heading: string; body: string };
  feature: {
    kicker: string;
    heading: string;
    body: string;
    image: string;
    primaryCta: LandingCta;
    secondaryCta: LandingCta;
  };
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("files[]", file);
  const res = await fetch("/api/media", { method: "POST", body: fd });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; files?: string[]; message?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.message || "Upload failed.");
  const saved = Array.isArray(json.files) ? json.files[0] : undefined;
  if (!saved) throw new Error("Upload failed.");
  return `/uploads/media/${saved}`;
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
      toast.success("Image uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/media/… or /waterice/…" />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {t("Upload image")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WaterIceLandingCms() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewMobile, setPreviewMobile] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/waterice/landing", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; config?: LandingConfig } | null;
      if (res.ok && json?.ok && json.config) {
        setConfig(json.config);
      } else {
        toast.error("Failed to load landing content.");
      }
    } catch {
      toast.error("Network error loading landing content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/waterice/landing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json?.message || "Could not save.");
        return;
      }
      toast.success("Landing page updated.");
      setPreviewKey((k) => k + 1);
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const setSlide = (i: number, next: Partial<HeroSlide>) =>
    setConfig((c) =>
      c ? { ...c, heroSlides: c.heroSlides.map((s, idx) => (idx === i ? { ...s, ...next } : s)) } : c,
    );
  const addSlide = () =>
    setConfig((c) =>
      c
        ? { ...c, heroSlides: [...c.heroSlides, { image: "", kicker: "", title: "", subtitle: "" }] }
        : c,
    );
  const removeSlide = (i: number) =>
    setConfig((c) => (c ? { ...c, heroSlides: c.heroSlides.filter((_, idx) => idx !== i) } : c));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("Edit the content and images shown on the public")}{" "}
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {t("Water Ice Express home page")}
          </a>
          .
        </p>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("Save changes")}
        </Button>
      </div>

      <Tabs defaultValue="hero">
        <TabsList>
          <TabsTrigger value="hero">{t("Hero Slider")}</TabsTrigger>
          <TabsTrigger value="welcome">{t("Welcome")}</TabsTrigger>
          <TabsTrigger value="feature">{t("Feature")}</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("Hero slide button")}</CardTitle>
              <CardDescription>{t("Shown on every hero slide.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Button label")}</Label>
                <Input
                  value={config.heroCtaLabel}
                  onChange={(e) => setConfig((c) => (c ? { ...c, heroCtaLabel: e.target.value } : c))}
                  placeholder="Explore More"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Button link")}</Label>
                <Input
                  value={config.heroCtaHref}
                  onChange={(e) => setConfig((c) => (c ? { ...c, heroCtaHref: e.target.value } : c))}
                  placeholder="/shop/flavors"
                />
              </div>
            </CardContent>
          </Card>

          {config.heroSlides.map((slide, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{t("Slide")} {i + 1}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-600"
                  onClick={() => removeSlide(i)}
                  disabled={config.heroSlides.length <= 1}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("Remove")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageField label={t("Slide image")} value={slide.image} onChange={(url) => setSlide(i, { image: url })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("Kicker / badge")}</Label>
                    <Input value={slide.kicker} onChange={(e) => setSlide(i, { kicker: e.target.value })} placeholder="Flavor of the Day" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("Title")}</Label>
                    <Input value={slide.title} onChange={(e) => setSlide(i, { title: e.target.value })} placeholder="Cool Down with Cherry Classic" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Subtitle")}</Label>
                  <Textarea rows={2} value={slide.subtitle} onChange={(e) => setSlide(i, { subtitle: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addSlide} className="gap-2">
            <Plus className="h-4 w-4" /> {t("Add slide")}
          </Button>
        </TabsContent>

        <TabsContent value="welcome" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("Welcome section")}</CardTitle>
              <CardDescription>{t("The intro band below the hero slider.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("Heading")}</Label>
                <Input
                  value={config.welcome.heading}
                  onChange={(e) => setConfig((c) => (c ? { ...c, welcome: { ...c.welcome, heading: e.target.value } } : c))}
                  placeholder="Welcome Motivated Entrepreneurs!"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Body")}</Label>
                <Textarea
                  rows={5}
                  value={config.welcome.body}
                  onChange={(e) => setConfig((c) => (c ? { ...c, welcome: { ...c.welcome, body: e.target.value } } : c))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feature" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("Feature section")}</CardTitle>
              <CardDescription>{t("The two-column section with the image and call-to-actions.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("Kicker")}</Label>
                  <Input
                    value={config.feature.kicker}
                    onChange={(e) => setConfig((c) => (c ? { ...c, feature: { ...c.feature, kicker: e.target.value } } : c))}
                    placeholder="Cool. Fast. Delicious."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Heading")}</Label>
                  <Input
                    value={config.feature.heading}
                    onChange={(e) => setConfig((c) => (c ? { ...c, feature: { ...c.feature, heading: e.target.value } } : c))}
                    placeholder="Philly Water Ice, EXPRESS Delivery."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Body")}</Label>
                <Textarea
                  rows={3}
                  value={config.feature.body}
                  onChange={(e) => setConfig((c) => (c ? { ...c, feature: { ...c.feature, body: e.target.value } } : c))}
                />
              </div>
              <ImageField
                label={t("Feature image")}
                value={config.feature.image}
                onChange={(url) => setConfig((c) => (c ? { ...c, feature: { ...c.feature, image: url } } : c))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">{t("Primary button")}</p>
                  <Input
                    value={config.feature.primaryCta.label}
                    onChange={(e) =>
                      setConfig((c) => (c ? { ...c, feature: { ...c.feature, primaryCta: { ...c.feature.primaryCta, label: e.target.value } } } : c))
                    }
                    placeholder="Explore Services"
                  />
                  <Input
                    value={config.feature.primaryCta.href}
                    onChange={(e) =>
                      setConfig((c) => (c ? { ...c, feature: { ...c.feature, primaryCta: { ...c.feature.primaryCta, href: e.target.value } } } : c))
                    }
                    placeholder="/services"
                  />
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">{t("Secondary button")}</p>
                  <Input
                    value={config.feature.secondaryCta.label}
                    onChange={(e) =>
                      setConfig((c) => (c ? { ...c, feature: { ...c.feature, secondaryCta: { ...c.feature.secondaryCta, label: e.target.value } } } : c))
                    }
                    placeholder="Book an Event"
                  />
                  <Input
                    value={config.feature.secondaryCta.href}
                    onChange={(e) =>
                      setConfig((c) => (c ? { ...c, feature: { ...c.feature, secondaryCta: { ...c.feature.secondaryCta, href: e.target.value } } } : c))
                    }
                    placeholder="/events"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      <div className="xl:sticky xl:top-6 self-start">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t("Live Preview")}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open("/", "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                {t("Open")}
              </Button>
            </div>
            <CardDescription className="flex flex-col gap-3">
              <span className="inline-flex items-start gap-2">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("Public home page (/). Saved edits appear here — use Refresh after saving.")}</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setPreviewKey((k) => k + 1)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("Refresh")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setPreviewMobile((v) => !v)}>
                  {previewMobile ? t("Desktop View") : t("Mobile View")}
                </Button>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div
                className="overflow-hidden rounded-2xl border bg-muted/30 shadow-sm"
                style={{ width: previewMobile ? 360 : "100%", height: previewMobile ? 720 : 760 }}
              >
                <iframe
                  key={previewKey}
                  title={t("Water Ice landing preview")}
                  src="/"
                  className="h-full w-full border-0 bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
