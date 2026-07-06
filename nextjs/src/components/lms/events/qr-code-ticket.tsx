"use client";

import { Download, MapPin } from "lucide-react";
import QRCode from "react-qr-code";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LmsEventBookingStatus } from "@/lib/lms-events/constants";
import { cn } from "@/lib/utils";

export type QRCodeTicketProps = {
  eventTitle: string;
  attendeeName: string;
  startsAt: string;
  locationLabel: string;
  qrToken: string;
  bookingStatus: LmsEventBookingStatus;
  onDownload?: () => void;
  className?: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  checked_in: "default",
  completed: "secondary",
  pending: "outline",
  waitlisted: "outline",
  cancelled: "destructive",
  refunded: "destructive",
  no_show: "destructive",
};

export function QRCodeTicket(props: QRCodeTicketProps) {
  const {
    eventTitle,
    attendeeName,
    startsAt,
    locationLabel,
    qrToken,
    bookingStatus,
    onDownload,
    className,
  } = props;

  return (
    <Card className={cn("mx-auto max-w-md overflow-hidden border-2", className)}>
      <CardHeader className="border-b bg-muted/30 pb-4 text-center">
        <CardTitle className="text-lg">{eventTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{attendeeName}</p>
        <Badge variant={STATUS_VARIANT[bookingStatus] ?? "secondary"} className="mx-auto mt-2 capitalize">
          {bookingStatus.replace(/_/g, " ")}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-6">
        <div className="rounded-xl border bg-white p-4">
          <QRCode value={qrToken} size={160} />
        </div>
        <div className="w-full space-y-1 text-center text-sm text-muted-foreground">
          <p>{new Date(startsAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}</p>
          <p className="inline-flex items-center justify-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {locationLabel}
          </p>
          <p className="font-mono text-xs">{qrToken}</p>
        </div>
        {onDownload ? (
          <Button type="button" variant="outline" className="gap-1.5" onClick={onDownload}>
            <Download className="h-4 w-4" aria-hidden />
            Download ticket
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
