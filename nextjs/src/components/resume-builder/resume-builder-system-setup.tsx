"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Globe, BarChart3, HelpCircle, PlayCircle, BookOpen, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Settings, Image as ImageIcon } from "lucide-react";
import MediaLibraryModal from "@/components/MediaLibraryModal";
import { t } from "@/lib/admin-t";


const SECTIONS = [
  { key: "brand", label: "Brand Settings", href: "/resume-builder/system-setup/brand-settings", icon: Settings },
  { key: "hero", label: "Hero Section", href: "/resume-builder/system-setup/hero-section", icon: Globe },
  { key: "statistics", label: "Statistics Section", href: "/resume-builder/system-setup/statistics-section", icon: BarChart3 },
  { key: "faq", label: "FAQ Section", href: "/resume-builder/system-setup/faq-section", icon: HelpCircle },
  { key: "tutorials", label: "Tutorials Section", href: "/resume-builder/system-setup/tutorials-section", icon: PlayCircle },
  { key: "guides", label: "Guides Section", href: "/resume-builder/system-setup/guides-section", icon: BookOpen },
  { key: "support", label: "Support Section", href: "/resume-builder/system-setup/support-section", icon: Headphones },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

interface Props {
  section: SectionKey;
}

function useSectionSettings(section: SectionKey) {
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/resume-builder/system-setup?section=${section}`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => setSettings(j.data ?? {}))
      .catch(() => toast.error(t("Failed to load settings")))
      .finally(() => setLoading(false));
  }, [section]);

  async function save(updates: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch("/api/resume-builder/system-setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ section, settings: updates }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error || t("Failed to save")); return false; }
      toast.success(t("Settings saved successfully!"));
      setSettings(prev => ({ ...prev, ...updates }));
      return true;
    } finally { setSaving(false); }
  }

  return { settings, loading, saving, save };
}

function BrandSettingsForm({ settings, saving, onSave }: { settings: Record<string, string>; saving: boolean; onSave: (s: Record<string, string>) => void }) {
  const [logo, setLogo] = React.useState(settings.logo ?? "");
  const [favicon, setFavicon] = React.useState(settings.favicon ?? "");
  const [footerText, setFooterText] = React.useState(settings.footer_text ?? "");
  const [logoPickerOpen, setLogoPickerOpen] = React.useState(false);
  const [faviconPickerOpen, setFaviconPickerOpen] = React.useState(false);

  React.useEffect(() => {
    setLogo(settings.logo ?? "");
    setFavicon(settings.favicon ?? "");
    setFooterText(settings.footer_text ?? "");
  }, [settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ logo, favicon, footer_text: footerText });
  }

  const imgClass = "h-20 w-32 object-contain rounded border bg-muted/30 p-2";

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="border-b py-4 px-5">
          <CardTitle className="text-base">{t("Brand Setting")}</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("Logo")}</Label>
              <div className="border rounded-lg p-4 flex flex-col items-center gap-3 bg-muted/10">
                {logo ? (
                  <img src={logo} alt="Logo" className={imgClass} />
                ) : (
                  <div className={`${imgClass} flex items-center justify-center text-muted-foreground`}>
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={logo ? logo.split("/").pop() ?? logo : ""}
                    placeholder="No file selected"
                    readOnly
                    className="flex-1 text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setLogoPickerOpen(true)}>
                    <ImageIcon className="h-4 w-4 mr-1" /> {t("Browse")}
                  </Button>
                  {logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")} className="text-red-500 px-2">✕</Button>
                  )}
                </div>
              </div>
              <MediaLibraryModal
                isOpen={logoPickerOpen}
                onClose={() => setLogoPickerOpen(false)}
                onSelect={(url) => { setLogo(typeof url === "string" ? url : url[0] ?? ""); setLogoPickerOpen(false); }}
              />
            </div>

            {/* Favicon */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("Favicon")}</Label>
              <div className="border rounded-lg p-4 flex flex-col items-center gap-3 bg-muted/10">
                {favicon ? (
                  <img src={favicon} alt="Favicon" className={imgClass} />
                ) : (
                  <div className={`${imgClass} flex items-center justify-center text-muted-foreground`}>
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={favicon ? favicon.split("/").pop() ?? favicon : ""}
                    placeholder="No file selected"
                    readOnly
                    className="flex-1 text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setFaviconPickerOpen(true)}>
                    <ImageIcon className="h-4 w-4 mr-1" /> {t("Browse")}
                  </Button>
                  {favicon && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFavicon("")} className="text-red-500 px-2">✕</Button>
                  )}
                </div>
              </div>
              <MediaLibraryModal
                isOpen={faviconPickerOpen}
                onClose={() => setFaviconPickerOpen(false)}
                onSelect={(url) => { setFavicon(typeof url === "string" ? url : url[0] ?? ""); setFaviconPickerOpen(false); }}
              />
            </div>
          </div>

          {/* Footer Text */}
          <div className="mt-6 space-y-2">
            <Label className="text-sm font-medium">{t("Footer Text")}</Label>
            <Textarea
              value={footerText}
              onChange={e => setFooterText(e.target.value)}
              placeholder="© 2024 Resume Builder. All rights reserved."
              rows={3}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? t("Saving...") : t("Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function HeroSectionForm({ settings, saving, onSave }: { settings: Record<string, string>; saving: boolean; onSave: (s: Record<string, string>) => void }) {
  const [title, setTitle] = React.useState(settings.title ?? "");
  const [subtitle, setSubtitle] = React.useState(settings.subtitle ?? "");
  const [buttonText, setButtonText] = React.useState(settings.button_text ?? "");
  const [buttonLink, setButtonLink] = React.useState(settings.button_link ?? "");

  React.useEffect(() => {
    setTitle(settings.title ?? "");
    setSubtitle(settings.subtitle ?? "");
    setButtonText(settings.button_text ?? "");
    setButtonLink(settings.button_link ?? "");
  }, [settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ title, subtitle, button_text: buttonText, button_link: buttonLink });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="border-b py-4 px-5"><CardTitle className="text-base">{t("Hero Section")}</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>{t("Title")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Build Your Professional Resume" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Subtitle")}</Label>
            <Textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Create stunning resumes in minutes..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("Button Text")}</Label>
              <Input value={buttonText} onChange={e => setButtonText(e.target.value)} placeholder="Get Started" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Button Link")}</Label>
              <Input value={buttonLink} onChange={e => setButtonLink(e.target.value)} placeholder="/resume-builder/create" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />{saving ? t("Saving...") : t("Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function StatisticsSectionForm({ settings, saving, onSave }: { settings: Record<string, string>; saving: boolean; onSave: (s: Record<string, string>) => void }) {
  const [fields, setFields] = React.useState({
    stat1_label: settings.stat1_label ?? "Resumes Created",
    stat1_value: settings.stat1_value ?? "10,000+",
    stat2_label: settings.stat2_label ?? "Templates",
    stat2_value: settings.stat2_value ?? "50+",
    stat3_label: settings.stat3_label ?? "Happy Users",
    stat3_value: settings.stat3_value ?? "5,000+",
    stat4_label: settings.stat4_label ?? "Countries",
    stat4_value: settings.stat4_value ?? "100+",
  });

  React.useEffect(() => {
    setFields({
      stat1_label: settings.stat1_label ?? "Resumes Created",
      stat1_value: settings.stat1_value ?? "10,000+",
      stat2_label: settings.stat2_label ?? "Templates",
      stat2_value: settings.stat2_value ?? "50+",
      stat3_label: settings.stat3_label ?? "Happy Users",
      stat3_value: settings.stat3_value ?? "5,000+",
      stat4_label: settings.stat4_label ?? "Countries",
      stat4_value: settings.stat4_value ?? "100+",
    });
  }, [settings]);

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); onSave(fields); }

  const update = (key: keyof typeof fields, v: string) => setFields(prev => ({ ...prev, [key]: v }));

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="border-b py-4 px-5"><CardTitle className="text-base">{t("Statistics Section")}</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(n => (
              <div key={n} className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{t("Statistic")} {n}</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Label")}</Label>
                  <Input value={(fields as any)[`stat${n}_label`]} onChange={e => update(`stat${n}_label` as any, e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Value")}</Label>
                  <Input value={(fields as any)[`stat${n}_value`]} onChange={e => update(`stat${n}_value` as any, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />{saving ? t("Saving...") : t("Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function GenericSectionForm({ sectionLabel, settings, saving, onSave, fields }: {
  sectionLabel: string;
  settings: Record<string, string>;
  saving: boolean;
  onSave: (s: Record<string, string>) => void;
  fields: { key: string; label: string; placeholder?: string; type?: "textarea" | "input" }[];
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.key] = settings[f.key] ?? "";
    setValues(init);
  }, [settings]);

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); onSave(values); }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="border-b py-4 px-5"><CardTitle className="text-base">{t(sectionLabel)}</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-4">
          {fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label>{t(f.label)}</Label>
              {f.type === "textarea" ? (
                <Textarea value={values[f.key] ?? ""} onChange={e => setValues(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={4} />
              ) : (
                <Input value={values[f.key] ?? ""} onChange={e => setValues(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              )}
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />{saving ? t("Saving...") : t("Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export default function ResumeBuilderSystemSetup({ section }: Props) {
  const router = useRouter();
  const { settings, loading, saving, save } = useSectionSettings(section);

  const current = SECTIONS.find(s => s.key === section);

  function renderForm() {
    if (loading) return <div className="py-20 text-center text-muted-foreground">{t("Loading settings...")}</div>;
    switch (section) {
      case "brand": return <BrandSettingsForm settings={settings} saving={saving} onSave={save} />;
      case "hero": return <HeroSectionForm settings={settings} saving={saving} onSave={save} />;
      case "statistics": return <StatisticsSectionForm settings={settings} saving={saving} onSave={save} />;
      case "faq":
        return <GenericSectionForm sectionLabel="FAQ Section" settings={settings} saving={saving} onSave={save} fields={[
          { key: "heading", label: "Section Heading", placeholder: "Frequently Asked Questions" },
          { key: "subheading", label: "Section Subheading", placeholder: "Everything you need to know", type: "textarea" },
          { key: "faq1_q", label: "FAQ 1 Question", placeholder: "Question?" },
          { key: "faq1_a", label: "FAQ 1 Answer", placeholder: "Answer...", type: "textarea" },
          { key: "faq2_q", label: "FAQ 2 Question", placeholder: "Question?" },
          { key: "faq2_a", label: "FAQ 2 Answer", placeholder: "Answer...", type: "textarea" },
          { key: "faq3_q", label: "FAQ 3 Question", placeholder: "Question?" },
          { key: "faq3_a", label: "FAQ 3 Answer", placeholder: "Answer...", type: "textarea" },
        ]} />;
      case "tutorials":
        return <GenericSectionForm sectionLabel="Tutorials Section" settings={settings} saving={saving} onSave={save} fields={[
          { key: "heading", label: "Section Heading", placeholder: "Video Tutorials" },
          { key: "subheading", label: "Section Subheading", placeholder: "Learn how to build your resume", type: "textarea" },
          { key: "tutorial1_title", label: "Tutorial 1 Title", placeholder: "Getting Started" },
          { key: "tutorial1_url", label: "Tutorial 1 URL", placeholder: "https://youtube.com/..." },
          { key: "tutorial2_title", label: "Tutorial 2 Title", placeholder: "Advanced Features" },
          { key: "tutorial2_url", label: "Tutorial 2 URL", placeholder: "https://youtube.com/..." },
        ]} />;
      case "guides":
        return <GenericSectionForm sectionLabel="Guides Section" settings={settings} saving={saving} onSave={save} fields={[
          { key: "heading", label: "Section Heading", placeholder: "Resume Writing Guides" },
          { key: "subheading", label: "Section Subheading", placeholder: "Expert tips for your resume", type: "textarea" },
          { key: "guide1_title", label: "Guide 1 Title", placeholder: "How to Write a Resume" },
          { key: "guide1_description", label: "Guide 1 Description", placeholder: "Step-by-step guide...", type: "textarea" },
          { key: "guide2_title", label: "Guide 2 Title", placeholder: "Resume Tips for Freshers" },
          { key: "guide2_description", label: "Guide 2 Description", placeholder: "Tips for new graduates...", type: "textarea" },
        ]} />;
      case "support":
        return <GenericSectionForm sectionLabel="Support Section" settings={settings} saving={saving} onSave={save} fields={[
          { key: "heading", label: "Section Heading", placeholder: "Need Help?" },
          { key: "description", label: "Description", placeholder: "Our support team is here to help", type: "textarea" },
          { key: "email", label: "Support Email", placeholder: "support@example.com" },
          { key: "phone", label: "Support Phone", placeholder: "+1 234 567 8900" },
          { key: "chat_link", label: "Live Chat Link", placeholder: "https://..." },
        ]} />;
      default: return null;
    }
  }

  return (
    <div className="flex gap-6">
      {/* Left sidebar nav */}
      <div className="w-64 flex-shrink-0">
        <div className="rounded-lg border bg-card overflow-hidden">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = s.key === section;
            return (
              <button
                key={s.key}
                onClick={() => router.push(s.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-b last:border-0 transition-colors text-left ${
                  isActive
                    ? "bg-primary/5 text-primary font-medium border-l-2 border-l-primary"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {t(s.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {renderForm()}
      </div>
    </div>
  );
}
