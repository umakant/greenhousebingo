"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Loader2, MapPin, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";
import {
  GANTT_STAFF_DAY_COLORS,
  GANTT_STAFF_DAY_STATUS_ORDER,
  staffDayStatusLabel,
  type GanttStaffDayStatus,
} from "@/lib/gantt-staff-day-status";

type AssignmentDay = {
  date: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
  status: GanttStaffDayStatus;
  clockedIn: string | null;
};

type AssignmentItem = {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  locationName: string | null;
  startDate: string | null;
  endDate: string | null;
  startDateDisplay: string | null;
  endDateDisplay: string | null;
  days: AssignmentDay[];
};

type Payload = {
  ok: boolean;
  staff: { id: string; name: string; email: string | null } | null;
  items: AssignmentItem[];
};

function statusBadgeClass(status: GanttStaffDayStatus): string {
  if (status === "confirmed") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "decline") return "border-red-300 bg-red-50 text-red-800";
  if (status === "conflict") return "border-blue-300 bg-blue-50 text-blue-800";
  if (status === "accept") return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-gray-300 bg-white text-gray-800";
}

function dayPillTextColor(status: GanttStaffDayStatus): string {
  if (status === "begin" || status === "accept") return "#374151";
  return "#ffffff";
}

function dayPillColor(status: GanttStaffDayStatus): string {
  return GANTT_STAFF_DAY_COLORS[status];
}

function formatDayLabel(dateKey: string): string {
  try {
    return format(parseISO(dateKey), "EEE, MMM d");
  } catch {
    return dateKey;
  }
}

export function MyAssignmentsClient() {
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [clockingId, setClockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gantt/my-assignments");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as Payload;
      setStaffName(data.staff?.name ?? null);
      setItems(data.items ?? []);
    } catch {
      toast.error(t("Failed to load your assignments"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClockIn = async (assignmentId: string, date: string) => {
    setClockingId(`${assignmentId}:${date}`);
    try {
      const res = await fetch(`/api/gantt/my-assignments/${assignmentId}/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("Could not clock in"));
        return;
      }
      if (data.alreadyClockedIn) {
        toast.info(t("Already clocked in for this day"));
      } else {
        toast.success(t("Clocked in at job site"));
      }
      await load();
    } catch {
      toast.error(t("Could not clock in"));
    } finally {
      setClockingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("Loading assignments…")}
      </div>
    );
  }

  if (!staffName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("My Assignments")}</CardTitle>
          <CardDescription>
            {t("No staff profile is linked to your account email. Ask your manager to add you in Project setup with the same email you use to log in.")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("My Assignments")}</CardTitle>
          <CardDescription>
            {t("Hi")} {staffName}. {t("You have no project assignments yet.")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const todayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{t("Hi")} <strong className="text-foreground">{staffName}</strong></span>
        <span className="hidden sm:inline">·</span>
        <span className="inline-flex items-center gap-3">
          {GANTT_STAFF_DAY_STATUS_ORDER.map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span
                className={status === "begin" ? "h-2.5 w-2.5 rounded-[3px] ring-1 ring-gray-300" : "h-2.5 w-2.5 rounded-[3px]"}
                style={{ backgroundColor: dayPillColor(status) }}
              />
              {t(staffDayStatusLabel(status))}
            </span>
          ))}
        </span>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.projectColor ?? "#3B82F6" }}
                />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg">{item.projectName}</CardTitle>
                  <CardDescription className="mt-1 space-y-1">
                    {item.locationName ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.locationName}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {item.startDateDisplay && item.endDateDisplay
                        ? `${item.startDateDisplay} – ${item.endDateDisplay}`
                        : t("See schedule below")}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {item.days.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No working days configured yet.")}</p>
              ) : (
                item.days.map((day) => {
                  const canClockIn = day.date === todayKey && !day.clockedIn;
                  const clockKey = `${item.id}:${day.date}`;

                  return (
                    <div
                      key={day.date}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/10 px-3 py-2.5"
                    >
                      <div
                        className={cn(
                          "flex w-[64px] shrink-0 flex-col items-center justify-center rounded-md px-2 py-1.5",
                          day.status === "begin" && "ring-1 ring-gray-300",
                        )}
                        style={{
                          backgroundColor: dayPillColor(day.status),
                          color: dayPillTextColor(day.status),
                        }}
                      >
                        <span className="text-base font-bold leading-none tabular-nums">
                          {formatDayLabel(day.date).split(",")[1]?.trim().split(" ")[1] ?? "?"}
                        </span>
                        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide">
                          {formatDayLabel(day.date).split(" ")[1]?.slice(0, 3) ?? ""}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{formatDayLabel(day.date)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {day.startTime} – {day.endTime}
                          {day.clockedIn ? ` · ${t("In at")} ${day.clockedIn}` : ""}
                        </p>
                      </div>

                      <Badge variant="outline" className={statusBadgeClass(day.status)}>
                        {t(staffDayStatusLabel(day.status))}
                      </Badge>

                      {canClockIn ? (
                        <Button
                          size="sm"
                          className="shrink-0"
                          disabled={clockingId === clockKey}
                          onClick={() => void handleClockIn(item.id, day.date)}
                        >
                          {clockingId === clockKey ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <PlayCircle className="mr-1 h-4 w-4" />
                          )}
                          {t("Clock In")}
                        </Button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
