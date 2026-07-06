"use client";

import * as React from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { availableLanguages } from "@/utils/languages";
import { t } from "@/lib/admin-t";


type LangRow = { lang: string };

export default function EmailTemplateEdit({ id }: { id: string }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [moduleName, setModuleName] = React.useState("");

  const [langs, setLangs] = React.useState<LangRow[]>([]);
  const [lang, setLang] = React.useState("en");

  const [subject, setSubject] = React.useState("");
  const [content, setContent] = React.useState("");
  const [variables, setVariables] = React.useState<Record<string, any>>({});

  const load = React.useCallback(async (language?: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("lang", language || lang);
      const res = await fetch(`/api/email-templates/${encodeURIComponent(id)}?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load template.");

      setName(String(json?.emailTemplate?.name ?? ""));
      setFrom(String(json?.emailTemplate?.from ?? ""));
      setModuleName(String(json?.emailTemplate?.moduleName ?? ""));
      setLangs((json?.templateLangs ?? []) as LangRow[]);
      setLang(String(json?.curr?.lang ?? (language || lang)));
      setSubject(String(json?.curr?.subject ?? ""));
      setContent(String(json?.curr?.content ?? ""));
      setVariables((json?.variables ?? {}) as Record<string, any>);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load template.");
    } finally {
      setLoading(false);
    }
  }, [id, lang]);

  React.useEffect(() => {
    void load("en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveContent = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, subject, content }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Save failed.");
      toast.success(t("Saved."));
      await load(lang);
    } catch (e: any) {
      toast.error(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveMeta = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${encodeURIComponent(id)}/meta`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Save failed.");
      toast.success(t("Saved."));
      await load(lang);
    } catch (e: any) {
      toast.error(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">{t("Loading...")}</div>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-lg">{t("Variables")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {Object.entries(variables || {}).length ? (
                Object.entries(variables || {}).map(([key, value]) => (
                  <div key={key}>
                    <p>
                      {key}: <span className="text-primary font-mono">{`{${String(value)}}`}</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">{t("No variables available.")}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-lg">{t("Template Details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("Name")}</Label>
              <Input value={name} disabled />
            </div>
            <div>
              <Label>{t("From Name")}</Label>
              <Input value={from} onChange={(e) => setFrom(e.target.value)} required />
            </div>
            <div className="flex justify-end">
              <Button type="button" disabled={saving} className="min-w-24" onClick={saveMeta}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? t("Saving...") : t("Save Changes")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 lg:col-span-8 space-y-6">
        <Card>
          <CardHeader className="p-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-lg">{availableLanguages.find((l) => l.code === lang)?.flag}</span>
              {t("Content for")} {availableLanguages.find((l) => l.code === lang)?.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={lang}
                onValueChange={(next) => {
                  setLang(next);
                  void load(next);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      <div className="flex items-center gap-2">
                        <span>{language.flag}</span>
                        <span>{language.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0" />
        </Card>

        <Card>
          <CardContent className="space-y-6 p-3">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                {t("Subject")}
              </Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("Enter email subject")} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                {t("Email Message")}
              </Label>
              <RichTextEditor content={content} onChange={setContent} placeholder={t("Enter email content with HTML and variables")} />
            </div>

            <div className="flex justify-end">
              <Button type="button" disabled={saving} className="min-w-24" onClick={saveContent}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? t("Saving...") : t("Save Changes")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

