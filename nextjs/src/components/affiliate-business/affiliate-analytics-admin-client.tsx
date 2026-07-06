"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-currency";
import { useAppSettings } from "@/contexts/app-settings-context";

type AnalyticsPayload = {
  summary: { totalClicks: number; totalConversions: number; conversionRate: number };
  commissionsByStatus: Array<{ status: string; count: number; total: number }>;
  commissionsByProgram: Array<{ programName: string; count: number; total: number }>;
  monthlyEarnings: Array<{ month: string; total: number }>;
};

export function AffiliateAnalyticsAdminClient() {
  const { settings } = useAppSettings();
  const currency = settings.currencySymbol ?? "$";
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<AnalyticsPayload | null>(null);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/affiliate-business/analytics", { credentials: "include" });
        const json = (await res.json().catch(() => null)) as AnalyticsPayload & { ok?: boolean };
        if (!res.ok || !json?.ok) {
          toast.error("Failed to load analytics");
          setData(null);
          return;
        }
        setData({
          summary: json.summary,
          commissionsByStatus: json.commissionsByStatus,
          commissionsByProgram: json.commissionsByProgram,
          monthlyEarnings: json.monthlyEarnings,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{data.summary.totalClicks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {data.summary.totalConversions.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{data.summary.conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly earnings</CardTitle>
          <CardDescription>Approved and paid commission totals by month.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyEarnings}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0), { currency })}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By status</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.commissionsByStatus.map((row) => (
                <li key={row.status} className="flex justify-between gap-4">
                  <span className="capitalize">{row.status}</span>
                  <span className="text-muted-foreground">
                    {row.count} · {formatCurrency(row.total, { currency })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By program</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.commissionsByProgram.map((row) => (
                <li key={row.programName} className="flex justify-between gap-4">
                  <span>{row.programName}</span>
                  <span className="text-muted-foreground">
                    {row.count} · {formatCurrency(row.total, { currency })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
