"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { appConfirm } from "@/lib/app-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { ProjectOpsDynamicForm } from "./project-ops-dynamic-form";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: number;
  name: string;
  phase: string;
  status: string;
  completed_by_name?: string | null;
};

const PHASES = [
  { id: "pre_project", label: "Pre Project", dot: "bg-blue-500", heading: "text-blue-600" },
  { id: "project", label: "Project", dot: "bg-violet-500", heading: "text-violet-600" },
  { id: "post_project", label: "Post Project", dot: "bg-emerald-500", heading: "text-emerald-600" },
] as const;

function EditChecklistDrawer({
  open,
  onOpenChange,
  projectId,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  item: ChecklistItem | null;
  onSaved: () => void;
}) {
  if (!item) return null;
  return (
    <ProjectDrawer open={open} onOpenChange={onOpenChange} title="Edit Checklist Item" footer={null}>
      <ProjectOpsDynamicForm
        sectionId="checklist"
        projectId={projectId}
        initialValues={{ name: item.name, phase: item.phase }}
        submitLabel="Save"
        onSubmit={async (payload) => {
          const res = await fetch(`/api/project/${projectId}/checklist`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, name: payload.name, phase: payload.phase }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error ?? "Failed to save");
          onSaved();
          onOpenChange(false);
        }}
      />
    </ProjectDrawer>
  );
}

export function ChecklistTab({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [items, setItems] = React.useState<ChecklistItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ChecklistItem | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/project/${projectId}/checklist`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id: number, status: string) => {
    if (!canManage) return;
    const next = status === "completed" ? "pending" : "completed";
    await fetch(`/api/project/${projectId}/checklist`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    load();
  };

  const deleteItem = async (item: ChecklistItem) => {
    const ok = await appConfirm({
      title: "Delete checklist item?",
      description: `Remove "${item.name}" from this project checklist.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await fetch(`/api/project/${projectId}/checklist?id=${item.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  };

  const openEdit = (item: ChecklistItem) => {
    setEditItem(item);
    setEditOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Project Checklist</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks are grouped by phase. Manage task templates in{" "}
            <Link href="/project/setup" className="text-primary hover:underline">
              Settings → Tasks
            </Link>
            .
          </p>
        </div>

        <div className="space-y-6 p-5">
          {canManage ? (
            <Button size="sm" onClick={() => setShowAdd(true)}>Add checklist item</Button>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            PHASES.map((phase) => {
              const phaseItems = items.filter((i) => i.phase === phase.id);
              if (phaseItems.length === 0) return null;
              return (
                <div key={phase.id}>
                  <div className={cn("mb-3 flex items-center gap-2 text-sm font-semibold", phase.heading)}>
                    <span className={cn("h-2 w-2 rounded-full", phase.dot)} />
                    {phase.label}
                  </div>
                  <ul className="space-y-2">
                    {phaseItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => void toggle(item.id, item.status)}
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                                item.status === "completed"
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-muted-foreground/40 hover:border-primary",
                              )}
                            >
                              {item.status === "completed" ? <Check className="h-3.5 w-3.5" /> : null}
                            </button>
                          ) : null}
                          <span className={cn("truncate", item.status === "completed" && "text-muted-foreground line-through")}>
                            {item.name}
                          </span>
                          {item.completed_by_name ? (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {item.completed_by_name}
                            </Badge>
                          ) : null}
                        </div>
                        {canManage ? (
                          <div className="flex shrink-0 gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => void deleteItem(item)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ProjectDrawer open={showAdd} onOpenChange={setShowAdd} title="Add Checklist Item" footer={null}>
        <ProjectOpsDynamicForm
          sectionId="checklist"
          projectId={projectId}
          initialValues={{ phase: "project" }}
          submitLabel="Add"
          onSubmit={async (payload) => {
            const res = await fetch(`/api/project/${projectId}/checklist`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to add item");
            setShowAdd(false);
            load();
          }}
        />
      </ProjectDrawer>

      <EditChecklistDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        item={editItem}
        onSaved={load}
      />
    </>
  );
}
