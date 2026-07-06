"use client";

import * as React from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/admin-t";


type UploadedZip = { original_name: string; file_name: string; size: number };

export default function AddOnsUpload() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploaded, setUploaded] = React.useState<UploadedZip[] | null>(null);

  const pickFiles = () => inputRef.current?.click();

  const onFilesSelected = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = Array.from(list);
    const zips = next.filter((f) => f.name.toLowerCase().endsWith(".zip"));
    if (zips.length !== next.length) toast.error(t("Only .zip files are allowed."));
    if (zips.length === 0) return;
    setUploaded(null);
    setFiles(zips);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFilesSelected(e.dataTransfer.files);
  };

  async function uploadAndInstall() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files[]", f);
      const res = await fetch("/api/add-ons/upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Upload failed.");

      const z = Array.isArray(json?.files) ? (json.files as UploadedZip[]) : [];
      setUploaded(z);
      toast.success(t("ZIP files uploaded."));

      // Laravel UI says “Install Add-ons”; extraction/install is the next step.
      toast.message(t("Next: implement installation/extraction to fully match Laravel behavior."));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("Upload Add-ons")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("Upload Add-ons Zip Files")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border border-dashed bg-background p-10 text-center"
                onDrop={onDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <UploadCloud className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="mt-4 font-medium">{t("Select ZIP files to upload")}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("Support for multiple ZIP files")}</div>

                <div className="mt-4">
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".zip,application/zip"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onFilesSelected(e.currentTarget.files);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" onClick={pickFiles}>
                    {t("Choose Files")}
                  </Button>
                </div>

                {files.length > 0 ? (
                  <div className="mt-6 text-left">
                    <div className="text-sm font-medium">{t("Selected files")}</div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {files.map((f) => (
                        <div key={f.name} className="truncate" title={f.name}>
                          {f.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {uploaded?.length ? (
                  <div className="mt-6 text-left">
                    <div className="text-sm font-medium">{t("Uploaded")}</div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {uploaded.map((u) => (
                        <div key={u.file_name} className="truncate" title={u.original_name}>
                          {u.original_name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/add-ons")}>
                  {t("Cancel")}
                </Button>
                <Button type="button" onClick={uploadAndInstall} disabled={files.length === 0 || uploading}>
                  {uploading ? t("Installing...") : t("Install Add-ons")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

