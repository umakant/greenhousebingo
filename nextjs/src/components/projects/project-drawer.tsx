"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const PROJECT_DRAWER_CLASS = "sm:max-w-none w-[560px] max-w-[92vw] overflow-y-auto";
export const PROJECT_DRAWER_NARROW_CLASS = "sm:max-w-none w-[420px] max-w-[92vw] overflow-y-auto";
export const PROJECT_DRAWER_WIDTH_CLASS = "sm:max-w-none w-[560px] max-w-[92vw]";
export const PROJECT_DRAWER_NARROW_WIDTH_CLASS = "sm:max-w-none w-[420px] max-w-[92vw]";

export function ProjectDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  narrow,
  scrollable,
  className,
  footerClassName,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  narrow?: boolean;
  /** Pin header/footer and let the body scroll (for long drawer content). */
  scrollable?: boolean;
  className?: string;
  footerClassName?: string;
  bodyClassName?: string;
}) {
  const widthClass = narrow ? PROJECT_DRAWER_NARROW_CLASS : PROJECT_DRAWER_CLASS;
  const scrollableWidthClass = narrow ? PROJECT_DRAWER_NARROW_WIDTH_CLASS : PROJECT_DRAWER_WIDTH_CLASS;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          scrollable ? scrollableWidthClass : widthClass,
          scrollable && "flex flex-col gap-0 overflow-hidden p-0",
          className,
        )}
      >
        <SheetHeader className={cn(scrollable && "shrink-0 border-b px-6 py-4 text-left")}>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div
          className={cn(
            scrollable ? "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-6 py-4" : "mt-4",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <SheetFooter
            className={cn(
              scrollable
                ? "shrink-0 border-t px-6 py-4 sm:justify-end gap-2"
                : "mt-8 sm:justify-end gap-2",
              footerClassName,
            )}
          >
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
