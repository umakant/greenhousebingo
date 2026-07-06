"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import {
  PROJECT_SIDEBAR_SECTIONS,
  normalizeProjectVisibleSections,
  sortProjectNavSections,
} from "@/lib/project-visible-sections";
import { useTranslation } from "@/contexts/translation-context";

type Props = {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleSections: Record<string, boolean>;
  onVisibleSectionsChange: (sections: Record<string, boolean>) => void;
};

export function ProjectSetupDrawer({
  projectId,
  open,
  onOpenChange,
  visibleSections,
  onVisibleSectionsChange,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = React.useState(visibleSections);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setDraft(normalizeProjectVisibleSections(visibleSections));
  }, [open, visibleSections]);

  const sortedSections = React.useMemo(
    () => sortProjectNavSections([...PROJECT_SIDEBAR_SECTIONS], (s) => t(s.label)),
    [t],
  );

  const setSection = (id: string, checked: boolean) => {
    if (id === "overview") return;
    const next = normalizeProjectVisibleSections({ ...draft, [id]: checked });
    setDraft(next);
    onVisibleSectionsChange(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/project/${projectId}/operations`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible_sections: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to save project setup.");
      const saved = normalizeProjectVisibleSections(data?.project?.visible_sections ?? draft);
      onVisibleSectionsChange(saved);
      toast.success(t("Project setup saved."));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Failed to save project setup."));
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = PROJECT_SIDEBAR_SECTIONS.filter((s) => draft[s.id] !== false).length;

  return (
    <ProjectDrawer
      open={open}
      onOpenChange={onOpenChange}
      scrollable
      title={t("Project Setup")}
      description={t("Choose which sections appear in the project sidebar.")}
      className="sm:max-w-none w-[480px] max-w-[92vw]"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Close")}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? t("Saving…") : t("Save")}
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <p className="shrink-0 text-sm text-muted-foreground">
          {t("Checked sections are shown in the left sidebar. Changes preview immediately; click Save to keep them.")}
        </p>
        <div className="flex shrink-0 items-center justify-between text-xs text-muted-foreground">
          <span>
            {enabledCount} / {PROJECT_SIDEBAR_SECTIONS.length} {t("sections visible")}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const all = normalizeProjectVisibleSections(null);
                setDraft(all);
                onVisibleSectionsChange(all);
              }}
            >
              {t("Show all")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const minimal = normalizeProjectVisibleSections(
                  Object.fromEntries(PROJECT_SIDEBAR_SECTIONS.map((s) => [s.id, s.id === "overview"])),
                );
                setDraft(minimal);
                onVisibleSectionsChange(minimal);
              }}
            >
              {t("Overview only")}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="space-y-1 pb-1">
            {sortedSections.map((section) => {
              const checked = draft[section.id] !== false;
              const locked = section.id === "overview";
              return (
                <label
                  key={section.id}
                  htmlFor={`project-setup-${section.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    id={`project-setup-${section.id}`}
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={(value) => setSection(section.id, value === true)}
                  />
                  <span className="flex-1 text-sm font-medium">{t(section.label)}</span>
                  {locked ? (
                    <span className="text-[11px] text-muted-foreground">{t("Required")}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Settings2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("Overview always stays visible so the project home section remains accessible.")}</span>
        </div>
      </div>
    </ProjectDrawer>
  );
}

export function ProjectSetupButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Settings2 className="mr-1 h-4 w-4" />
      {t("Project Setup")}
    </Button>
  );
}
