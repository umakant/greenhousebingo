"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

export function EventPlatformPageEditClient({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    slug: "",
    contentHtml: "",
    seoTitle: "",
    seoDescription: "",
    status: "draft",
    visibility: "public",
  });

  React.useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/event-platform/pages/${pageId}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        item?: typeof form;
        message?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.item) {
        toast.error(data?.message ?? "Page not found.");
        router.push(EVENT_PLATFORM_PATHS.pages);
        return;
      }
      setForm({
        title: data.item.title,
        slug: data.item.slug,
        contentHtml: data.item.contentHtml ?? "",
        seoTitle: data.item.seoTitle ?? "",
        seoDescription: data.item.seoDescription ?? "",
        status: data.item.status,
        visibility: data.item.visibility,
      });
      setLoading(false);
    })();
  }, [pageId, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/event-platform/pages/${pageId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Page saved.");
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
        Loading page…
      </div>
    );
  }

  return (
    <Card className="max-w-3xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edit page</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={EVENT_PLATFORM_PATHS.pages}>← Pages</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Content (HTML)</Label>
            <Textarea rows={10} value={form.contentHtml} onChange={(e) => setForm({ ...form, contentHtml: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>SEO title</Label>
              <Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>SEO description</Label>
            <Textarea rows={2} value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save page"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
