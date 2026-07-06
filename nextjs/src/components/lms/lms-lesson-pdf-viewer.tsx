"use client";

import * as React from "react";

export function LmsLessonPdfViewer({
  documentUrl,
  title,
  className,
  onReady,
}: {
  documentUrl: string;
  title?: string;
  className?: string;
  onReady?: () => void;
}) {
  const readyRef = React.useRef(false);

  React.useEffect(() => {
    if (!documentUrl || readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [documentUrl, onReady]);

  if (!documentUrl?.trim()) {
    return <p className="text-sm text-muted-foreground">No PDF document configured for this lesson.</p>;
  }

  const src = documentUrl.includes("#") ? documentUrl : `${documentUrl}#toolbar=1&navpanes=0`;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-lg border border-border/80 bg-muted/30">
        <iframe
          title={title ?? "Course PDF"}
          src={src}
          className="h-[min(75vh,720px)] w-full bg-background"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Open PDF in a new tab
        </a>
      </p>
    </div>
  );
}
