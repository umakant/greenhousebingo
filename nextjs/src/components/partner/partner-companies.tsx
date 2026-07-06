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

type Company = {
  id: string;
  name: string | null;
  isActive: boolean | null;
  plan: string;
  referredAt: string | null;
  createdAt: string;
};

export default function PartnerCompanies() {
  const [rows, setRows] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partner/companies", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) setRows(d.items as Company[]);
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
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Referred</TableHead>
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
                No companies yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                <TableCell>{c.plan}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive !== false ? "default" : "outline"}>
                    {c.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{c.referredAt ? new Date(c.referredAt).toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
