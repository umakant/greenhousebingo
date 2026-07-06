"use client";

import * as React from "react";
import type { SowFormData, SowProjectMeta } from "@/lib/project-sow-form";
import { renderSowDocumentHtml } from "@/lib/project-sow-document";
import { cn } from "@/lib/utils";

export function SowDocumentPreview({
  employeeName,
  project,
  form,
  compact,
}: {
  employeeName: string;
  project: SowProjectMeta;
  form: SowFormData;
  compact?: boolean;
}) {
  const html = React.useMemo(
    () =>
      renderSowDocumentHtml({
        employeeName,
        project,
        form,
      }),
    [employeeName, project, form],
  );

  return (
    <iframe
      srcDoc={html}
      title={`Scope of Work — ${employeeName}`}
      className={cn(
        "w-full rounded-lg border border-border bg-white shadow-sm",
        compact ? "min-h-[520px] h-[min(70vh,720px)]" : "min-h-[640px] h-[80vh]",
      )}
    />
  );
}
