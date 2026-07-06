"use client";
import { useEffect, useState } from "react";
import { PosReportLayout } from "./pos-report-layout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./pos-simple-admin";

interface ColDef {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

interface SummaryCard {
  label: string;
  value: string;
  color?: string;
}

interface PosReportPageProps {
  reportType: string;
  title: string;
  columns: ColDef[];
  summaryCards?: (summary: Record<string, unknown>) => SummaryCard[];
  defaultFrom?: string;
  defaultTo?: string;
}

export function PosReportPage({ reportType, title, columns, summaryCards, defaultFrom, defaultTo }: PosReportPageProps) {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [from, setFrom] = useState(defaultFrom ?? firstOfMonth);
  const [to, setTo] = useState(defaultTo ?? today);
  const [data, setData] = useState<{ rows: Record<string, unknown>[]; summary: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/pos/reports?type=${reportType}&from=${from}&to=${to}`, { credentials: "include" })
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cards = summaryCards && data ? summaryCards(data.summary) : [];

  return (
    <PosReportLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end p-4 border rounded-lg bg-muted/30">
          <div>
            <Label className="mb-1.5 block text-xs">From</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">To</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
          </div>
          <Button onClick={load} size="sm">Generate</Button>
        </div>

        {cards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map(card => (
              <div key={card.label} className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={`text-xl font-bold mt-1 ${card.color ?? ""}`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !data?.rows?.length ? (
                <TableRow><TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground">No data for this period</TableCell></TableRow>
              ) : data.rows.map((row, i) => (
                <TableRow key={String(row.id ?? i)}>
                  {columns.map(col => <TableCell key={col.key}>{col.render ? col.render(row) : String(row[col.key] ?? "—")}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data && <p className="text-xs text-muted-foreground">{data.rows?.length ?? 0} records</p>}
      </div>
    </PosReportLayout>
  );
}
