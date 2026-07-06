"use client";

import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OfflinePaymentMethod } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformPaymentsOfflineAdmin() {
  const [items, setItems] = React.useState<OfflinePaymentMethod[] | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/payments?type=offline", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: OfflinePaymentMethod[] } | null;
      setItems(res.ok && data?.ok ? data.items ?? [] : []);
    })();
  }, []);

  function patch(id: string, patch: Partial<OfflinePaymentMethod>) {
    setItems((prev) => (prev ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addMethod() {
    setItems((prev) => [
      ...(prev ?? []),
      {
        id: `custom_${Date.now()}`,
        name: "New method",
        description: "",
        instructions: "",
        requireProof: false,
        enabled: true,
        sortOrder: (prev?.length ?? 0) + 1,
      },
    ]);
  }

  async function save() {
    if (!items) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/payments", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "offline", items }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Offline payment methods saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {items.map((m) => (
        <Card key={m.id} className="shadow-sm">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={m.enabled} onCheckedChange={(v) => patch(m.id, { enabled: v })} />
                <span className="text-sm font-medium">{m.name}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setItems((prev) => (prev ?? []).filter((x) => x.id !== m.id))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={m.name} onChange={(e) => patch(m.id, { name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Instructions</Label>
              <Textarea rows={2} value={m.instructions} onChange={(e) => patch(m.id, { instructions: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={m.requireProof} onCheckedChange={(v) => patch(m.id, { requireProof: v })} />
              <Label className="font-normal">Require payment proof upload</Label>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={addMethod}><Plus className="mr-1 h-4 w-4" />Add method</Button>
        <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save methods"}</Button>
      </div>
    </div>
  );
}
