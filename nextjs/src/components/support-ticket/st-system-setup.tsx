"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Plus,
  Save,
  Pencil,
  Trash2,
  Tags,
  BookOpen,
  Palette,
  FileText,
  Heading2,
  Megaphone,
  Link2,
  Headphones,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableActionButton } from "@/components/ui/table-action-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";


const SETUP_SECTIONS: { key: string; label: string; icon: LucideIcon; description: string }[] = [
  { key: "categories", label: "Categories", icon: Tags, description: "Classify support tickets with categories." },
  { key: "knowledge-categories", label: "KnowledgeBase Category", icon: BookOpen, description: "Organize knowledge base article categories." },
  { key: "brand-settings", label: "Brand Settings", icon: Palette, description: "Logo, favicon, and portal title text." },
  { key: "custom-pages", label: "Custom Pages", icon: FileText, description: "Create additional pages for your support portal." },
  { key: "title-sections", label: "Title Sections", icon: Heading2, description: "Section headings across the support experience." },
  { key: "cta-sections", label: "CTA Sections", icon: Megaphone, description: "Call-to-action blocks and links." },
  { key: "quick-links", label: "Quick Links", icon: Link2, description: "Shortcut links shown to customers." },
  { key: "support-information", label: "Support Information", icon: Headphones, description: "Company name, hours, and contact details." },
  { key: "contact-information", label: "Contact Information", icon: Phone, description: "Contact page heading and map settings." },
];

// ─── Categories ───────────────────────────────────────────────────────────────
type StCategory = { id: string; name: string; color: string };

function CategoriesSection() {
  const [items, setItems] = React.useState<StCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", color: "#6366F1" });
  const [processing, setProcessing] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/support-ticket/categories?per_page=100");
      const data = await res.json();
      setItems(data.data ?? []);
    } catch { toast.error("Failed to load categories"); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []);

  function openAdd() { setMode("add"); setEditId(null); setForm({ name: "", color: "#6366F1" }); setOpen(true); }
  function openEdit(row: StCategory) { setMode("edit"); setEditId(row.id); setForm({ name: row.name, color: row.color }); setOpen(true); }

  async function handleSave() {
    if (!form.name) { toast.error("Name is required"); return; }
    setProcessing(true);
    try {
      const res = mode === "add"
        ? await fetch("/api/support-ticket/categories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) })
        : await fetch(`/api/support-ticket/categories/${editId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved"); setOpen(false); void load();
    } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/support-ticket/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Deleted"); void load();
    } catch { toast.error("Failed to delete"); } finally { setDeleteId(null); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /></Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">{t("Loading...")}</p> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("Category")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Color")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">{t("No categories")}</td></tr>
              ) : items.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 rounded-full text-white text-xs font-mono" style={{ backgroundColor: row.color }}>{row.color}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => openEdit(row) },
                          { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setDeleteId(row.id), destructive: true },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? t("Create Category") : t("Edit Category")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name" className="mb-1.5 block">{t("Name")}</Label>
              <Input id="cat-name" placeholder="Enter category name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cat-color" className="mb-1.5 block">{t("Color")}</Label>
              <input type="color" id="cat-color" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-full h-10 rounded border cursor-pointer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={processing}>{processing ? t("Saving...") : t("Create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Category")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Are you sure you want to delete this category?")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{t("Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── KB Categories ────────────────────────────────────────────────────────────
type KbCat = { id: string; name: string };

function KbCategoriesSection() {
  const [items, setItems] = React.useState<KbCat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "" });
  const [processing, setProcessing] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/support-ticket/kb-categories");
      const data = await res.json();
      setItems(data.data ?? []);
    } catch { toast.error("Failed to load"); } finally { setLoading(false); }
  }
  React.useEffect(() => { void load(); }, []);

  function openAdd() { setMode("add"); setEditId(null); setForm({ name: "" }); setOpen(true); }
  function openEdit(row: KbCat) { setMode("edit"); setEditId(row.id); setForm({ name: row.name }); setOpen(true); }

  async function handleSave() {
    if (!form.name) { toast.error("Name is required"); return; }
    setProcessing(true);
    try {
      const res = mode === "add"
        ? await fetch("/api/support-ticket/kb-categories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) })
        : await fetch(`/api/support-ticket/kb-categories/${editId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved"); setOpen(false); void load();
    } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/support-ticket/kb-categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Deleted"); void load();
    } catch { toast.error("Failed to delete"); } finally { setDeleteId(null); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /></Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">{t("Loading...")}</p> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("Category")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={2} className="text-center py-8 text-muted-foreground">{t("No categories")}</td></tr>
              ) : items.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => openEdit(row) },
                          { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setDeleteId(row.id), destructive: true },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? t("Create Knowledge Category") : t("Edit Knowledge Category")}</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="kbcat-title" className="mb-1.5 block">{t("Title")}</Label>
            <Input id="kbcat-title" placeholder="Enter category title" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={processing}>{processing ? t("Saving...") : t("Create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Category")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Are you sure you want to delete this category?")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{t("Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Brand Settings ───────────────────────────────────────────────────────────
function BrandSettingsSection() {
  const [form, setForm] = React.useState({ logo_url: "", favicon_url: "", title_text: "Support Center", footer_text: "Support System. All rights reserved." });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/support-ticket/settings?section=brand")
      .then(r => r.json())
      .then(d => {
        const s = d.data?.brand ?? {};
        setForm(f => ({
          logo_url: s.logo_url ?? f.logo_url,
          favicon_url: s.favicon_url ?? f.favicon_url,
          title_text: s.title_text ?? f.title_text,
          footer_text: s.footer_text ?? f.footer_text,
        }));
      }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/support-ticket/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ section: "brand", settings: form }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Settings saved");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" /> {saving ? t("Saving...") : t("Save Changes")}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("Logo")}</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg h-32 flex items-center justify-center bg-muted mb-3">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="max-h-24 object-contain" />
              ) : (
                <span className="text-2xl font-bold text-primary">ST Ticket</span>
              )}
            </div>
            <Input placeholder="logo.png" value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("Favicon")}</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg h-32 flex items-center justify-center bg-muted mb-3">
              {form.favicon_url ? (
                <img src={form.favicon_url} alt="Favicon" className="max-h-24 object-contain" />
              ) : (
                <span className="text-2xl font-bold text-primary">ST</span>
              )}
            </div>
            <Input placeholder="favicon.png" value={form.favicon_url}
              onChange={e => setForm(f => ({ ...f, favicon_url: e.target.value }))} />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label htmlFor="brand-title" className="mb-1.5 block">{t("Title Text")}</Label>
          <Input id="brand-title" value={form.title_text}
            onChange={e => setForm(f => ({ ...f, title_text: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="brand-footer" className="mb-1.5 block">{t("Footer Text")}</Label>
          <Input id="brand-footer" value={form.footer_text}
            onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))} />
        </div>
      </div>
    </div>
  );
}

// ─── Custom Pages ─────────────────────────────────────────────────────────────
type StCustomPage = { id: string; title: string; slug: string; enableFooter: boolean };

function CustomPagesSection() {
  const [items, setItems] = React.useState<StCustomPage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: "", slug: "", description: "", contents: "", enable_footer: false });
  const [processing, setProcessing] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/support-ticket/custom-pages");
      const data = await res.json();
      setItems(data.data ?? []);
    } catch { toast.error("Failed to load"); } finally { setLoading(false); }
  }
  React.useEffect(() => { void load(); }, []);

  function openAdd() { setMode("add"); setEditId(null); setForm({ title: "", slug: "", description: "", contents: "", enable_footer: false }); setOpen(true); }
  function openEdit(row: StCustomPage) {
    setMode("edit"); setEditId(row.id);
    setForm({ title: row.title, slug: row.slug, description: "", contents: "", enable_footer: row.enableFooter });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title || !form.slug) { toast.error("Title and slug are required"); return; }
    setProcessing(true);
    try {
      const res = mode === "add"
        ? await fetch("/api/support-ticket/custom-pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) })
        : await fetch(`/api/support-ticket/custom-pages/${editId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved"); setOpen(false); void load();
    } finally { setProcessing(false); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /></Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">{t("Loading...")}</p> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("Title")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Slug")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Footer")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{t("No custom pages")}</td></tr>
              ) : items.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{row.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${row.enableFooter ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {row.enableFooter ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => openEdit(row) },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? t("Create Custom Page") : t("Edit Custom Page")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t("Title")}</Label>
              <Input placeholder="Enter page title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("URL Slug")}</Label>
              <Input placeholder="e.g., privacy-policy" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />
              <p className="text-xs text-muted-foreground mt-1">Only lowercase letters and hyphens allowed</p>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("Description")}</Label>
              <Textarea placeholder="Enter page description" rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("Contents")}</Label>
              <Textarea placeholder="Enter page contents..." rows={5} value={form.contents}
                onChange={e => setForm(f => ({ ...f, contents: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.enable_footer} onCheckedChange={v => setForm(f => ({ ...f, enable_footer: v }))} />
              <Label>{t("Enable Page Footer")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Create") : t("Update")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Quick Links ──────────────────────────────────────────────────────────────
type QuickLink = { id: string; title: string; icon?: string | null; link?: string | null };

function QuickLinksSection() {
  const [items, setItems] = React.useState<QuickLink[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: "", icon: "", link: "" });
  const [processing, setProcessing] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/support-ticket/quick-links");
      const data = await res.json();
      setItems(data.data ?? []);
    } catch { toast.error("Failed to load"); } finally { setLoading(false); }
  }
  React.useEffect(() => { void load(); }, []);

  function openAdd() { setMode("add"); setEditId(null); setForm({ title: "", icon: "", link: "" }); setOpen(true); }
  function openEdit(row: QuickLink) { setMode("edit"); setEditId(row.id); setForm({ title: row.title, icon: row.icon ?? "", link: row.link ?? "" }); setOpen(true); }

  async function handleSave() {
    if (!form.title) { toast.error("Title is required"); return; }
    setProcessing(true);
    try {
      const res = mode === "add"
        ? await fetch("/api/support-ticket/quick-links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) })
        : await fetch(`/api/support-ticket/quick-links/${editId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Saved"); setOpen(false); void load();
    } finally { setProcessing(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/support-ticket/quick-links/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success("Deleted"); void load();
    } catch { toast.error("Failed to delete"); } finally { setDeleteId(null); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /></Button>
      </div>
      {loading ? <p className="text-muted-foreground text-sm">{t("Loading...")}</p> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("Title")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Icon")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Link")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{t("No quick links")}</td></tr>
              ) : items.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.icon ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.link ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => openEdit(row) },
                          { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setDeleteId(row.id), destructive: true },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? t("Add Quick Link") : t("Edit Quick Link")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t("Title")}</Label>
              <Input placeholder="e.g., User Guides" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("Icon")} <span className="text-muted-foreground text-xs">(icon name)</span></Label>
              <Input placeholder="e.g., book, video, lightbulb" value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("Link URL")}</Label>
              <Input placeholder="https://..." value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={processing}>{processing ? t("Saving...") : mode === "add" ? t("Create") : t("Update")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Quick Link")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Are you sure?")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{t("Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Generic Settings Section ─────────────────────────────────────────────────
function GenericSettingsSection({ section, title, fields }: {
  section: string; title: string;
  fields: { key: string; label: string; type?: "text" | "textarea" | "email" | "tel"; placeholder?: string }[];
}) {
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/support-ticket/settings?section=${section}`)
      .then(r => r.json())
      .then(d => {
        const s = d.data?.[section] ?? {};
        setForm(s);
      }).catch(() => {});
  }, [section]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/support-ticket/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ section, settings: form }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Settings saved");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" /> {saving ? t("Saving...") : t("Save Changes")}
        </Button>
      </div>
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={`${section}-${field.key}`} className="mb-1.5 block">
              {t(field.label)}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={`${section}-${field.key}`}
                rows={4}
                placeholder={field.placeholder}
                value={form[field.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
              />
            ) : field.type === "tel" ? (
              <PhoneInput
                id={`${section}-${field.key}`}
                placeholder={field.placeholder ?? "(000) 000-0000"}
                value={form[field.key] ?? ""}
                onChange={(value) => setForm((f) => ({ ...f, [field.key]: value }))}
              />
            ) : (
              <Input
                id={`${section}-${field.key}`}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={form[field.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
// ─── Title Sections ───────────────────────────────────────────────────────────
function TitleSectionsSection() {
  const sections = [
    { prefix: "create_ticket", label: "Create Ticket Section" },
    { prefix: "search_ticket", label: "Search Ticket Section" },
    { prefix: "knowledge_base", label: "Knowledge Base Section" },
    { prefix: "faq", label: "FAQ Section" },
    { prefix: "contact", label: "Contact Section" },
  ];

  const [form, setForm] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/support-ticket/settings?section=title_sections")
      .then(r => r.json())
      .then(d => setForm(d.data?.title_sections ?? {}))
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/support-ticket/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ section: "title_sections", settings: form }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      toast.success(json.message ?? "Settings saved");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" /> {saving ? t("Saving...") : t("Save Changes")}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(s => (
          <Card key={s.prefix}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t(s.label)}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs">{t("Title")}</Label>
                <Input placeholder={`Enter ${s.label.toLowerCase()} title`}
                  value={form[`${s.prefix}_title`] ?? ""}
                  onChange={e => setForm(f => ({ ...f, [`${s.prefix}_title`]: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">{t("Description")}</Label>
                <Textarea rows={3} placeholder={`Enter ${s.label.toLowerCase()} description`}
                  value={form[`${s.prefix}_description`] ?? ""}
                  onChange={e => setForm(f => ({ ...f, [`${s.prefix}_description`]: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── CTA Sections ─────────────────────────────────────────────────────────────
function CtaSectionsSection() {
  return (
    <GenericSettingsSection
      section="cta_sections"
      title="CTA Sections"
      fields={[
        { key: "title", label: "CTA Title", placeholder: "e.g., Need Help? Contact Support" },
        { key: "description", label: "CTA Description", type: "textarea", placeholder: "Enter CTA description" },
        { key: "button_text", label: "Button Text", placeholder: "e.g., Get Support" },
        { key: "button_link", label: "Button Link", placeholder: "https://..." },
      ]}
    />
  );
}

// ─── Main System Setup Component ──────────────────────────────────────────────
export function StSystemSetup({ section }: { section: string }) {
  function renderContent() {
    switch (section) {
      case "categories": return <CategoriesSection />;
      case "knowledge-categories": return <KbCategoriesSection />;
      case "brand-settings": return <BrandSettingsSection />;
      case "custom-pages": return <CustomPagesSection />;
      case "title-sections": return <TitleSectionsSection />;
      case "cta-sections": return <CtaSectionsSection />;
      case "quick-links": return <QuickLinksSection />;
      case "support-information":
        return (
          <GenericSettingsSection
            section="support_info"
            title="Support Information"
            fields={[
              { key: "company_name", label: "Company Name", placeholder: "Your Company" },
              { key: "support_email", label: "Support Email", type: "email", placeholder: "support@example.com" },
              { key: "support_phone", label: "Support Phone", type: "tel", placeholder: "(000) 000-0000" },
              { key: "working_hours", label: "Working Hours", placeholder: "Mon-Fri: 9AM - 6PM" },
              { key: "address", label: "Address", type: "textarea", placeholder: "Enter address" },
            ]}
          />
        );
      case "contact-information":
        return (
          <GenericSettingsSection
            section="contact_info"
            title="Contact Information"
            fields={[
              { key: "heading", label: "Heading", placeholder: "Contact Us" },
              { key: "subheading", label: "Sub Heading", placeholder: "Get in touch with our team" },
              { key: "email", label: "Email", type: "email", placeholder: "contact@example.com" },
              { key: "phone", label: "Phone", type: "tel", placeholder: "(000) 000-0000" },
              { key: "map_embed", label: "Map Embed URL", placeholder: "https://maps.google.com/..." },
            ]}
          />
        );
      default:
        return (
          <div className="text-muted-foreground py-12 text-center">
            <p>{t("Section not found")}: {section}</p>
          </div>
        );
    }
  }

  const meta = SETUP_SECTIONS.find((s) => s.key === section) ?? SETUP_SECTIONS[0];
  const SectionIcon = meta.icon;

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="shrink-0 md:w-64">
        <div className="md:sticky md:top-4">
          <div className="md:hidden -mx-3 px-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SETUP_SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = section === s.key;
                return (
                  <Button
                    key={s.key}
                    asChild
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    <Link href={`/support-ticket/system-setup/${s.key}`} className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {t(s.label)}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>

          <ScrollArea className="hidden h-[min(70vh,calc(100vh-8rem))] md:block">
            <div className="space-y-1 pr-4">
              {SETUP_SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = section === s.key;
                return (
                  <Button
                    key={s.key}
                    asChild
                    variant="ghost"
                    className={cn("w-full justify-start", active && "bg-muted font-medium")}
                  >
                    <Link href={`/support-ticket/system-setup/${s.key}`} className="inline-flex items-center gap-2">
                      <Icon className="mr-2 h-4 w-4 shrink-0" />
                      {t(s.label)}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="pt-4">
          <section id={`sec-${section}`} className="scroll-mt-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <SectionIcon className="h-5 w-5 shrink-0" />
                    {t(meta.label)}
                  </CardTitle>
                  <CardDescription className="mt-1">{t(meta.description)}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>{renderContent()}</CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
