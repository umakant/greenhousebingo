"use client";

import * as React from "react";

import { LmsCourseEnrollmentsPanel } from "@/components/lms/lms-course-enrollments-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type LmsCourseEnrollmentsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  courseTitle?: string;
  onUpdated?: () => void;
};

export function LmsCourseEnrollmentsSheet({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onUpdated,
}: LmsCourseEnrollmentsSheetProps) {
  const title = courseTitle?.trim()
    ? `Enrollments — ${courseTitle.trim().slice(0, 48)}`
    : "Enrollments";

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) onUpdated?.();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-4">
            {open && courseId ? (
              <LmsCourseEnrollmentsPanel key={courseId} courseId={courseId} embedded />
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
