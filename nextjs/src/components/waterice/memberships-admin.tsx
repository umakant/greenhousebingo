"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Loader2, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import NoRecordsFound from "@/components/no-records-found";
import { t } from "@/lib/admin-t";


type Membership = {
  id: string;
  name: string;
  slug: string;
  price: number;
  billingPeriod: string;
  tagline: string;
  perks: string[];
  badge: string | null;
  ctaLabel: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
};

type FormState = {
  name: string;
  price: string;
  billingPeriod: string;
  tagline: string;
  perks: string[];
  badge: string;
  ctaLabel: string;
  featured: boolean;
  published: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  billingPeriod: "month",
  tagline: "",
  perks: [],
  badge: "",
  ctaLabel: "Join",
  featured: false,
  published: true,
  sortOrder: "0",
};

function toForm(m: Membership): FormState {
  return {
    name: m.name,
    price: String(m.price),
    billingPeriod: m.billingPeriod,
    tagline: m.tagline,
    perks: [...m.perks],
    badge: m.badge ?? "",
    ctaLabel: m.ctaLabel,
    featured: m.featured,
    published: m.published,
    sortOrder: String(m.sortOrder),
  };
}

export function MembershipsAdmin() {
  const [items, setItems] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Membership | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [perkOptions, setPerkOptions] = useState<string[]>([]);
  const [perkSearch, setPerkSearch] = useState("");
  const [newPerk, setNewPerk] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/waterice/memberships", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; items?: Membership[] } | null;
      if (res.ok && json?.ok && Array.isArray(json.items)) {
        setItems(json.items);
      } else {
        toast.error("Failed to load membership plans.");
      }
    } catch {
      toast.error("Network error loading membership plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Known perks across every plan, used as the checkbox option list.
  const knownPerks = (extra: string[] = []) => {
    const seen: string[] = [];
    for (const m of items) {
      for (const perk of m.perks) if (!seen.includes(perk)) seen.push(perk);
    }
    for (const perk of extra) if (!seen.includes(perk)) seen.push(perk);
    return seen;
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, perks: [], sortOrder: String(items.length) });
    setPerkOptions(knownPerks());
    setPerkSearch("");
    setNewPerk("");
    setDialogOpen(true);
  };

  const openEdit = (m: Membership) => {
    setEditing(m);
    setForm(toForm(m));
    setPerkOptions(knownPerks(m.perks));
    setPerkSearch("");
    setNewPerk("");
    setDialogOpen(true);
  };

  const togglePerk = (perk: string) => {
    setForm((f) => ({
      ...f,
      perks: f.perks.includes(perk) ? f.perks.filter((p) => p !== perk) : [...f.perks, perk],
    }));
  };

  const addCustomPerk = () => {
    const value = newPerk.trim();
    if (!value) return;
    setPerkOptions((opts) => (opts.includes(value) ? opts : [...opts, value]));
    setForm((f) => ({ ...f, perks: f.perks.includes(value) ? f.perks : [...f.perks, value] }));
    setNewPerk("");
  };

  const filteredPerkOptions = perkSearch.trim()
    ? perkOptions.filter((p) => p.toLowerCase().includes(perkSearch.trim().toLowerCase()))
    : perkOptions;
  const allFilteredChecked =
    filteredPerkOptions.length > 0 && filteredPerkOptions.every((p) => form.perks.includes(p));

  const toggleAllPerks = () => {
    if (allFilteredChecked) {
      setForm((f) => ({ ...f, perks: f.perks.filter((p) => !filteredPerkOptions.includes(p)) }));
    } else {
      setForm((f) => ({ ...f, perks: Array.from(new Set([...f.perks, ...filteredPerkOptions])) }));
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Plan name is required.");
      return;
    }
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      price: priceNum,
      billingPeriod: form.billingPeriod.trim() || "month",
      tagline: form.tagline.trim(),
      perks: form.perks.map((p) => p.trim()).filter((p) => p.length > 0),
      badge: form.badge.trim(),
      ctaLabel: form.ctaLabel.trim() || "Join",
      featured: form.featured,
      published: form.published,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      const res = await fetch(
        editing ? `/api/waterice/memberships/${editing.id}` : "/api/waterice/memberships",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json?.message || "Could not save the plan.");
        return;
      }
      toast.success(editing ? "Plan updated." : "Plan created.");
      setDialogOpen(false);
      await load();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Membership) => {
    if (!window.confirm(`Delete the "${m.name}" plan? This cannot be undone.`)) return;
    setDeletingId(m.id);
    try {
      const res = await fetch(`/api/waterice/memberships/${m.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json?.message || "Could not delete the plan.");
        return;
      }
      toast.success("Plan deleted.");
      setItems((prev) => prev.filter((x) => x.id !== m.id));
    } catch {
      toast.error("Network error while deleting.");
    } finally {
      setDeletingId(null);
    }
  };

  // Union of every plan's perks (first-seen order) for the comparison matrix.
  const allPerks = useMemo(() => {
    const seen: string[] = [];
    for (const m of items) {
      for (const perk of m.perks) {
        if (!seen.includes(perk)) seen.push(perk);
      }
    }
    return seen;
  }, [items]);

  const priceLabel = (m: Membership) =>
    m.price <= 0 ? "Free" : `$${m.price.toFixed(2)}`;

  const gridTemplate = {
    gridTemplateColumns: `260px repeat(${items.length || 1}, minmax(240px, 1fr))`,
    minWidth: `${260 + (items.length || 1) * 240 + (items.length || 1) * 16}px`,
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("Plans shown on the public")}{" "}
          <a href="/memberships" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {t("Memberships")}
          </a>{" "}
          {t("page. Compare perks and pricing, and edit plans from here.")}
        </p>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> {t("Create Plan")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <NoRecordsFound
          icon={Crown}
          title={t("No membership plans yet")}
          description={t("Create your first plan to show it on the Memberships page.")}
        />
      ) : (
        <div className="space-y-4 overflow-x-auto px-1 pb-2 pt-5">
          {/* Plan header cards */}
          <div className="grid gap-4" style={gridTemplate}>
            <div className="flex items-center justify-center rounded-2xl border bg-card p-6">
              <h3 className="text-lg font-bold text-foreground">{t("Membership Plans")}</h3>
            </div>

            {items.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 bg-card p-6 ${
                  plan.featured ? "border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" : "border-border"
                }`}
              >
                {plan.featured ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow">
                      <Crown className="h-3.5 w-3.5" />
                      {plan.badge?.trim() || t("Most Popular")}
                    </Badge>
                  </div>
                ) : null}

                <div className="absolute right-3 top-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(plan)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("Edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => void remove(plan)}
                        disabled={deletingId === plan.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("Delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-4 text-center">
                  <div className="px-6">
                    <h3 className="mb-1 text-lg font-bold text-foreground">{plan.name}</h3>
                    {plan.tagline ? (
                      <p className="line-clamp-3 text-xs text-muted-foreground">{plan.tagline}</p>
                    ) : null}
                  </div>

                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-foreground">{priceLabel(plan)}</span>
                    {plan.price > 0 ? (
                      <span className="text-lg font-semibold text-muted-foreground">/{plan.billingPeriod}</span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {plan.perks.length} {t("perks")}
                    </span>
                    {plan.published ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">{t("Published")}</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">{t("Hidden")}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Perks comparison matrix */}
          {allPerks.length > 0 ? (
            <div className="grid gap-4" style={gridTemplate}>
              <div className="rounded-2xl border bg-card p-6">
                <div className="mb-3 flex h-10 items-center border-b">
                  <span className="text-sm font-semibold text-foreground">{t("Perks")}</span>
                </div>
                <div className="space-y-2">
                  {allPerks.map((perk) => (
                    <div key={perk} className="flex min-h-7 items-center text-sm text-muted-foreground">
                      {perk}
                    </div>
                  ))}
                </div>
              </div>

              {items.map((plan) => {
                const enabled = allPerks.filter((p) => plan.perks.includes(p)).length;
                return (
                  <div key={plan.id} className="rounded-2xl border bg-card p-6">
                    <div className="mb-3 flex h-10 items-center justify-center border-b">
                      <span className="text-sm font-semibold text-foreground">
                        {enabled}/{allPerks.length} {t("Included")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {allPerks.map((perk) => {
                        const has = plan.perks.includes(perk);
                        return (
                          <div key={perk} className="flex min-h-7 items-center justify-center">
                            {has ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                                <Check className="h-3 w-3 text-emerald-600" />
                              </span>
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                                <X className="h-3 w-3 text-muted-foreground" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-6 text-left">
            <SheetTitle>{editing ? t("Edit membership plan") : t("New membership plan")}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">{t("Plan name")}</Label>
              <Input
                id="m-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Frozen Fortune Insider"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-price">{t("Price")}</Label>
                <Input
                  id="m-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="19.99"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-period">{t("Billing period")}</Label>
                <Input
                  id="m-period"
                  value={form.billingPeriod}
                  onChange={(e) => setForm((f) => ({ ...f, billingPeriod: e.target.value }))}
                  placeholder="month"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-tagline">{t("Tagline")}</Label>
              <Textarea
                id="m-tagline"
                rows={2}
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder={t("Short description shown under the price.")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("Included perks")}</Label>
                <span className="text-xs text-muted-foreground">
                  {form.perks.length} {t("selected")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={perkSearch}
                  onChange={(e) => setPerkSearch(e.target.value)}
                  placeholder={t("Search perks...")}
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={toggleAllPerks}
                  disabled={filteredPerkOptions.length === 0}
                >
                  {allFilteredChecked ? t("Uncheck all") : t("Check all")}
                </Button>
              </div>

              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border p-2">
                {filteredPerkOptions.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                    {perkSearch.trim()
                      ? t("No perks match your search.")
                      : t("No perks yet. Add your first perk below.")}
                  </p>
                ) : (
                  filteredPerkOptions.map((perk) => {
                    const checked = form.perks.includes(perk);
                    return (
                      <label
                        key={perk}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                          checked ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => togglePerk(perk)} />
                        <span className="flex-1">{perk}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomPerk();
                    }
                  }}
                  placeholder={t("Add a new perk...")}
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={addCustomPerk}
                  disabled={!newPerk.trim()}
                >
                  <Plus className="h-4 w-4" />
                  {t("Add")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-badge">{t("Badge (optional)")}</Label>
                <Input
                  id="m-badge"
                  value={form.badge}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  placeholder="Most Popular"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-cta">{t("Button label")}</Label>
                <Input
                  id="m-cta"
                  value={form.ctaLabel}
                  onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                  placeholder="Join"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-order">{t("Sort order")}</Label>
                <Input
                  id="m-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t("Featured")}</p>
                <p className="text-xs text-muted-foreground">{t("Highlight this plan as recommended.")}</p>
              </div>
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t("Published")}</p>
                <p className="text-xs text-muted-foreground">{t("Show this plan on the public Memberships page.")}</p>
              </div>
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
            </div>
          </div>

          <SheetFooter className="border-t p-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t("Cancel")}
            </Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? t("Save changes") : t("Create plan")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
