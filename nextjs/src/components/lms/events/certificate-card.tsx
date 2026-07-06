"use client";

import { Award, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LmsEventCertificate } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<LmsEventCertificate["certificateStatus"], string> = {
  not_eligible: "Not eligible",
  eligible: "Eligible",
  issued: "Issued",
  expired: "Expired",
  revoked: "Revoked",
};

export function CertificateCard(props: {
  certificate: LmsEventCertificate;
  onDownload?: () => void;
  className?: string;
}) {
  const { certificate, onDownload, className } = props;
  const status = certificate.certificateStatus;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base leading-snug">{certificate.eventTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">{certificate.studentName}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Award className="h-5 w-5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant={status === "issued" ? "default" : "secondary"}>{STATUS_LABELS[status]}</Badge>
        {certificate.issuedAt ? (
          <p className="text-xs text-muted-foreground">
            Issued {new Date(certificate.issuedAt).toLocaleDateString()}
          </p>
        ) : null}
        {certificate.expiresAt ? (
          <p className="text-xs text-muted-foreground">
            Expires {new Date(certificate.expiresAt).toLocaleDateString()}
            {certificate.renewalRequired ? " · Renewal required" : ""}
          </p>
        ) : null}
        {status === "issued" && onDownload ? (
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onDownload}>
            <Download className="h-4 w-4" aria-hidden />
            Download
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
