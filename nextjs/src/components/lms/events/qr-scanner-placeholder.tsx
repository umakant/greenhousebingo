"use client";

import { ScanLine } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Placeholder for Phase 4 check-in scanner — wire to camera API in Phase 5. */
export function QRScannerPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanLine className="h-5 w-5" aria-hidden />
          QR scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex aspect-video flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-6 text-center">
          <ScanLine className="mb-3 h-12 w-12 text-muted-foreground/60" aria-hidden />
          <p className="text-sm font-medium">Scanner coming soon</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Use manual check-in below until the camera scanner is connected in production.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
