"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Folder, Image as ImageIcon, Plus, Search, Trash2, Upload } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/admin-t";
import { acceptAttributeForExtensions } from "@/lib/media-upload-policy";

type MediaItem = {
  id: string;
  name: string;
  file_name: string;
  url: string;
  thumb_url: string;
  size: number;
  mime_type: string;
  created_at: string;
};

type MediaDirectory = {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
};

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  acceptExtensions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string | string[]) => void;
  multiple?: boolean;
  acceptExtensions?: string[];
}) {
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [directories, setDirectories] = React.useState<MediaDirectory[]>([]);
  const [directoryId, setDirectoryId] = React.useState<string | null>(null);
  const [activeDirectoryName, setActiveDirectoryName] = React.useState<string | null>(null);
  const [filtered, setFiltered] = React.useState<MediaItem[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");

  const fetchMedia = React.useCallback(async (opts?: { directoryId?: string | null; search?: string }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ per_page: "100" });
      const dir = opts?.directoryId !== undefined ? opts.directoryId : directoryId;
      if (dir) qs.set("directory_id", dir);
      const s = (opts?.search ?? search).trim();
      if (s) qs.set("search", s);

      const res = await fetch(`/api/media?${qs.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to load media");
      const items = (data.media ?? []) as MediaItem[];
      setMedia(items);
      setFiltered(items);
      if (!dir) {
        setDirectories(((data.directories ?? []) as MediaDirectory[]) ?? []);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [directoryId, search]);

  React.useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setSelected([]);
    setDirectoryId(null);
    setActiveDirectoryName(null);
    void fetchMedia({ directoryId: null, search: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when modal opens
  }, [isOpen]);

  React.useEffect(() => {
    if (!search.trim()) {
      setFiltered(media);
      return;
    }
    const s = search.toLowerCase();
    setFiltered(media.filter((m) => m.name.toLowerCase().includes(s) || m.file_name.toLowerCase().includes(s)));
  }, [search, media]);

  const handleUpload = async (files: FileList) => {
    if (!directoryId) {
      toast.error(t("Create a folder first, then open it to upload files."));
      setNewFolderOpen(true);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files[]", f));
      fd.append("directory_id", directoryId);
      const res = await fetch("/api/media", { method: "POST", body: fd, credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Upload failed");
      toast.success(t("Uploaded"));
      await fetchMedia({ directoryId });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const promptUpload = () => {
    if (!directoryId) {
      toast.error(t("Create a folder first, then open it to upload files."));
      setNewFolderOpen(true);
      return;
    }
    document.getElementById("pf-media-upload")?.click();
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/media/directories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, parent_id: null }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Create folder failed");
      toast.success(t("Folder created."));
      setNewFolderOpen(false);
      setNewFolderName("");
      const newId = String(data?.directory?.id ?? "");
      if (newId) {
        setDirectoryId(newId);
        setActiveDirectoryName(name);
        await fetchMedia({ directoryId: newId });
      } else {
        await fetchMedia({ directoryId: null });
      }
    } catch (e: any) {
      toast.error(e?.message || "Create folder failed");
    }
  };

  const openFolder = (folder: MediaDirectory) => {
    setDirectoryId(folder.id);
    setActiveDirectoryName(folder.name);
    setSearch("");
    void fetchMedia({ directoryId: folder.id, search: "" });
  };

  const goToRoot = () => {
    setDirectoryId(null);
    setActiveDirectoryName(null);
    setSearch("");
    void fetchMedia({ directoryId: null, search: "" });
  };

  const toggleSelect = (url: string) => {
    if (!multiple) {
      onSelect(url);
      onClose();
      return;
    }
    setSelected((prev) => (prev.includes(url) ? prev.filter((x) => x !== url) : [...prev, url]));
  };

  const confirm = () => {
    if (!multiple) return;
    if (selected.length === 0) return;
    onSelect(selected);
    onClose();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Delete failed");
      toast.success(t("File deleted"));
      setDeleteId(null);
      await fetchMedia({ directoryId });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t("Media Library")}
            {directoryId && filtered.length > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {filtered.length}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {directoryId
              ? t("Upload files into the selected folder.")
              : t("Create a folder first, then upload files into it.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground pb-1">
          <Folder className="h-4 w-4" />
          <button
            type="button"
            className={directoryId ? "text-primary hover:underline font-medium text-foreground" : "text-foreground font-medium cursor-default"}
            onClick={() => {
              if (directoryId) goToRoot();
            }}
          >
            {t("Media Library")}
          </button>
          {directoryId ? (
            <>
              <span>/</span>
              <span className="text-foreground">{activeDirectoryName ?? t("Folder")}</span>
            </>
          ) : null}
        </div>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("Search media files...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                disabled={!directoryId}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("New Folder")}
              </Button>
              <Input
                type="file"
                multiple
                accept={acceptAttributeForExtensions(acceptExtensions)}
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
                className="hidden"
                id="pf-media-upload"
              />
              <Button type="button" variant="outline" onClick={promptUpload} disabled={uploading || !directoryId} size="sm">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? t("Uploading...") : t("Upload Files")}
              </Button>
            </div>
          </div>

          <div className="border rounded-lg bg-muted/10 flex flex-col flex-1 min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("Loading media...")}</p>
                </div>
              </div>
            ) : !directoryId ? (
              directories.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-16">
                  <div className="text-center max-w-sm">
                    <div className="mx-auto w-24 h-24 border-2 border-dashed rounded-xl flex items-center justify-center mb-6 border-muted-foreground/25">
                      <Folder className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t("Create a folder first")}</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t("Organize your media by creating a folder, then upload files inside it.")}
                    </p>
                    <Button type="button" onClick={() => setNewFolderOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("New Folder")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-sm text-muted-foreground mb-4">{t("Open a folder to upload or select files.")}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {directories.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => openFolder(folder)}
                        className="group rounded-lg border border-border bg-background p-3 text-left hover:border-primary/60 hover:shadow-sm transition"
                      >
                        <div className="aspect-square rounded-md bg-primary/10 flex items-center justify-center mb-2">
                          <Folder className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-sm font-medium truncate" title={folder.name}>
                          {folder.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="text-center max-w-sm">
                  <div className="mx-auto w-24 h-24 border-2 border-dashed rounded-xl flex items-center justify-center mb-6 border-muted-foreground/25">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t("No media files found")}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{t("Upload files to this folder.")}</p>
                  <Button type="button" onClick={promptUpload} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("Upload Files")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-5 gap-3">
                  {filtered.map((item) => {
                    const isSelected = selected.includes(item.url);
                    const isImg = item.mime_type.startsWith("image/");
                    const isPdf = item.mime_type === "application/pdf" || item.file_name.toLowerCase().endsWith(".pdf");
                    return (
                      <div
                        key={item.id}
                        className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all hover:scale-105 ${
                          isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md border border-border hover:border-primary/50"
                        }`}
                        onClick={() => toggleSelect(item.url)}
                      >
                        <div className="relative aspect-square bg-muted">
                          {isImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.thumb_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : isPdf ? (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-red-50 text-red-700">
                              <span className="text-xs font-bold">PDF</span>
                              <span className="mt-1 max-w-full truncate px-1 text-[10px] font-normal opacity-80">{item.name}</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">FILE</div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                            aria-label="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-white truncate" title={item.name}>
                              {item.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {multiple && selected.length > 0 ? (
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">{selected.length} files selected</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected([])}>
                  {t("Clear Selection")}
                </Button>
                <Button onClick={confirm}>{t("Select Files")}</Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("New Folder")}</DialogTitle>
            <DialogDescription>{t("Create a folder to organize your media.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("Folder name")}</Label>
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={t("e.g. Logos")} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="button" onClick={createFolder} disabled={!newFolderName.trim()}>
                {t("Create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete file")}</DialogTitle>
            <DialogDescription>{t("Are you sure you want to delete this file? This cannot be undone.")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("Deleting...") : t("Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
