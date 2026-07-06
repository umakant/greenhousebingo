"use client";
import { useEffect, useState } from "react";
import { PosReportLayout } from "@/components/pos/pos-report-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PLData { revenue: number; cogs: number; expenses: number; grossProfit: number; netProfit: number; }

export default function ProfitLossClient() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/pos/reports?type=profit-loss&from=${from}&to=${to}`, { credentials: "include" })
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <PosReportLayout>
      <div className="space-y-4">
        <div className="flex gap-3 items-end p-4 border rounded-lg bg-muted/30">
          <div><Label className="mb-1.5 block text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="mb-1.5 block text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
          <Button onClick={load} size="sm">Generate</Button>
        </div>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : data && (
          <div className="border rounded-lg divide-y">
            {[
              { label: "Revenue", value: fmt(data.revenue), color: "text-green-600" },
              { label: "Cost of Goods (Purchases)", value: fmt(data.cogs), color: "text-red-600" },
              { label: "Gross Profit", value: fmt(data.grossProfit), color: data.grossProfit >= 0 ? "text-green-700 font-bold" : "text-red-700 font-bold", border: true },
              { label: "Expenses", value: fmt(data.expenses), color: "text-orange-600" },
              { label: "Net Profit", value: fmt(data.netProfit), color: data.netProfit >= 0 ? "text-green-700 font-bold text-lg" : "text-red-700 font-bold text-lg", border: true },
            ].map(row => (
              <div key={row.label} className={`flex justify-between px-6 py-3 ${row.border ? "bg-muted/30" : ""}`}>
                <span className="text-sm">{row.label}</span>
                <span className={`text-sm ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PosReportLayout>
  );
}
