"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { t } from "@/lib/admin-t";


export default function CustomPageForm({ mode, id }: { mode: "create" | "edit"; id?: string }) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(mode === "edit");
  const [saving, setSaving] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [content, setContent] = React.useState("");
  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (mode !== "edit" || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/custom-pages/${encodeURIComponent(id)}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok || !json?.ok) throw new Error(json?.message || "Failed to load page.");
        const p = json?.page;
        if (cancelled) return;
        setTitle(String(p?.title ?? ""));
        setSlug(String(p?.slug ?? ""));
        setContent(String(p?.content ?? ""));
        setMetaTitle(String(p?.metaTitle ?? ""));
        setMetaDescription(String(p?.metaDescription ?? ""));
        setIsActive(Boolean(p?.isActive ?? true));
      } catch (e: any) {
        toast.error(e?.message || "Failed to load page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title,
        slug,
        content,
        metaTitle,
        metaDescription,
        isActive,
      };
      const res =
        mode === "create"
          ? await fetch("/api/custom-pages", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/custom-pages/${encodeURIComponent(id || "")}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Save failed.");
      toast.success(t("Saved."));
      router.push("/custom-pages");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">{t("Loading...")}</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? t("Create page") : t("Edit page")}</CardTitle>
          <CardDescription>{t("This page will be available publicly at /page/{slug}.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("Title")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Slug")}</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={t("e.g. about-us")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("Content")}</Label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("Meta title")}</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Meta description")}</Label>
              <Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("Status")}</Label>
              <select
                value={isActive ? "1" : "0"}
                onChange={(e) => setIsActive(e.target.value === "1")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              >
                <option value="1">{t("Active")}</option>
                <option value="0">{t("Inactive")}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? t("Saving...") : t("Save changes")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/custom-pages")} disabled={saving}>
          {t("Cancel")}
        </Button>
      </div>
    </div>
  );
}

