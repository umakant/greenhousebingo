"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventInstructors } from "@/hooks/use-event-instructors";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const CUSTOM_VALUE = "__custom__";
const NONE_VALUE = "__none__";

type EventInstructorFieldProps = {
  instructorUserId?: string;
  instructorName?: string;
  onChange: (patch: { instructorUserId?: string; instructorName?: string }) => void;
  manageHref?: string;
};

export function EventInstructorField(props: EventInstructorFieldProps) {
  const { instructorUserId = "", instructorName = "", onChange, manageHref = EVENT_PLATFORM_PATHS.instructors } =
    props;
  const { instructors, loading } = useEventInstructors();

  const selectedProfile = instructors.find((row) => row.userId === instructorUserId);
  const selectValue = selectedProfile
    ? selectedProfile.userId
    : instructorName.trim()
      ? CUSTOM_VALUE
      : NONE_VALUE;

  function handleSelectChange(value: string) {
    if (value === NONE_VALUE) {
      onChange({ instructorUserId: "", instructorName: "" });
      return;
    }
    if (value === CUSTOM_VALUE) {
      onChange({ instructorUserId: "", instructorName: instructorName || "" });
      return;
    }
    const profile = instructors.find((row) => row.userId === value);
    if (!profile) return;
    onChange({ instructorUserId: profile.userId, instructorName: profile.displayName });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="ev-instructor-select">Instructor</Label>
        <Link href={manageHref} className="text-xs text-primary hover:underline">
          Manage instructors
        </Link>
      </div>

      <Select value={selectValue} onValueChange={handleSelectChange} disabled={loading}>
        <SelectTrigger id="ev-instructor-select">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading instructors…
            </span>
          ) : (
            <SelectValue placeholder="Select an instructor" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>No instructor</SelectItem>
          {instructors.map((row) => (
            <SelectItem key={row.userId} value={row.userId}>
              {row.displayName}
              {row.email ? ` (${row.email})` : ""}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>Custom name…</SelectItem>
        </SelectContent>
      </Select>

      {selectValue === CUSTOM_VALUE ? (
        <Input
          id="ev-instructor"
          value={instructorName}
          onChange={(e) => onChange({ instructorUserId: "", instructorName: e.target.value })}
          placeholder="John Davis"
        />
      ) : selectedProfile ? (
        <p className="text-xs text-muted-foreground">
          Assigned to {selectedProfile.displayName}
          {selectedProfile.headline ? ` — ${selectedProfile.headline}` : ""}
        </p>
      ) : null}
    </div>
  );
}
