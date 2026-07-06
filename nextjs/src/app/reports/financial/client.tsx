"use client";
import { useEffect, useState } from "react";
import { PosReportLayout } from "@/components/pos/pos-report-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PLData { revenue: number; cogs: number; expenses: number; grossProfit: number; netProfit: number; }

export default function FinancialReportClient() {
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Revenue", value: fmt(data.revenue), color: "border-green-200 bg-green-50 text-green-700" },
              { label: "Cost of Goods", value: fmt(data.cogs), color: "border-red-200 bg-red-50 text-red-700" },
              { label: "Total Expenses", value: fmt(data.expenses), color: "border-orange-200 bg-orange-50 text-orange-700" },
              { label: "Gross Profit", value: fmt(data.grossProfit), color: data.grossProfit >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700" },
              { label: "Net Profit", value: fmt(data.netProfit), color: data.netProfit >= 0 ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700" },
              { label: "Profit Margin", value: data.revenue ? `${((data.netProfit / data.revenue) * 100).toFixed(1)}%` : "—", color: "border-purple-200 bg-purple-50 text-purple-700" },
            ].map(card => (
              <div key={card.label} className={`border rounded-lg p-4 ${card.color}`}>
                <p className="text-xs opacity-75">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PosReportLayout>
  );
}
