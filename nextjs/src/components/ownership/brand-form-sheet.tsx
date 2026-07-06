"use client";

import * as React from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
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

const MAX_LOGO_BYTES = 8 * 1024 * 1024;

export type BrandFormValues = {
  id: string;
  name: string;
  logo: string | null;
  status: string;
  notes: string | null;
};

type UploadedMediaItem = {
  url?: string;
};

async function uploadBrandLogo(file: File): Promise<string> {
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

function BrandLogoField({
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
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo file is too large. Please use an image under 8 MB.");
      return;
    }
    onUploadingChange(true);
    try {
      const url = await uploadBrandLogo(file);
      onChange(url);
      toast.success("Logo uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      onUploadingChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="brand-logo">Brand Logo (optional)</Label>
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
          <Input
            id="brand-logo"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/uploads/media/… or https://…"
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />
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
            Upload logo
          </Button>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP, or SVG (max 8 MB)</p>
        </div>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: BrandFormValues | null;
  onSaved: () => void;
};

export function BrandFormSheet({ open, onOpenChange, mode, initial, onSaved }: Props) {
  const isEdit = mode === "edit";
  const [saving, setSaving] = React.useState(false);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [initialOwnerName, setInitialOwnerName] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setName(initial.name);
      setLogo(initial.logo ?? "");
      setStatus(initial.status || "active");
      setNotes(initial.notes ?? "");
      setInitialOwnerName("");
      return;
    }
    setName("");
    setLogo("");
    setStatus("active");
    setInitialOwnerName("");
    setNotes("");
  }, [open, isEdit, initial]);

  React.useEffect(() => {
    if (isEdit || !name.trim()) return;
    setInitialOwnerName((prev) =>
      prev === "" || prev.endsWith(" Holdings") ? `${name.trim()} Holdings` : prev,
    );
  }, [name, isEdit]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Brand name is required.");
      return;
    }
    const editingBrand = isEdit ? initial : null;
    if (isEdit && !editingBrand?.id) {
      toast.error("Brand not found.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        logo: logo.trim() || null,
        status,
        notes: notes.trim() || null,
      };

      let res: Response;
      if (isEdit && editingBrand) {
        res = await fetch(`/api/ownership/brands/${editingBrand.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/ownership/brands", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            initialOwnerName: initialOwnerName.trim() || `${name.trim()} Holdings`,
            initialOwnershipPercent: 100,
            initialMinimumOwnershipPercent: 100,
          }),
        });
      }

      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success(isEdit ? "Brand updated." : "Brand created.");
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(data?.message ?? (isEdit ? "Could not update brand." : "Could not create brand."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Brand" : "Create Brand"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update brand details. Ownership is managed from the partners section below each brand."
              : "Create a brand with 100% initial ownership assigned to the primary brand holder."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand Name *</Label>
            <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="SecurX" />
          </div>
          <BrandLogoField
            value={logo}
            onChange={setLogo}
            uploading={logoUploading}
            onUploadingChange={setLogoUploading}
          />
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isEdit ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="initial-owner">Initial Owner Name</Label>
                <Input
                  id="initial-owner"
                  value={initialOwnerName}
                  onChange={(e) => setInitialOwnerName(e.target.value)}
                  placeholder="SecurX Holdings"
                />
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Initial ownership defaults to <strong>100%</strong> for the primary brand holder.
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="brand-notes">Notes (optional)</Label>
            <Textarea id="brand-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || logoUploading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save Changes" : "Create Brand"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
