"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Referral = {
  id: string;
  companyName: string | null;
  referralCode: string | null;
  partnerSlug: string | null;
  referralStatus: string;
  signupDate: string | null;
  createdAt: string;
};

export default function PartnerReferrals() {
  const [rows, setRows] = React.useState<Referral[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partner/referrals", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) setRows(d.items as Referral[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Signup date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No referrals yet. Share your referral link to get started.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.companyName ?? "Pending signup"}</TableCell>
                <TableCell>
                  <code className="text-xs">{r.referralCode ?? "—"}</code>
                </TableCell>
                <TableCell>
                  <Badge variant={r.referralStatus === "active" ? "default" : "outline"}>{r.referralStatus}</Badge>
                </TableCell>
                <TableCell>{r.signupDate ? new Date(r.signupDate).toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
