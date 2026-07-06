"use client";

import * as React from "react";
import { Loader2, Plus, Eye, Pencil, Trash2 } from "lucide-react";
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
import { TableActionButton } from "@/components/ui/table-action-button";

type LandingPage = {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerSlug: string | null;
  title: string;
  slug: string;
  headline: string | null;
  subheadline: string | null;
  industryModule: string | null;
  description: string | null;
  callToActionText: string | null;
  status: string;
};

type PartnerOption = { id: string; name: string; slug: string };

const STATUSES = ["draft", "active", "inactive"] as const;

export default function MarketingPagesAdmin() {
  const [pages, setPages] = React.useState<LandingPage[]>([]);
  const [partners, setPartners] = React.useState<PartnerOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    partnerId: "",
    title: "",
    slug: "",
    headline: "",
    subheadline: "",
    industryModule: "",
    description: "",
    callToActionText: "",
    status: "draft",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partnerships/landing-pages", { credentials: "include" });
      const d = await res.json();
      if (d?.ok) {
        setPages(d.items as LandingPage[]);
        setPartners(d.partners as PartnerOption[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      partnerId: partners[0]?.id ?? "",
      title: "",
      slug: "",
      headline: "",
      subheadline: "",
      industryModule: "",
      description: "",
      callToActionText: "",
      status: "draft",
    });
    setOpen(true);
  };

  const openEdit = (p: LandingPage) => {
    setEditingId(p.id);
    setForm({
      partnerId: p.partnerId,
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
    if (!form.partnerId) {
      toast.error("Select a partner.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/partnerships/landing-pages/${editingId}` : "/api/partnerships/landing-pages";
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
    const res = await fetch(`/api/partnerships/landing-pages/${id}`, { method: "DELETE", credentials: "include" });
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
        <Button onClick={openCreate} disabled={partners.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add landing page
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No landing pages yet.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.partnerName}</TableCell>
                  <TableCell>
                    <code className="text-xs">/p/{p.partnerSlug}/{p.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TableActionButton
                      label="Edit"
                      primaryIcon={<Pencil className="h-4 w-4" />}
                      onPrimaryClick={() => openEdit(p)}
                      className="ml-auto"
                      items={[
                        {
                          label: "View",
                          href: `/p/${p.partnerSlug}/${p.slug}`,
                          icon: <Eye className="h-4 w-4" />,
                        },
                        {
                          label: "Edit",
                          onSelect: () => openEdit(p),
                          icon: <Pencil className="h-4 w-4" />,
                        },
                        {
                          label: "Delete",
                          onSelect: () => void remove(p.id),
                          icon: <Trash2 className="h-4 w-4" />,
                          destructive: true,
                        },
                      ]}
                    />
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
            <SheetDescription>Branded landing page for a partner referral.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Partner</Label>
              <Select
                value={form.partnerId}
                onValueChange={(v) => setForm((f) => ({ ...f, partnerId: v }))}
                disabled={Boolean(editingId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-title">Title</Label>
              <Input id="lp-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-slug">Slug (optional)</Label>
              <Input
                id="lp-slug"
                placeholder="auto-generated from title"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-headline">Headline</Label>
              <Input
                id="lp-headline"
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-subheadline">Subheadline</Label>
              <Input
                id="lp-subheadline"
                value={form.subheadline}
                onChange={(e) => setForm((f) => ({ ...f, subheadline: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-industry">Industry module</Label>
              <Input
                id="lp-industry"
                placeholder="e.g. mobile-detailing"
                value={form.industryModule}
                onChange={(e) => setForm((f) => ({ ...f, industryModule: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-desc">Description</Label>
              <Textarea
                id="lp-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lp-cta">Call to action text</Label>
              <Input
                id="lp-cta"
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
