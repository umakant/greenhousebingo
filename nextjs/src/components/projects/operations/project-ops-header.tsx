"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Hash,
  MapPin,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import { ProjectSetupButton, ProjectSetupDrawer } from "@/components/projects/operations/project-setup-drawer";

const EDIT_FORM_ID = "project-ops-edit-form";

export function ProjectOpsHeader({
  project,
  canManage,
  onProjectUpdated,
  setupOpen,
  onSetupOpenChange,
  visibleSections,
  onVisibleSectionsChange,
}: {
  project: {
    id: number;
    name: string;
    status: string | null;
    property_name?: string | null;
    city?: string | null;
    state?: string | null;
    usr_number?: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  canManage: boolean;
  onProjectUpdated?: () => void;
  setupOpen?: boolean;
  onSetupOpenChange?: (open: boolean) => void;
  visibleSections?: Record<string, boolean>;
  onVisibleSectionsChange?: (sections: Record<string, boolean>) => void;
}) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const [editOpen, setEditOpen] = React.useState(false);
  const status = project.status ?? "Not Started";
  const isActive = status.toLowerCase() === "ongoing" || status === "Ongoing";
  const location = [project.city, project.state].filter(Boolean).join(", ");
  const dates =
    project.start_date || project.end_date
      ? `${project.start_date ? fmtDateLib(project.start_date, settings) : "—"} – ${project.end_date ? fmtDateLib(project.end_date, settings) : "—"}`
      : null;

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Badge className={isActive ? "bg-blue-600 hover:bg-blue-600" : "bg-slate-600"}>
              {isActive ? t("Active Operation") : status}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.name}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {project.property_name ? (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 shrink-0" />
                  {project.property_name}
                </span>
              ) : null}
              {location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {location}
                </span>
              ) : null}
              {dates ? (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {dates}
                </span>
              ) : null}
              {project.usr_number ? (
                <span className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 shrink-0" />
                  USR #: {project.usr_number}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/project/report?project_id=${project.id}`}>
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                {t("Export Excel")}
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/projects">{t("Back")}</Link>
            </Button>
            {canManage ? (
              <>
                {onSetupOpenChange && visibleSections && onVisibleSectionsChange ? (
                  <ProjectSetupButton onClick={() => onSetupOpenChange(true)} />
                ) : null}
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  {t("Edit Project")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {canManage ? (
        <ProjectDrawer
          open={editOpen}
          onOpenChange={setEditOpen}
          title={t("Edit Project")}
          description={t("Update the project details below.")}
          className="sm:max-w-none w-[640px] max-w-[92vw] overflow-y-auto"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" form={EDIT_FORM_ID}>
                {t("Save Changes")}
              </Button>
            </>
          }
        >
          <ProjectEditForm
            projectId={project.id}
            formId={EDIT_FORM_ID}
            showActions={false}
            onCancel={() => setEditOpen(false)}
            onSuccess={() => {
              setEditOpen(false);
              onProjectUpdated?.();
            }}
          />
        </ProjectDrawer>
      ) : null}

      {canManage && setupOpen != null && onSetupOpenChange && visibleSections && onVisibleSectionsChange ? (
        <ProjectSetupDrawer
          projectId={project.id}
          open={setupOpen}
          onOpenChange={onSetupOpenChange}
          visibleSections={visibleSections}
          onVisibleSectionsChange={onVisibleSectionsChange}
        />
      ) : null}
    </>
  );
}
