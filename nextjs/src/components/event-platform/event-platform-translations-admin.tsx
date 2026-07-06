"use client";

import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TranslationEntry = { key: string; value: string };

export function EventPlatformTranslationsAdmin() {
  const [locale, setLocale] = React.useState("en");
  const [locales, setLocales] = React.useState<string[]>(["en"]);
  const [store, setStore] = React.useState<Record<string, Record<string, string>>>({});
  const [entries, setEntries] = React.useState<TranslationEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const [langRes, trRes] = await Promise.all([
        fetch("/api/event-platform/settings/languages", { credentials: "include" }),
        fetch("/api/event-platform/settings/translations", { credentials: "include" }),
      ]);
      const langData = (await langRes.json().catch(() => null)) as {
        ok?: boolean;
        languages?: { code: string }[];
      } | null;
      const trData = (await trRes.json().catch(() => null)) as {
        ok?: boolean;
        translations?: Record<string, Record<string, string>>;
      } | null;
      const codes =
        langRes.ok && langData?.ok && langData.languages?.length
          ? langData.languages.map((l) => l.code)
          : ["en"];
      setLocales(codes);
      setLocale(codes[0] ?? "en");
      if (trRes.ok && trData?.ok && trData.translations) setStore(trData.translations);
      setLoading(false);
    })();
  }, []);

  React.useEffect(() => {
    const map = store[locale] ?? {};
    setEntries(
      Object.entries(map).map(([key, value]) => ({ key, value })).length
        ? Object.entries(map).map(([key, value]) => ({ key, value }))
        : [{ key: "events.title", value: "Events" }],
    );
  }, [locale, store]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nextLocaleMap: Record<string, string> = {};
      for (const row of entries) {
        const k = row.key.trim();
        if (k) nextLocaleMap[k] = row.value;
      }
      const nextStore = { ...store, [locale]: nextLocaleMap };
      const res = await fetch("/api/event-platform/settings/translations", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ translations: nextStore }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      setStore(nextStore);
      toast.success("Translations saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <Card className="max-w-3xl shadow-sm">
      <CardHeader>
        <CardTitle>Translations</CardTitle>
        <CardDescription>Override UI strings per locale for the event platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Locale</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {entries.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Key (e.g. events.title)"
                value={row.key}
                onChange={(e) => {
                  const next = [...entries];
                  next[i] = { ...row, key: e.target.value };
                  setEntries(next);
                }}
              />
              <Input
                placeholder="Translation"
                value={row.value}
                onChange={(e) => {
                  const next = [...entries];
                  next[i] = { ...row, value: e.target.value };
                  setEntries(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEntries(entries.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEntries([...entries, { key: "", value: "" }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add row
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save translations
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
