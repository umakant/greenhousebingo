"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { t } from "@/lib/admin-t";


const STATUS_OPTIONS = ["Not Started", "Ongoing", "Finished", "Onhold"];

export type ProjectInitialData = {
  id?: number;
  name?: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
};

interface ProjectFormProps {
  initial?: ProjectInitialData;
  onSuccess?: (id: number) => void;
  onCancel?: () => void;
  mode?: "page" | "drawer";
}

export function ProjectForm({ initial, onSuccess, onCancel, mode = "page" }: ProjectFormProps) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const isDrawer = mode === "drawer";

  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [startDate, setStartDate] = React.useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = React.useState(initial?.end_date ?? "");
  const [status, setStatus] = React.useState(initial?.status ?? "Not Started");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t("Project name is required"));
    setSaving(true);
    setError(null);

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: status || "Not Started",
    };

    try {
      const url = isEdit ? `/api/project/${initial!.id}` : "/api/project/store";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let data: { error?: string; id?: number; ok?: boolean } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          throw new Error(
            res.ok ? t("Invalid response from server") : t(`Request failed (${res.status})`),
          );
        }
      } else if (!res.ok) {
        throw new Error(t(`Request failed (${res.status})`));
      }
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      const targetId = isEdit ? initial!.id! : Number(data.id);
      if (!isEdit && (!Number.isFinite(targetId) || targetId <= 0)) {
        throw new Error(t("Invalid response from server"));
      }
      if (onSuccess) {
        onSuccess(targetId);
      } else {
        window.location.href = `/project/${targetId}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else router.back();
  };

  const fields = (
    <div className="grid gap-5">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="proj-name">{t("Name")}</Label>
        <Input
          id="proj-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("Project name")}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="proj-desc">{t("Description")}</Label>
        <Textarea
          id="proj-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Describe the project...")}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proj-start">{t("Start Date")}</Label>
          <Input
            id="proj-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proj-end">{t("End Date")}</Label>
          <Input
            id="proj-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("Status")}</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{t(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("Cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t("Saving...") : (isEdit ? t("Update Project") : t("Create Project"))}
        </Button>
      </div>
    </div>
  );

  if (isDrawer) {
    return <form onSubmit={handleSubmit}>{fields}</form>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? t("Edit Project") : t("Create Project")}
          </CardTitle>
        </CardHeader>
        <CardContent>{fields}</CardContent>
      </Card>
    </form>
  );
}
