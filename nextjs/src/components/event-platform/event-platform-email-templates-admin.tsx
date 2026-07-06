"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventPlatformEmailTemplate } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformEmailTemplatesAdmin() {
  const [templates, setTemplates] = React.useState<EventPlatformEmailTemplate[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/email-templates", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        templates?: EventPlatformEmailTemplate[];
      } | null;
      if (res.ok && data?.ok && data.templates) setTemplates(data.templates);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!templates) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/email-templates", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templates }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Templates saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !templates?.length) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const tpl = templates[activeIdx];

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          {templates.map((t, i) => (
            <button
              key={t.slug}
              type="button"
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${i === activeIdx ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
              onClick={() => setActiveIdx(i)}
            >
              {t.name}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{tpl.name}</CardTitle>
          <CardDescription>
            Slug: <code className="text-xs">{tpl.slug}</code> — use {"{{event_title}}"}, {"{{attendee_name}}"}, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void save(e)} className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                value={tpl.subject}
                onChange={(e) => {
                  const next = [...templates];
                  next[activeIdx] = { ...tpl, subject: e.target.value };
                  setTemplates(next);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Body HTML</Label>
              <Textarea
                rows={12}
                value={tpl.bodyHtml}
                onChange={(e) => {
                  const next = [...templates];
                  next[activeIdx] = { ...tpl, bodyHtml: e.target.value };
                  setTemplates(next);
                }}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save template
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
