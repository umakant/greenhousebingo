"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutList, Loader2 } from "lucide-react";

import { LmsCourseForm, LMS_COURSE_FORM_ID } from "@/components/lms/lms-course-form";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type LmsCourseSheetMode = "create" | "edit";

type LmsCourseFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LmsCourseSheetMode;
  courseId?: string;
  courseTitle?: string;
  onSaved: () => void;
};

export function LmsCourseFormSheet({
  open,
  onOpenChange,
  mode: initialMode,
  courseId: initialCourseId,
  courseTitle,
  onSaved,
}: LmsCourseFormSheetProps) {
  const [mode, setMode] = React.useState<LmsCourseSheetMode>(initialMode);
  const [courseId, setCourseId] = React.useState<string | undefined>(initialCourseId);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setCourseId(initialCourseId);
    setSaving(false);
  }, [open, initialMode, initialCourseId]);

  const title =
    mode === "create"
      ? "New course"
      : courseTitle?.trim()
        ? `Edit course — ${courseTitle.trim().slice(0, 48)}`
        : "Edit course";

  function handleSaved(newCourseId?: string) {
    onSaved();
    if (mode === "create" && newCourseId) {
      setMode("edit");
      setCourseId(newCourseId);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          {mode === "edit" && courseId ? (
            <Button variant="outline" size="sm" className="mt-2 w-fit" asChild>
              <Link href={`/lms/courses/${courseId}/content`}>
                <LayoutList className="mr-2 h-4 w-4" />
                Curriculum &amp; lessons
              </Link>
            </Button>
          ) : null}
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-4">
            <LmsCourseForm
              key={`${mode}-${courseId ?? "new"}-${open ? "open" : "closed"}`}
              mode={mode}
              courseId={courseId}
              layout="drawer"
              formId={LMS_COURSE_FORM_ID}
              onSaved={handleSaved}
              onSavingChange={setSaving}
            />
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={LMS_COURSE_FORM_ID} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : mode === "create" ? (
              "Create course"
            ) : (
              "Save changes"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
