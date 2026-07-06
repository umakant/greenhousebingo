"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

type CategoryRow = { id: string; name: string };
type CompanyRow = { id: string; name: string };


export default function HelpdeskTicketCreateDialog({
  categories,
  companies,
  isSuperAdmin,
  canCreate,
  triggerVariant = "icon",
}: {
  categories: CategoryRow[];
  companies: CompanyRow[];
  isSuperAdmin: boolean;
  canCreate: boolean;
  triggerVariant?: "icon" | "button";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [data, setData] = React.useState({
    title: "",
    description: "",
    priority: "medium",
    category_id: categories?.[0]?.id ?? "",
    company_id: companies?.[0]?.id ?? "",
  });

  React.useEffect(() => {
    setData((p) => ({
      ...p,
      category_id: p.category_id || categories?.[0]?.id || "",
      company_id: p.company_id || companies?.[0]?.id || "",
    }));
  }, [categories, companies]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setErrors({});
    setProcessing(true);
    try {
      const res = await fetch("/api/helpdesk-tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          priority: data.priority,
          category_id: data.category_id || null,
          company_id: isSuperAdmin ? data.company_id || null : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to create ticket.");

      setOpen(false);
      setData((p) => ({ ...p, title: "", description: "", priority: "medium" }));
      router.refresh();
      if (json?.id) router.push(`/helpdesk-tickets/${String(json.id)}`);
    } catch (err: any) {
      const msg = String(err?.message || "");
      setErrors({
        title: msg.toLowerCase().includes("title") ? msg : "",
        description: msg.toLowerCase().includes("description") ? msg : "",
        general: !msg.toLowerCase().includes("title") && !msg.toLowerCase().includes("description") ? msg : "",
      });
    } finally {
      setProcessing(false);
    }
  }

  const trigger =
    triggerVariant === "button" ? (
      <SheetTrigger asChild>
        <Button size="sm" disabled={!canCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" />
          {t("Create Ticket")}
        </Button>
      </SheetTrigger>
    ) : (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button size="sm" disabled={!canCreate} aria-label={t("Create")}>
                <Plus className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("Create")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger}

      <SheetContent side="right" className="sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("Create Support Ticket")}</SheetTitle>
          <SheetDescription>{t("Fill in the details to open a new support ticket.")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {errors.general ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.general}</div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">{t("Title")}</Label>
            <Input id="title" value={data.title} onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))} placeholder={t("Enter ticket title")} required />
            {errors.title ? <div className="text-xs text-destructive">{errors.title}</div> : null}
          </div>

          <div className="space-y-2">
            <Label required>{t("Description")}</Label>
            <RichTextEditor content={data.description} onChange={(v) => setData((p) => ({ ...p, description: v }))} placeholder={t("Describe your issue in detail")} />
            {errors.description ? <div className="text-xs text-destructive">{errors.description}</div> : null}
          </div>

          {isSuperAdmin ? (
            <div className="space-y-2">
              <Label>{t("User")}</Label>
              <Select value={data.company_id} onValueChange={(v) => setData((p) => ({ ...p, company_id: v }))} disabled={!companies.length}>
                <SelectTrigger>
                  <SelectValue placeholder={companies.length ? t("Select user") : t("No users available")} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!companies.length ? (
                <div className="text-xs text-muted-foreground">
                  {t("Create users here.")}{" "}
                  <Link href="/companies" className="text-blue-600 hover:underline">
                    {t("Create users")}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Category")}</Label>
              <Select value={data.category_id} onValueChange={(v) => setData((p) => ({ ...p, category_id: v }))} disabled={!categories.length}>
                <SelectTrigger>
                  <SelectValue placeholder={categories.length ? t("Select category") : t("No categories available")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!categories.length ? (
                <div className="text-xs text-muted-foreground">
                  {t("Create category here.")}{" "}
                  <Link href="/helpdesk-categories" className="text-blue-600 hover:underline">
                    {t("Create category")}
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>{t("Priority")}</Label>
              <Select value={data.priority} onValueChange={(v) => setData((p) => ({ ...p, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("Low")}</SelectItem>
                  <SelectItem value="medium">{t("Medium")}</SelectItem>
                  <SelectItem value="high">{t("High")}</SelectItem>
                  <SelectItem value="urgent">{t("Urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={processing || !canCreate} className={cn(processing && "opacity-80")}>
              {processing ? t("Creating...") : t("Create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
