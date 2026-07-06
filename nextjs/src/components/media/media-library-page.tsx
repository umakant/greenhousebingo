"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { toast } from "sonner";
import { Folder, HardDrive, Image as ImageIcon, Plus, Search, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { t } from "@/lib/admin-t";

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


function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const fixed = i === 0 ? 0 : 2;
  return `${n.toFixed(fixed)} ${units[i]}`;
}

export default function MediaLibraryPage() {
  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [directories, setDirectories] = React.useState<MediaDirectory[]>([]);
  const [activeDirectoryName, setActiveDirectoryName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [directoryId, setDirectoryId] = React.useState<string | null>(null);

  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [from, setFrom] = React.useState(0);
  const [to, setTo] = React.useState(0);
  const perPage = 12;

  const [stats, setStats] = React.useState<{ files: number; totalSizeBytes: number; images: number }>({
    files: 0,
    totalSizeBytes: 0,
    images: 0,
  });

  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");

  const fetchMedia = React.useCallback(async (opts?: { page?: number; directoryId?: string | null; search?: string }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(opts?.page ?? page));
      qs.set("per_page", String(perPage));
      const dir = opts?.directoryId !== undefined ? opts.directoryId : directoryId;
      if (dir) qs.set("directory_id", dir);
      const s = (opts?.search ?? search).trim();
      if (s) qs.set("search", s);

      const res = await fetch(`/api/media?${qs.toString()}`, { credentials: "same-origin", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const ok = Boolean((data as any)?.ok);
      const message = typeof (data as any)?.message === "string" ? ((data as any).message as string) : "Failed to load media";
      if (!res.ok || !ok) throw new Error(message);
      const payload = (data ?? {}) as Record<string, unknown>;
      const items = (((payload as any).media ?? []) as MediaItem[]) ?? [];
      setMedia(items);
      setDirectories((((payload as any).directories ?? []) as MediaDirectory[]) ?? []);
      const currentDir = (payload as any).current_directory as MediaDirectory | null | undefined;
      setActiveDirectoryName(currentDir?.name ?? null);
      const pg = (((payload as any).pagination ?? {}) as any) ?? {};
      setPage(Number(pg.page ?? 1));
      setLastPage(Number(pg.lastPage ?? 1));
      setTotal(Number(pg.total ?? 0));
      setFrom(Number(pg.from ?? 0));
      setTo(Number(pg.to ?? 0));
      const st = (((payload as any).stats ?? {}) as any) ?? {};
      setStats({
        files: Number(st.files ?? 0),
        totalSizeBytes: Number(st.totalSizeBytes ?? 0),
        images: Number(st.images ?? 0),
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [directoryId, page, search]);

  React.useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void fetchMedia({ page: 1, search });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, directoryId]);

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
      if (directoryId) fd.append("directory_id", directoryId);
      const res = await fetch("/api/media", { method: "POST", body: fd, credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Upload failed");
      const uploaded = ((data.media ?? []) as MediaItem[]) ?? [];
      if (uploaded.length > 0) {
        setMedia((prev) => [...uploaded, ...prev]);
      }
      toast.success("Uploaded");
      await fetchMedia({ page: 1 });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!(await appConfirm(t("Delete this file?")))) return;
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Delete failed");
      toast.success(t("Deleted."));
      await fetchMedia({ page: 1 });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const promptUpload = () => {
    if (!directoryId) {
      toast.error(t("Create a folder first, then open it to upload files."));
      setNewFolderOpen(true);
      return;
    }
    document.getElementById("pf-media-upload-page")?.click();
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
        await fetchMedia({ page: 1, directoryId: newId });
      } else {
        await fetchMedia({ page: 1 });
      }
    } catch (e: any) {
      toast.error(e?.message || "Create folder failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setNewFolderOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("New Folder")}
        </Button>
        <Input type="file" multiple onChange={(e) => e.target.files && handleUpload(e.target.files)} className="hidden" id="pf-media-upload-page" />
        <Button type="button" onClick={promptUpload} disabled={uploading || !directoryId}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? t("Uploading...") : t("Upload Files")}
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 border-b bg-muted/10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Folder className="h-4 w-4" />
            <button
              type="button"
              className={
                directoryId
                  ? "text-primary hover:underline font-medium text-foreground"
                  : "text-foreground font-medium cursor-default"
              }
              onClick={() => {
                if (!directoryId) return;
                setDirectoryId(null);
                setActiveDirectoryName(null);
                setPage(1);
                void fetchMedia({ page: 1, directoryId: null });
              }}
            >
              {t("Media Library")}
            </button>
            {directoryId ? (
              <>
                <span>/</span>
                <span className="text-foreground">
                  {activeDirectoryName ?? t("Folder")}
                </span>
              </>
            ) : null}
          </div>
        </CardContent>

        <CardContent className="p-4 border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder={t("Search media files...")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Badge variant="secondary" className="gap-2">
                <Folder className="h-3.5 w-3.5" />
                {stats.files} {t("Files")}
              </Badge>
              <Badge variant="secondary" className="gap-2">
                <HardDrive className="h-3.5 w-3.5" />
                {formatBytes(stats.totalSizeBytes)}
              </Badge>
              <Badge variant="secondary" className="gap-2">
                <ImageIcon className="h-3.5 w-3.5" />
                {stats.images} {t("Images")}
              </Badge>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-0">
          <div className="min-h-[480px]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("Loading media...")}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {!directoryId ? (
                  directories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25">
                        <Folder className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{t("Create a folder first")}</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                        {t("Organize your media by creating a folder, then upload files inside it.")}
                      </p>
                      <Button type="button" onClick={() => setNewFolderOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("New Folder")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {t("Open a folder to upload files.")}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {directories.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setDirectoryId(d.id);
                              setActiveDirectoryName(d.name);
                              setPage(1);
                              void fetchMedia({ page: 1, directoryId: d.id });
                            }}
                            className="group rounded-lg border border-border bg-background p-3 text-left hover:border-primary/60 hover:shadow-sm transition"
                          >
                            <div className="aspect-square rounded-md bg-primary/10 flex items-center justify-center mb-3">
                              <Folder className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground">{t("Folder")}</div>
                            <div className="mt-1 font-medium truncate" title={d.name}>
                              {d.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{d.slug}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ) : null}

                {directoryId ? (
                  <>
                    {media.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25">
                          <ImageIcon className="h-9 w-9 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-semibold mb-2">{t("No files in this folder")}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t("Upload files to this folder.")}</p>
                        <Button type="button" onClick={promptUpload} disabled={uploading}>
                          <Upload className="h-4 w-4 mr-2" />
                          {t("Upload Files")}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {media.map((item) => {
                          const isImg = item.mime_type.startsWith("image/");
                          return (
                            <div key={item.id} className="relative group rounded-lg overflow-hidden border border-border bg-background">
                              <div className="relative aspect-square bg-muted">
                                {isImg ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.thumb_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">FILE</div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button type="button" size="icon" variant="destructive" className="h-8 w-8" onClick={() => remove(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                  <p className="text-xs text-white truncate" title={item.name}>
                                    {item.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>

        <CardContent className="px-4 py-3 border-t bg-muted/10">
          <Pagination
            page={page}
            lastPage={lastPage}
            total={total}
            from={from}
            to={to}
            onPageChange={(p) => {
              setPage(p);
              void fetchMedia({ page: p });
            }}
          />
        </CardContent>
      </Card>

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
    </div>
  );
}

