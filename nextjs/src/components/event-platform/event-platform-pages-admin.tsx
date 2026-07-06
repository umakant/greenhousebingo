"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  updatedAt: string | null;
};

export function EventPlatformPagesAdmin() {
  const [items, setItems] = React.useState<PageRow[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", slug: "", contentHtml: "", status: "draft" });

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/pages", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: PageRow[] } | null;
    setItems(res.ok && data?.ok ? data.items ?? [] : []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [items, search]);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/pages", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: PageRow; message?: string } | null;
      if (!res.ok || !data?.ok || !data.item) throw new Error(data?.message ?? "Create failed.");
      toast.success("Page created.");
      setSheetOpen(false);
      setForm({ title: "", slug: "", contentHtml: "", status: "draft" });
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
        <CardContent className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <Input className="max-w-sm" placeholder="Search pages…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button type="button" onClick={() => setSheetOpen(true)}><Plus className="mr-1 h-4 w-4" />New page</Button>
        </CardContent>
        {items === null ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <NoRecordsFound icon={FileText} title="No pages yet" description="Create custom CMS pages for your event marketplace." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={EVENT_PLATFORM_PATHS.pageEdit(p.id)}>Edit</Link>
                      </Button>
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
          <SheetHeader><SheetTitle>New page</SheetTitle></SheetHeader>
          <form id="ep-new-page" onSubmit={(e) => void createPage(e)} className="space-y-4 px-1 py-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (optional)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-from-title" />
            </div>
            <div className="space-y-1.5">
              <Label>Content (HTML)</Label>
              <Textarea rows={6} value={form.contentHtml} onChange={(e) => setForm({ ...form, contentHtml: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          <SheetFooter>
            <Button type="submit" form="ep-new-page" disabled={saving}>{saving ? "Creating…" : "Create page"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
