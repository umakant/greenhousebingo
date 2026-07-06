"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { GanttEditAssignmentPanel } from "@/components/gantt/gantt-edit-assignment-panel";
import type {
  GanttProject,
  GanttProjectLocation,
  GanttProjectStaff,
  GanttStaff,
} from "@/components/gantt/gantt-types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { t } from "@/lib/admin-t";
import { buildGanttClockMap, type GanttClockEntry } from "@/lib/gantt-staff-day-status";
import { dedupeGanttStaffList } from "@/lib/gantt-staff-dedupe";

type EditorContext = {
  assignment: GanttProjectStaff;
  project: GanttProject;
  location: GanttProjectLocation | null;
};

export function GanttEditAssignmentDrawer({
  open,
  onOpenChange,
  ganttAssignmentId,
  focusedDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ganttAssignmentId: string | null;
  focusedDate?: string | null;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<EditorContext | null>(null);
  const [staffList, setStaffList] = useState<GanttStaff[]>([]);
  const [clockMap, setClockMap] = useState<Map<string, GanttClockEntry>>(new Map());

  const load = useCallback(async () => {
    if (!ganttAssignmentId) return;
    setLoading(true);
    try {
      const [assignmentRes, staffRes, clockRes] = await Promise.all([
        fetch(`/api/gantt-project-staff/${ganttAssignmentId}`, { credentials: "include" }),
        fetch("/api/gantt-staff", { credentials: "include" }),
        fetch("/api/gantt-hour-entries?companyScope=1", { credentials: "include" }),
      ]);

      if (!assignmentRes.ok) {
        toast.error(t("Assignment not found"));
        onOpenChange(false);
        return;
      }

      const payload = (await assignmentRes.json()) as {
        assignment: GanttProjectStaff;
        project: GanttProject;
        location: GanttProjectLocation | null;
      };
      const staffPayload = staffRes.ok ? ((await staffRes.json()) as GanttStaff[]) : [];
      const clockPayload = clockRes.ok
        ? ((await clockRes.json()) as Array<{
            assignmentId: string;
            date: string;
            startTime?: string | null;
            endTime?: string | null;
          }>)
        : [];

      setCtx({
        assignment: payload.assignment,
        project: payload.project,
        location: payload.location,
      });
      setStaffList(Array.isArray(staffPayload) ? dedupeGanttStaffList(staffPayload) : []);
      setClockMap(buildGanttClockMap(clockPayload));
    } catch {
      toast.error(t("Failed to load assignment"));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [ganttAssignmentId, onOpenChange]);

  useEffect(() => {
    if (open && ganttAssignmentId) {
      void load();
    }
    if (!open) {
      setCtx(null);
    }
  }, [open, ganttAssignmentId, load]);

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!ctx) return;
    const res = await fetch(`/api/gantt-project-staff/${ctx.assignment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        notification?: { emailSent?: boolean; smsSent?: boolean; reason?: string };
        eventDatesExtended?: boolean;
      } | null;
      toast.success(t("Assignment updated"));
      if (payload?.eventDatesExtended) {
        toast.info(t("Event dates extended on the calendar"));
      }
      if (payload?.notification) {
        const { emailSent, smsSent, reason } = payload.notification;
        if (emailSent && smsSent) toast.info(t("Staff notified by email and text message"));
        else if (emailSent) toast.info(t("Staff notified by email"));
        else if (smsSent) toast.info(t("Staff notified by text message"));
        else if (data.notifyStaff !== false) {
          toast.warning(
            reason === "no_contact"
              ? t("Assignment saved but staff has no email or phone on file.")
              : t("Assignment saved but notification could not be sent. Check email settings."),
          );
        }
      }
      onOpenChange(false);
      onSaved?.();
      return;
    }
    if (res.status === 409) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? t("Approve event date extension to save"));
      return;
    }
    toast.error(t("Failed to update assignment"));
  };

  const handleDelete = async () => {
    if (!ctx) return;
    if (!window.confirm(t("Delete this assignment?"))) return;
    const res = await fetch(`/api/gantt-project-staff/${ctx.assignment.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success(t("Assignment removed"));
      onOpenChange(false);
      onSaved?.();
      return;
    }
    toast.error(t("Failed to delete assignment"));
  };

  const panelKey = useMemo(
    () => `${ctx?.assignment.id ?? "none"}:${focusedDate ?? ""}`,
    [ctx?.assignment.id, focusedDate],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[440px] [&>button.absolute]:hidden"
      >
        {loading || !ctx ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {t("Loading...")}
          </div>
        ) : (
          <GanttEditAssignmentPanel
            key={panelKey}
            assignment={ctx.assignment}
            assignmentType="staff"
            project={ctx.project}
            location={ctx.location}
            staffList={staffList}
            subsList={[]}
            clockMap={clockMap}
            focusedDate={focusedDate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
