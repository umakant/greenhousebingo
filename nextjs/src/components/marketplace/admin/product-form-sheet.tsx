"use client";

import * as React from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { getImagePath } from "@/utils/image-path";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type UploadedMediaItem = {
  url?: string;
};

async function uploadProductImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("files[]", file);
  const res = await fetch("/api/media", { method: "POST", body: fd, credentials: "include" });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    files?: string[];
    media?: UploadedMediaItem[];
    message?: string;
  } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.message || "Upload failed.");
  const uploadedUrl = json.media?.[0]?.url;
  if (uploadedUrl) return uploadedUrl;
  const saved = Array.isArray(json.files) ? json.files[0] : undefined;
  if (!saved) throw new Error("Upload failed.");
  return `/uploads/media/${saved}`;
}

function ProductImageField({
  value,
  onChange,
  uploading,
  onUploadingChange,
}: {
  value: string;
  onChange: (url: string) => void;
  uploading: boolean;
  onUploadingChange: (busy: boolean) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const pick = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image file is too large. Please use an image under 8 MB.");
      return;
    }
    onUploadingChange(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
      toast.success("Image uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      onUploadingChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Product image</Label>
      <div className="flex items-start gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImagePath(value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {value ? "Replace image" : "Upload image"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => onChange("")}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP, or SVG (max 8 MB)</p>
        </div>
      </div>
    </div>
  );
}

export type ProductFormValues = {
  id?: string;
  vendorId: string;
  name: string;
  sku: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
  category: string;
  stock: string;
  status: string;
};

export type VendorOption = { id: string; name: string };

const STATUSES = ["active", "inactive", "draft"] as const;

const EMPTY: ProductFormValues = {
  vendorId: "",
  name: "",
  sku: "",
  description: "",
  price: "",
  currency: "USD",
  imageUrl: "",
  category: "",
  stock: "",
  status: "active",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: ProductFormValues | null;
  vendors: VendorOption[];
  onSaved: () => void;
  apiBase?: string;
  hideVendorSelect?: boolean;
};

export function ProductFormSheet({
  open,
  onOpenChange,
  mode,
  initial,
  vendors,
  onSaved,
  apiBase = "/api/marketplace/admin",
  hideVendorSelect = false,
}: Props) {
  const [saving, setSaving] = React.useState(false);
  const [imageUploading, setImageUploading] = React.useState(false);
  const [form, setForm] = React.useState<ProductFormValues>(EMPTY);

  React.useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" && initial ? initial : EMPTY);
  }, [open, mode, initial]);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!hideVendorSelect && !form.vendorId) {
      toast.error("Please select a vendor.");
      return;
    }
    setSaving(true);
    try {
      const url =
        mode === "edit" && form.id ? `${apiBase}/products/${form.id}` : `${apiBase}/products`;
      const payload: Record<string, unknown> = {
        name: form.name,
        sku: form.sku,
        description: form.description,
        price: form.price === "" ? 0 : Number(form.price),
        currency: form.currency,
        imageUrl: form.imageUrl.trim() || null,
        category: form.category,
        stock: form.stock === "" ? null : Number(form.stock),
        status: form.status,
      };
      if (!hideVendorSelect && form.vendorId) payload.vendorId = form.vendorId;
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Save failed");
        return;
      }
      toast.success(mode === "edit" ? "Product updated" : "Product created");
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Edit product" : "Add product"}</SheetTitle>
          <SheetDescription>Manage product details, pricing, and stock.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          {!hideVendorSelect ? (
            <div className="grid gap-2">
              <Label>Vendor</Label>
              <Select value={form.vendorId} onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-price">Price</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-currency">Currency</Label>
              <Input
                id="p-currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-sku">SKU</Label>
              <Input id="p-sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-stock">Stock</Label>
              <Input
                id="p-stock"
                type="number"
                min={0}
                placeholder="Unlimited"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-category">Category</Label>
            <Input
              id="p-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <ProductImageField
            value={form.imageUrl}
            onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
            uploading={imageUploading}
            onUploadingChange={setImageUploading}
          />
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
          <div className="grid gap-2">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || imageUploading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
