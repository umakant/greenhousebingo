"use client";

import * as React from "react";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type PopupRow = {
  id: string;
  title: string;
  popupType: string;
  isActive: boolean;
  priorityOrder: number;
  displayLocation: string;
};

const POPUP_TYPES = ["text", "image", "newsletter", "countdown", "video", "fullscreen", "banner"];

export function EventPlatformPopupsAdmin() {
  const [items, setItems] = React.useState<PopupRow[] | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    popupType: "text",
    contentHtml: "",
    isActive: false,
    displayLocation: "all",
    frequency: "once_per_session",
  });

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/popups", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: PopupRow[] } | null;
    setItems(res.ok && data?.ok ? data.items ?? [] : []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function toggleActive(row: PopupRow) {
    const res = await fetch(`/api/event-platform/popups?id=${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    if (res.ok) void reload();
  }

  async function createPopup(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/popups", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Create failed.");
      toast.success("Popup created.");
      setSheetOpen(false);
      setForm({ title: "", popupType: "text", contentHtml: "", isActive: false, displayLocation: "all", frequency: "once_per_session" });
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="flex justify-end border-b p-4">
          <Button type="button" onClick={() => setSheetOpen(true)}><Plus className="mr-1 h-4 w-4" />New popup</Button>
        </CardContent>
        {items === null ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <NoRecordsFound icon={Megaphone} title="No popups" description="Create announcement popups for the customer portal and checkout." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell><Badge variant="outline">{p.popupType}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{p.displayLocation}</TableCell>
                    <TableCell>
                      <Switch checked={p.isActive} onCheckedChange={() => void toggleActive(p)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader><SheetTitle>New popup</SheetTitle></SheetHeader>
          <form id="ep-new-popup" onSubmit={(e) => void createPopup(e)} className="space-y-4 px-1 py-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.popupType} onValueChange={(v) => setForm({ ...form, popupType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POPUP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea rows={4} value={form.contentHtml} onChange={(e) => setForm({ ...form, contentHtml: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label className="font-normal">Active on save</Label>
            </div>
          </form>
          <SheetFooter>
            <Button type="submit" form="ep-new-popup" disabled={saving}>{saving ? "Creating…" : "Create popup"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
