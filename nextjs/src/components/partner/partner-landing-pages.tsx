"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  SheetDescription,
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

type LandingPage = {
  id: string;
  title: string;
  slug: string;
  headline: string | null;
  subheadline: string | null;
  industryModule: string | null;
  description: string | null;
  callToActionText: string | null;
  status: string;
};

const STATUSES = ["draft", "active", "inactive"] as const;

const EMPTY = {
  title: "",
  slug: "",
  headline: "",
  subheadline: "",
  industryModule: "",
  description: "",
  callToActionText: "",
  status: "draft",
};

export default function PartnerLandingPages({ slug }: { slug: string }) {
  const [pages, setPages] = React.useState<LandingPage[]>([]);
  const [origin, setOrigin] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ ...EMPTY });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/landing-pages", { credentials: "include" });
      const d = await res.json();
      if (d?.ok) setPages(d.items as LandingPage[]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setOrigin(window.location.origin);
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const openEdit = (p: LandingPage) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      headline: p.headline ?? "",
      subheadline: p.subheadline ?? "",
      industryModule: p.industryModule ?? "",
      description: p.description ?? "",
      callToActionText: p.callToActionText ?? "",
      status: p.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/partner/landing-pages/${editingId}` : "/api/partner/landing-pages";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        toast.success(editingId ? "Page updated" : "Page created");
        setOpen(false);
        void load();
      } else {
        toast.error(d?.message ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/partner/landing-pages/${id}`, { method: "DELETE", credentials: "include" });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      toast.success("Page deleted");
      void load();
    } else {
      toast.error(d?.message ?? "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add landing page
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No landing pages yet.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>
                    <code className="text-xs">
                      /p/{slug}/{p.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit landing page" : "Add landing page"}</SheetTitle>
            <SheetDescription>Branded page shown at /p/{slug}/your-slug.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plp-title">Title</Label>
              <Input id="plp-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plp-slug">Slug (optional)</Label>
              <Input
                id="plp-slug"
                placeholder="auto-generated from title"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plp-headline">Headline</Label>
              <Input
                id="plp-headline"
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plp-sub">Subheadline</Label>
              <Input
                id="plp-sub"
                value={form.subheadline}
                onChange={(e) => setForm((f) => ({ ...f, subheadline: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plp-industry">Industry module</Label>
              <Input
                id="plp-industry"
                placeholder="e.g. mobile-detailing"
                value={form.industryModule}
                onChange={(e) => setForm((f) => ({ ...f, industryModule: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plp-desc">Description</Label>
              <Textarea
                id="plp-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plp-cta">Call to action text</Label>
              <Input
                id="plp-cta"
                placeholder="Get started"
                value={form.callToActionText}
                onChange={(e) => setForm((f) => ({ ...f, callToActionText: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
