"use client";

import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Opens ICS download — API route wired in Phase 5. */
export function CalendarAddButton(props: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Button asChild variant="outline" size="sm" className={props.className}>
      <a href={props.href} download>
        <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden />
        {props.label ?? "Add to calendar"}
      </a>
    </Button>
  );
}
