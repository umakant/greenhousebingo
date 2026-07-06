"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { ProjectOpsDynamicForm } from "./project-ops-dynamic-form";
import type { ProjectOpsSectionId } from "@/lib/project-ops-form-templates";

const ROLE_COPY = {
  agent: {
    drawerTitle: "Assign Agent",
    submitLabel: "Assign Agent",
    sectionId: "agents" as ProjectOpsSectionId,
  },
  medic: {
    drawerTitle: "Assign Medical Personnel",
    submitLabel: "Assign Medic",
    sectionId: "medics" as ProjectOpsSectionId,
  },
  security: {
    drawerTitle: "Assign Security Agent",
    submitLabel: "Assign Agent",
    sectionId: "security" as ProjectOpsSectionId,
  },
} as const;

export function AssignStaffDialog({
  open,
  onOpenChange,
  projectId,
  role,
  drawerTitle: drawerTitleProp,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
  role: "agent" | "medic" | "security";
  drawerTitle?: string;
  onAssigned: () => void;
}) {
  const copy = ROLE_COPY[role];
  const drawerTitle = drawerTitleProp || copy.drawerTitle;
  const formKey = open ? `${role}-${projectId}` : "closed";

  return (
    <ProjectDrawer open={open} onOpenChange={onOpenChange} title={drawerTitle} footer={null}>
      {open ? (
        <ProjectOpsDynamicForm
          key={formKey}
          sectionId={copy.sectionId}
          projectId={projectId}
          initialValues={{ assignment_mode: "existing" }}
          submitLabel={copy.submitLabel}
          onSubmit={async (payload) => {
            const mode = String(payload.assignment_mode ?? "existing");
            const body: Record<string, unknown> = {
              role,
              work_date: payload.work_date || undefined,
              end_date: payload.end_date || payload.work_date || undefined,
              start_time: payload.start_time || undefined,
              end_time: payload.end_time || undefined,
              position: payload.position || undefined,
            };
            if (mode === "existing") {
              if (!payload.user_id) throw new Error("Select a staff member");
              body.user_id = Number(payload.user_id);
            } else if (role === "medic") {
              if (!payload.first_name || !payload.last_name || !payload.email) {
                throw new Error("First name, last name, and email are required");
              }
              body.first_name = payload.first_name;
              body.last_name = payload.last_name;
              body.email = payload.email;
            } else {
              if (!payload.name || !payload.email) throw new Error("Name and email required");
              body.name = payload.name;
              body.email = payload.email;
            }

            const res = await fetch(`/api/project/${projectId}/staff`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to assign");
            onOpenChange(false);
            onAssigned();
          }}
        />
      ) : null}
    </ProjectDrawer>
  );
}
