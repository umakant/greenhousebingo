"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2, Upload } from "lucide-react";

import { openNativeFilePicker } from "@/lib/open-native-file-picker";
import { parseJsonResponse } from "@/lib/safe-fetch-json";
import {
  STOREFRONT_EDITOR_IMAGE_MAX_BYTES,
  storefrontEditorImageTooLargeMessage,
} from "@/lib/storefront/storefront-image-upload-limit";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";


function isProbablyProductImageFile(f: File): boolean {
  return f.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name);
}

type LookupRow = { id: string; name: string };

type CollectionOpt = { id: string; title: string; slug: string };

type VariantRow = { id?: string; name: string; sku: string; price: string; stock: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgReady: boolean;
  loading: boolean;
  setLoading: (v: boolean) => void;
  buildApiUrl: (pathname: string, extraSearch?: Record<string, string | undefined>) => string;
  /** When set, the sheet loads this product and saves with PATCH instead of POST. */
  editProductId?: string | null;
  /** Called after a successful create; switches the products table to the matching tab. */
  onCreated: (tab: "active" | "draft" | "scheduled") => void;
  setGlobalError: (msg: string | null) => void;
};

function slugFromTitle(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}

const emptyVariantRow = (): VariantRow => ({ name: "", sku: "", price: "0", stock: "0" });

type HighlightFormRow = { title: string; subtitle: string; imageUrl: string };
const emptyHighlightRow = (): HighlightFormRow => ({ title: "", subtitle: "", imageUrl: "" });

function defaultScheduleLocalInput(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Add-product flow in a right-hand drawer (Radix Sheet). */
export function AddStorefrontProductDialog({
  open,
  onOpenChange,
  orgReady,
  loading,
  setLoading,
  buildApiUrl,
  editProductId = null,
  onCreated,
  setGlobalError,
}: Props) {
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [categories, setCategories] = useState<LookupRow[]>([]);
  const [brands, setBrands] = useState<LookupRow[]>([]);
  const [collections, setCollections] = useState<CollectionOpt[]>([]);

  const [title, setTitle] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("<p></p>");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);

  const [mainImageUrl, setMainImageUrl] = useState("");

  const [price, setPrice] = useState("0");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [cost, setCost] = useState("");

  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState("0");
  const [stockAlert, setStockAlert] = useState("5");
  const [inventoryPolicy, setInventoryPolicy] = useState<"track" | "continue" | "deny">("track");

  const [categoryId, setCategoryId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(() => new Set());

  const [status, setStatus] = useState<"draft" | "active" | "scheduled">("draft");
  const [scheduleAt, setScheduleAt] = useState("");

  const [seoOpen, setSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [useVariants, setUseVariants] = useState(false);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([emptyVariantRow()]);

  /** Same portaled-file + ref + `openNativeFilePicker` pattern as featured image (and blog editor). */
  const featuredFileRef = useRef<HTMLInputElement>(null);
  /** Stable revoke target for blob: URLs (sync cleanup on reset / unmount). */
  const featuredBlobRef = useRef<string | null>(null);
  const [featuredBlobPreview, setFeaturedBlobPreview] = useState<string | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [storefrontFeatured, setStorefrontFeatured] = useState(false);
  const [highlightsHeading, setHighlightsHeading] = useState("");
  const [highlightRows, setHighlightRows] = useState<HighlightFormRow[]>([]);

  /** One image per request — same multipart shape as featured image (`file` field only). */
  const uploadCatalogImageFile = useCallback(
    async (file: File): Promise<string> => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(buildApiUrl("/api/storefront/catalog/upload-images"), {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = await parseJsonResponse<{ ok?: boolean; urls?: string[]; message?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? t("Upload failed"));
      const url = data.urls?.[0];
      if (!url?.trim()) {
        throw new Error(t("Upload succeeded but no image URL was returned. Check Settings → Storage and try again."));
      }
      return url.trim();
    },
    [buildApiUrl],
  );

  const triggerFeaturedFilePicker = useCallback(() => {
    if (uploadingFeatured) return;
    openNativeFilePicker(featuredFileRef.current);
  }, [uploadingFeatured]);

  const replaceFeaturedBlob = useCallback((next: string | null) => {
    if (featuredBlobRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(featuredBlobRef.current);
    }
    featuredBlobRef.current = next;
    setFeaturedBlobPreview(next);
  }, []);

  const reset = useCallback(() => {
    setTitle("");
    setDescriptionHtml("<p></p>");
    setSlug("");
    setSlugManual(false);
    setMainImageUrl("");
    replaceFeaturedBlob(null);
    setPrice("0");
    setCompareAtPrice("");
    setCost("");
    setSku("");
    setBarcode("");
    setStock("0");
    setStockAlert("5");
    setInventoryPolicy("track");
    setCategoryId("");
    setBrandId("");
    setSelectedCollectionIds(new Set());
    setStatus("draft");
    setScheduleAt("");
    setSeoOpen(false);
    setSeoTitle("");
    setSeoDescription("");
    setUseVariants(false);
    setVariantRows([emptyVariantRow()]);
    setMediaUploadError(null);
    setUploadingFeatured(false);
    setDetailLoading(false);
    setEditIsActive(true);
    setStorefrontFeatured(false);
    setHighlightsHeading("");
    setHighlightRows([]);
  }, [replaceFeaturedBlob]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    return () => {
      if (featuredBlobRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(featuredBlobRef.current);
      }
      featuredBlobRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (slugManual) return;
    setSlug(slugFromTitle(title));
  }, [title, slugManual]);

  useEffect(() => {
    if (!open || !orgReady) return;
    let cancelled = false;
    void (async () => {
      setLookupsLoading(true);
      setGlobalError(null);
      try {
        const [lr, cr] = await Promise.all([
          fetch(buildApiUrl("/api/storefront/catalog/lookups"), { credentials: "same-origin" }),
          fetch(buildApiUrl("/api/storefront/collections"), { credentials: "same-origin" }),
        ]);
        const lj = await parseJsonResponse<{
          ok?: boolean;
          categories?: LookupRow[];
          brands?: LookupRow[];
          message?: string;
        }>(lr);
        const cj = await parseJsonResponse<{
          ok?: boolean;
          collections?: Array<{ id: string; title: string; slug: string }>;
          message?: string;
        }>(cr);
        if (cancelled) return;
        if (!lr.ok || !lj.ok) throw new Error(lj.message ?? "Failed to load categories");
        if (!cr.ok || !cj.ok) throw new Error(cj.message ?? "Failed to load collections");
        setCategories(lj.categories ?? []);
        setBrands(lj.brands ?? []);
        setCollections((cj.collections ?? []).map((c) => ({ id: c.id, title: c.title, slug: c.slug })));
      } catch (e: unknown) {
        if (!cancelled) setGlobalError(e instanceof Error ? e.message : t("Failed to load form data"));
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orgReady, buildApiUrl, setGlobalError]);

  useEffect(() => {
    if (status === "scheduled" && !scheduleAt) setScheduleAt(defaultScheduleLocalInput());
  }, [status, scheduleAt]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when opening the sheet for a specific product id
  useEffect(() => {
    if (!open || !orgReady || !editProductId) return;
    let cancelled = false;
    void (async () => {
      setDetailLoading(true);
      setGlobalError(null);
      try {
        const res = await fetch(buildApiUrl(`/api/storefront/catalog/products/${encodeURIComponent(editProductId)}`), {
          credentials: "same-origin",
        });
        const json = await parseJsonResponse<{
          ok?: boolean;
          data?: {
            name: string;
            description: string | null;
            slug: string | null;
            sku: string | null;
            barcode: string | null;
            price: number;
            compareAtPrice: number | null;
            cost: number;
            stock: number;
            stockAlert: number;
            categoryId: string | null;
            brandId: string | null;
            image: string | null;
            isActive: boolean;
            storefrontPublished: boolean;
            storefrontPublishAt: string | null;
            storefrontSeoTitle: string | null;
            storefrontSeoDescription: string | null;
            inventoryPolicy: string;
            variants: unknown;
            collectionIds: string[];
            storefrontFeatured?: boolean;
            storefrontHighlights?: unknown;
          };
          message?: string;
        }>(res);
        if (!res.ok || !json.ok || !json.data) throw new Error(json.message ?? t("Failed to load product"));
        if (cancelled) return;
        const d = json.data;
        reset();
        if (cancelled) return;
        setTitle(d.name);
        setDescriptionHtml(d.description?.trim() ? d.description : "<p></p>");
        setSlug(d.slug ?? "");
        setSlugManual(true);
        setSku(d.sku ?? "");
        setBarcode(d.barcode ?? "");
        setPrice(String(d.price ?? 0));
        setCompareAtPrice(d.compareAtPrice != null ? String(d.compareAtPrice) : "");
        setCost(String(d.cost ?? 0));
        setStock(String(d.stock ?? 0));
        setStockAlert(String(d.stockAlert ?? 5));
        setInventoryPolicy(
          d.inventoryPolicy === "continue" || d.inventoryPolicy === "deny" ? d.inventoryPolicy : "track",
        );
        setCategoryId(d.categoryId ?? "");
        setBrandId(d.brandId ?? "");
        setMainImageUrl(d.image?.trim() ?? "");
        setSelectedCollectionIds(new Set(d.collectionIds ?? []));
        setStorefrontFeatured(Boolean(d.storefrontFeatured));
        setSeoTitle(d.storefrontSeoTitle ?? "");
        setSeoDescription(d.storefrontSeoDescription ?? "");
        setEditIsActive(d.isActive);

        const now = Date.now();
        const pubAt = d.storefrontPublishAt ? new Date(d.storefrontPublishAt).getTime() : 0;
        if (!d.isActive) {
          setStatus("draft");
          setScheduleAt("");
        } else if (d.storefrontPublished && pubAt > now) {
          setStatus("scheduled");
          setScheduleAt(isoToDatetimeLocalValue(d.storefrontPublishAt));
        } else if (d.storefrontPublished) {
          setStatus("active");
          setScheduleAt("");
        } else {
          setStatus("draft");
          setScheduleAt("");
        }

        const rawVariants = d.variants;
        if (Array.isArray(rawVariants) && rawVariants.length > 0) {
          const parsed: VariantRow[] = [];
          for (const row of rawVariants) {
            if (!row || typeof row !== "object") continue;
            const o = row as Record<string, unknown>;
            const vn = String(o.name ?? "").trim();
            if (!vn) continue;
            parsed.push({
              id: typeof o.id === "string" ? o.id : undefined,
              name: vn,
              sku: o.sku != null ? String(o.sku) : "",
              price: String(o.price != null && Number.isFinite(Number(o.price)) ? Number(o.price) : 0),
              stock: String(o.stock != null && Number.isFinite(Number(o.stock)) ? Math.floor(Number(o.stock)) : 0),
            });
          }
          if (parsed.length > 0) {
            setUseVariants(true);
            setVariantRows(parsed);
          } else {
            setUseVariants(false);
            setVariantRows([emptyVariantRow()]);
          }
        } else {
          setUseVariants(false);
          setVariantRows([emptyVariantRow()]);
        }

        const rawHl = d.storefrontHighlights;
        if (Array.isArray(rawHl)) {
          setHighlightsHeading("");
          setHighlightRows(
            rawHl.map((x) => {
              if (!x || typeof x !== "object") return emptyHighlightRow();
              const o = x as Record<string, unknown>;
              return {
                title: String(o.title ?? ""),
                subtitle: String(o.subtitle ?? ""),
                imageUrl: String(o.imageUrl ?? ""),
              };
            }),
          );
        } else if (rawHl && typeof rawHl === "object" && Array.isArray((rawHl as { items?: unknown }).items)) {
          const o = rawHl as { heading?: unknown; items: unknown[] };
          setHighlightsHeading(typeof o.heading === "string" ? o.heading : "");
          setHighlightRows(
            o.items.map((x) => {
              if (!x || typeof x !== "object") return emptyHighlightRow();
              const r = x as Record<string, unknown>;
              return {
                title: String(r.title ?? ""),
                subtitle: String(r.subtitle ?? ""),
                imageUrl: String(r.imageUrl ?? ""),
              };
            }),
          );
        } else {
          setHighlightsHeading("");
          setHighlightRows([]);
        }
      } catch (e: unknown) {
        if (!cancelled) setGlobalError(e instanceof Error ? e.message : t("Failed to load product"));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orgReady, editProductId, buildApiUrl, setGlobalError]);

  const toggleCollection = (id: string, on: boolean) => {
    setSelectedCollectionIds((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const addVariantRow = () => setVariantRows((r) => [...r, emptyVariantRow()]);
  const removeVariantRow = (idx: number) => setVariantRows((r) => r.filter((_, i) => i !== idx));
  const setVariantCell = (idx: number, key: keyof VariantRow, value: string) => {
    setVariantRows((rows) => rows.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };

  const submit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setGlobalError(null);
    try {
      let variantsPayload: unknown = undefined;
      if (useVariants) {
        const cleaned = variantRows.filter((r) => r.name.trim());
        if (cleaned.length === 0) {
          throw new Error(t("Add at least one variant with a name, or turn off “Multiple variants”."));
        }
        variantsPayload = cleaned.map((r, i) => ({
          id: r.id?.trim() || `v-${i}-${Math.random().toString(36).slice(2, 9)}`,
          name: r.name.trim(),
          sku: r.sku.trim() || undefined,
          price: Number(r.price),
          stock: Math.floor(Number(r.stock)),
        }));
      }

      const cmp =
        compareAtPrice.trim() === "" ? null : Number(compareAtPrice);
      const costNum = cost.trim() === "" ? 0 : Number(cost);
      if (cmp != null && !Number.isFinite(cmp)) throw new Error(t("Compare-at price is invalid."));
      if (!Number.isFinite(costNum) || costNum < 0) throw new Error(t("Cost is invalid."));
      if (!useVariants) {
        const p = price === "" ? 0 : Number(price);
        if (!Number.isFinite(p) || p < 0) throw new Error(t("Price is invalid."));
      }

      let storefrontPublished = false;
      let storefrontPublishAt: string | null = null;
      if (status === "active") {
        storefrontPublished = true;
        storefrontPublishAt = null;
      } else if (status === "scheduled") {
        if (!scheduleAt.trim()) throw new Error(t("Choose a date and time to schedule publishing."));
        const when = new Date(scheduleAt);
        if (Number.isNaN(when.getTime())) throw new Error(t("Invalid schedule date."));
        if (when.getTime() <= Date.now()) throw new Error(t("Schedule time must be in the future."));
        storefrontPublished = true;
        storefrontPublishAt = when.toISOString();
      } else {
        storefrontPublished = false;
        storefrontPublishAt = null;
      }

      const hlClean = highlightRows
        .map((r) => ({
          title: r.title.trim(),
          subtitle: r.subtitle.trim(),
          imageUrl: r.imageUrl.trim(),
        }))
        .filter((r) => r.title.length > 0)
        .map((r) => ({
          title: r.title,
          ...(r.subtitle ? { subtitle: r.subtitle } : {}),
          ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
        }));
      const hlHeadingTrim = highlightsHeading.trim();
      let storefrontHighlightsPayload: unknown = null;
      if (hlClean.length > 0) {
        storefrontHighlightsPayload = hlHeadingTrim
          ? { heading: hlHeadingTrim, items: hlClean }
          : hlClean;
      } else {
        storefrontHighlightsPayload = null;
      }

      const body: Record<string, unknown> = {
        name: title.trim(),
        slug: slug.trim() || undefined,
        description: descriptionHtml.trim() === "<p></p>" ? null : descriptionHtml,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        price: useVariants ? 0 : price === "" ? 0 : Number(price),
        compareAtPrice: cmp,
        cost: costNum,
        stock: useVariants ? 0 : stock === "" ? 0 : Math.floor(Number(stock)),
        stockAlert: stockAlert === "" ? 5 : Math.max(0, Math.floor(Number(stockAlert))),
        categoryId: categoryId || null,
        brandId: brandId || null,
        image: mainImageUrl.trim() || undefined,
        storefrontPublished,
        storefrontPublishAt,
        storefrontSeoTitle: seoTitle.trim() || undefined,
        storefrontSeoDescription: seoDescription.trim() || undefined,
        inventoryPolicy,
        collectionIds: [...selectedCollectionIds],
        variants: useVariants ? variantsPayload : null,
        storefrontFeatured,
        storefrontHighlights: storefrontHighlightsPayload,
      };

      if (editProductId) {
        body.isActive = editIsActive;
      } else {
        body.isActive = true;
      }

      const url = editProductId
        ? buildApiUrl(`/api/storefront/catalog/products/${encodeURIComponent(editProductId)}`)
        : buildApiUrl("/api/storefront/catalog/products");
      const method = editProductId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? (editProductId ? t("Failed to update product") : t("Failed to create product")));
      }
      onOpenChange(false);
      onCreated(status === "scheduled" ? "scheduled" : status === "active" ? "active" : "draft");
    } catch (e: unknown) {
      setGlobalError(e instanceof Error ? e.message : t("Error"));
    } finally {
      setLoading(false);
    }
  };

  const runFeaturedUpload = useCallback(
    async (file: File) => {
      if (!isProbablyProductImageFile(file)) {
        setMediaUploadError(t("Please choose a JPEG, PNG, GIF, WebP, or SVG image."));
        return;
      }
      if (file.size > STOREFRONT_EDITOR_IMAGE_MAX_BYTES) {
        setMediaUploadError(storefrontEditorImageTooLargeMessage());
        return;
      }
      setMediaUploadError(null);
      replaceFeaturedBlob(URL.createObjectURL(file));
      setUploadingFeatured(true);
      try {
        const url = await uploadCatalogImageFile(file);
        replaceFeaturedBlob(null);
        setMainImageUrl(url);
      } catch (err: unknown) {
        replaceFeaturedBlob(null);
        setMediaUploadError(err instanceof Error ? err.message : t("Upload failed"));
      } finally {
        setUploadingFeatured(false);
      }
    },
    [replaceFeaturedBlob, uploadCatalogImageFile],
  );

  const onFeaturedFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await runFeaturedUpload(file);
  };

  const onFeaturedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    void runFeaturedUpload(f);
  };

  const preventDragDefaults = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const featuredDisplaySrc = (featuredBlobPreview ?? "").trim() || mainImageUrl.trim();

  const disableSave = !title.trim() || loading || lookupsLoading || (!!editProductId && detailLoading);
  const variantsInvalid = useVariants && variantRows.every((r) => !r.name.trim());

  const filePickerPortal =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <input
              ref={featuredFileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onFeaturedFileChange(e)}
              disabled={uploadingFeatured}
            />
          </>,
          document.body,
        )
      : null;

  return (
    <>
      {filePickerPortal}
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl lg:max-w-[min(960px,100vw-2rem)]"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
          <SheetTitle>{editProductId ? t("Edit product") : t("Add product")}</SheetTitle>
          <SheetDescription>
            {editProductId
              ? t("Update catalog details, media, and publishing for this product.")
              : t("Describe your product, set pricing and inventory, then publish when it’s ready — similar to Shopify.")}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {editProductId && !editIsActive ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
              <label className="flex cursor-pointer items-start gap-2">
                <Checkbox
                  checked={false}
                  onCheckedChange={(c) => {
                    if (c === true) setEditIsActive(true);
                  }}
                  className="mt-0.5"
                />
                <span>{t("Reactivate product (currently archived). Check to restore it to the catalog when you save.")}</span>
              </label>
            </div>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-6">
              <section className="space-y-3">
                <Label htmlFor="sf-add-title">{t("Title")}</Label>
                <Input
                  id="sf-add-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("Short sleeve t-shirt")}
                />
              </section>

              <section className="space-y-2">
                <Label>{t("Description")}</Label>
                <RichTextEditor content={descriptionHtml} onChange={setDescriptionHtml} placeholder={t("Start typing…")} />
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">{t("Media")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("Upload a featured image (saved per Settings → Storage), or paste a URL below.")}
                  </p>
                </div>
                {mediaUploadError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {mediaUploadError}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <Label>{t("Featured image")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("Main catalog photo — stored per Settings → Storage, or paste a URL below.")}
                  </p>
                  <div
                    className="flex min-h-[5.5rem] flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-4 py-3"
                    onDragEnter={preventDragDefaults}
                    onDragOver={preventDragDefaults}
                    onDrop={onFeaturedDrop}
                  >
                    <p className="text-center text-xs text-muted-foreground">
                      {t("Drag an image here or choose a file — preview appears below when set.")}
                    </p>
                    {uploadingFeatured ? (
                      <p className="text-center text-xs text-muted-foreground">{t("Uploading…")}</p>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 self-center"
                      disabled={uploadingFeatured}
                      onClick={triggerFeaturedFilePicker}
                    >
                      {uploadingFeatured ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {featuredDisplaySrc ? t("Replace featured image") : t("Add featured image")}
                    </Button>
                  </div>
                  <details className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                    <summary className="cursor-pointer select-none font-medium text-muted-foreground">
                      {t("Or paste image URL")}
                    </summary>
                    <div className="mt-2 space-y-1">
                      <Label htmlFor="sf-add-main-img" className="sr-only">
                        {t("Featured image URL")}
                      </Label>
                      <Input
                        id="sf-add-main-img"
                        value={mainImageUrl}
                        onChange={(e) => {
                          replaceFeaturedBlob(null);
                          setMainImageUrl(e.target.value);
                        }}
                        placeholder="https:// or /uploads/…"
                        className="bg-background"
                      />
                    </div>
                  </details>
                  {featuredDisplaySrc ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("Featured preview")}</p>
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-muted/40">
                          {/* eslint-disable-next-line @next/next/no-img-element -- blob:, user, or CDN URLs */}
                          <img src={featuredDisplaySrc} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 self-center"
                          disabled={uploadingFeatured}
                          onClick={() => {
                            replaceFeaturedBlob(null);
                            setMainImageUrl("");
                          }}
                        >
                          {t("Remove")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <h3 className="text-sm font-medium">{t("Pricing")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sf-add-price">{t("Price")}</Label>
                    <Input
                      id="sf-add-price"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={useVariants}
                    />
                    {useVariants ? (
                      <p className="text-xs text-muted-foreground">{t("Derived from variant prices (minimum).")}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sf-add-compare">{t("Compare-at price")}</Label>
                    <Input
                      id="sf-add-compare"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder={t("Optional")}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sf-add-cost">{t("Cost per item")}</Label>
                    <Input
                      id="sf-add-cost"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder={t("Optional")}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{t("Variants")}</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sf-use-variants"
                      checked={useVariants}
                      onCheckedChange={(c) => {
                        const on = c === true;
                        setUseVariants(on);
                        if (on) {
                          setVariantRows([
                            {
                              name: t("Default"),
                              sku: sku.trim(),
                              price: price || "0",
                              stock: stock || "0",
                            },
                          ]);
                        }
                      }}
                    />
                    <Label htmlFor="sf-use-variants" className="cursor-pointer text-sm font-normal">
                      {t("Multiple variants (size, color, …)")}
                    </Label>
                  </div>
                </div>
                {useVariants ? (
                  <div className="space-y-2">
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                          <tr>
                            <th className="px-2 py-2 font-medium">{t("Option")}</th>
                            <th className="px-2 py-2 font-medium">{t("SKU")}</th>
                            <th className="px-2 py-2 font-medium">{t("Price")}</th>
                            <th className="px-2 py-2 font-medium">{t("Stock")}</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {variantRows.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-1">
                                <Input
                                  className="h-8"
                                  value={row.name}
                                  onChange={(e) => setVariantCell(idx, "name", e.target.value)}
                                  placeholder={t("e.g. Small / Red")}
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  className="h-8"
                                  value={row.sku}
                                  onChange={(e) => setVariantCell(idx, "sku", e.target.value)}
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  className="h-8"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={row.price}
                                  onChange={(e) => setVariantCell(idx, "price", e.target.value)}
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  className="h-8"
                                  type="number"
                                  min={0}
                                  step="1"
                                  value={row.stock}
                                  onChange={(e) => setVariantCell(idx, "stock", e.target.value)}
                                />
                              </td>
                              <td className="p-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  disabled={variantRows.length <= 1}
                                  onClick={() => removeVariantRow(idx)}
                                  aria-label={t("Remove variant")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addVariantRow}>
                      <Plus className="h-3.5 w-3.5" />
                      {t("Add variant")}
                    </Button>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <h3 className="text-sm font-medium">{t("Inventory")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sf-add-sku">{t("SKU")}</Label>
                    <Input id="sf-add-sku" value={sku} onChange={(e) => setSku(e.target.value)} disabled={useVariants} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sf-add-barcode">{t("Barcode")}</Label>
                    <Input id="sf-add-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sf-add-stock">{t("Quantity")}</Label>
                    <Input
                      id="sf-add-stock"
                      type="number"
                      min={0}
                      step="1"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      disabled={useVariants}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sf-add-stock-alert">{t("Low stock alert")}</Label>
                    <Input
                      id="sf-add-stock-alert"
                      type="number"
                      min={0}
                      step="1"
                      value={stockAlert}
                      onChange={(e) => setStockAlert(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("When out of stock")}</Label>
                    <Select value={inventoryPolicy} onValueChange={(v) => setInventoryPolicy(v as typeof inventoryPolicy)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="track">{t("Deny purchases (track quantity)")}</SelectItem>
                        <SelectItem value="continue">{t("Continue selling")}</SelectItem>
                        <SelectItem value="deny">{t("Stop selling")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-1 px-0 text-muted-foreground hover:text-foreground">
                    {seoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {t("Search engine listing")}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="sf-seo-title">{t("Page title")}</Label>
                    <Input id="sf-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={512} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sf-seo-desc">{t("Meta description")}</Label>
                    <Textarea id="sf-seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <aside className="space-y-5 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <section className="space-y-2">
                <Label>{t("Status")}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as typeof status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t("Draft (not on storefront)")}</SelectItem>
                    <SelectItem value="active">{t("Active (on storefront now)")}</SelectItem>
                    <SelectItem value="scheduled">{t("Scheduled (publish at…)")}</SelectItem>
                  </SelectContent>
                </Select>
                {status === "scheduled" ? (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="sf-schedule-at" className="text-xs text-muted-foreground">
                      {t("Publish on storefront")}
                    </Label>
                    <Input
                      id="sf-schedule-at"
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                    />
                  </div>
                ) : null}
              </section>

              <section className="space-y-2">
                <Label className="text-muted-foreground">{t("Sales channels")}</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <Checkbox id="sf-ch-online" checked disabled />
                  <Label htmlFor="sf-ch-online" className="cursor-default font-normal">
                    {t("Online Store")}
                  </Label>
                </div>
              </section>

              <section className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 px-3 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="sf-storefront-featured" className="text-sm font-medium leading-none">
                    {t("Featured product")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("Eligible for homepage spotlight and “featured first” ordering when enabled in the theme customizer.")}
                  </p>
                </div>
                <Switch
                  id="sf-storefront-featured"
                  checked={storefrontFeatured}
                  onCheckedChange={setStorefrontFeatured}
                />
              </section>

              <Collapsible>
                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border bg-muted/15 px-3 py-2 text-left text-sm font-medium hover:bg-muted/30">
                  <span>{t("Spotlight highlight cards")}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 border-x border-b border-t-0 px-3 py-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Shown under the hero image on the home page for the featured product, and on the product page. Up to 8 cards. Leave empty to use the theme demo copy.",
                    )}
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="sf-hl-heading">{t("Section heading")}</Label>
                    <Input
                      id="sf-hl-heading"
                      value={highlightsHeading}
                      onChange={(e) => setHighlightsHeading(e.target.value)}
                      placeholder={t("Why you'll love it")}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t("Cards")}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        disabled={highlightRows.length >= 8}
                        onClick={() => setHighlightRows((prev) => [...prev, emptyHighlightRow()])}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("Add")}
                      </Button>
                    </div>
                    {highlightRows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("No custom cards — theme defaults apply.")}</p>
                    ) : (
                      highlightRows.map((row, idx) => (
                        <div key={`hl-${idx}`} className="space-y-2 rounded-md border bg-background/80 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {t("Card")} {idx + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive hover:text-destructive"
                              onClick={() => setHighlightRows((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Input
                            placeholder={t("Title (e.g. 16 oz)")}
                            value={row.title}
                            onChange={(e) =>
                              setHighlightRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, title: e.target.value } : r)),
                              )
                            }
                          />
                          <Input
                            placeholder={t("Subtitle (optional)")}
                            value={row.subtitle}
                            onChange={(e) =>
                              setHighlightRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, subtitle: e.target.value } : r)),
                              )
                            }
                          />
                          <Input
                            placeholder={t("Icon image URL (optional)")}
                            value={row.imageUrl}
                            onChange={(e) =>
                              setHighlightRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, imageUrl: e.target.value } : r)),
                              )
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              <section className="space-y-2">
                <Label>{t("Product organization")}</Label>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">{t("Category")}</span>
                    <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t("None")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("None")}</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">{t("Vendor (brand)")}</span>
                    <Select value={brandId || "__none__"} onValueChange={(v) => setBrandId(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t("None")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("None")}</SelectItem>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <Label>{t("Collections")}</Label>
                <p className="text-xs text-muted-foreground">{t("Manual collections this product should appear in.")}</p>
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-2 text-sm">
                  {collections.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1 py-2">{t("No collections yet. Create one under Collections.")}</p>
                  ) : (
                    collections.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
                        <Checkbox
                          checked={selectedCollectionIds.has(c.id)}
                          onCheckedChange={(on) => toggleCollection(c.id, on === true)}
                        />
                        <span className="leading-tight">
                          {c.title}
                          <span className="block text-[11px] text-muted-foreground">/{c.slug}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <Label htmlFor="sf-add-handle">{t("Handle (URL)")}</Label>
                <Input
                  id="sf-add-handle"
                  value={slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="winter-jacket"
                />
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSlugManual(false)}>
                  {t("Regenerate from title")}
                </Button>
              </section>
            </aside>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-2 border-t px-6 py-4 sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {lookupsLoading || detailLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                {detailLoading ? t("Loading product…") : t("Loading references…")}
              </>
            ) : null}
            {variantsInvalid ? (
              <span className="text-destructive">{t("Add at least one variant name or disable “Multiple variants”.")}</span>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={disableSave || variantsInvalid}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  );
}
