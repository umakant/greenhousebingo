"use client";

import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { EventPlatformLanguage } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformLanguagesAdmin() {
  const [languages, setLanguages] = React.useState<EventPlatformLanguage[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/languages", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        languages?: EventPlatformLanguage[];
      } | null;
      if (res.ok && data?.ok && data.languages) setLanguages(data.languages);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!languages) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/languages", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ languages }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Languages saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function addLanguage() {
    if (!languages) return;
    setLanguages([
      ...languages,
      { code: "es", name: "Spanish", isDefault: false, isActive: true },
    ]);
  }

  if (loading || !languages) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <Card className="max-w-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Languages</CardTitle>
        <CardDescription>Locales available on the event platform storefront.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          {languages.map((lang, i) => (
            <div key={`${lang.code}-${i}`} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={lang.code}
                  onChange={(e) => {
                    const next = [...languages];
                    next[i] = { ...lang, code: e.target.value };
                    setLanguages(next);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={lang.name}
                  onChange={(e) => {
                    const next = [...languages];
                    next[i] = { ...lang, name: e.target.value };
                    setLanguages(next);
                  }}
                />
              </div>
              <div className="flex items-center gap-4 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={lang.isActive}
                    onCheckedChange={(v) => {
                      const next = [...languages];
                      next[i] = { ...lang, isActive: v };
                      setLanguages(next);
                    }}
                  />
                  <span className="text-sm">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={lang.isDefault}
                    onCheckedChange={(v) => {
                      const next = languages.map((l, j) => ({
                        ...l,
                        isDefault: j === i ? v : v ? false : l.isDefault,
                      }));
                      setLanguages(next);
                    }}
                  />
                  <span className="text-sm">Default</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setLanguages(languages.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addLanguage}>
              <Plus className="mr-2 h-4 w-4" />
              Add language
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save languages
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
