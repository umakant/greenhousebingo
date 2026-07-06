"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { DollarSign, ShoppingCart, Users, Package, AlertTriangle, TrendingUp, ShoppingBag } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface RecentSale {
  id: number;
  sale_number: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer?: { name: string };
}
interface DailySale { date: string; total: number }
interface TopProduct { name: string; total_quantity: number; total_revenue: number }
interface OutOfStockItem { product_name: string; sku: string; warehouse_name: string; stock: number }
interface Stats {
  total_products: number;
  total_customers: number;
  total_vendors: number;
  total_sales: number;
  total_revenue: number;
  today_revenue: number;
  avg_transaction: number;
  unique_customers: number;
  total_expenses: number;
  total_purchases: number;
}
interface PosDashboardData {
  stats: Stats;
  last10DaysSales: DailySale[];
  recentSales: RecentSale[];
  topProducts: TopProduct[];
  outOfStockProductsList: OutOfStockItem[];
}

function fmt(appSettings: ReturnType<typeof useAppSettingsOptional>, amount: number) {
  return appSettings
    ? formatCurrency(amount, appSettings.settings)
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount || 0);
}

function formatDateShort(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }); }
  catch { return iso; }
}

// ── Main Component ───────────────────────────────────────────────────────────
export function PosDashboard() {
  const appSettings = useAppSettingsOptional();
  const [data, setData] = useState<PosDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pos/dashboard", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  const s = data?.stats ?? {
    total_products: 0, total_customers: 0, total_vendors: 0, total_sales: 0,
    total_revenue: 0, today_revenue: 0, avg_transaction: 0, unique_customers: 0,
    total_expenses: 0, total_purchases: 0,
  };
  const last10 = data?.last10DaysSales ?? [];
  const recent = data?.recentSales ?? [];
  const topProds = data?.topProducts ?? [];
  const outOfStock = data?.outOfStockProductsList ?? [];

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard
          label="Today Revenue"
          value={fmt(appSettings, s.today_revenue)}
          sub="Current day revenue"
          href="/sales"
          icon={<DollarSign className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Total Sales"
          value={String(s.total_sales)}
          sub={`${fmt(appSettings, s.total_revenue)} revenue`}
          href="/sales"
          icon={<ShoppingCart className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Avg Transaction"
          value={fmt(appSettings, s.avg_transaction)}
          sub={`${s.unique_customers} customers`}
          href="/customers"
          icon={<Users className="h-8 w-8" />}
        />
        <DashboardStatCard
          label="Total Products"
          value={String(s.total_products)}
          sub="In catalog"
          href="/products"
          icon={<Package className="h-8 w-8" />}
        />
      </div>

      {/* ── Last 10 Days Sales Chart ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Last 10 Days Sales Report</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={last10} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50}
                tickFormatter={(v) => v === 0 ? "0" : `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs text-muted-foreground">→ Daily Sales</p>
        </CardContent>
      </Card>

      {/* ── Out of Stock Products ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Out of Stock Products (Warehouse Wise)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {outOfStock.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No out-of-stock products</p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y">
              {outOfStock.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.product_name} ({item.sku})
                      </p>
                      <p className="text-xs text-muted-foreground">Warehouse: {item.warehouse_name}</p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <span className="inline-block rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {Number(item.stock).toFixed(2)} units
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">Out of Stock</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Top Selling + Recent Transactions ───────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProds.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No product data</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y">
                {topProds.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.total_quantity.toFixed(2)} units sold</p>
                    </div>
                    <span className="ml-4 flex-shrink-0 text-sm font-bold text-muted-foreground">
                      {fmt(appSettings, p.total_revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No recent transactions</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y">
                {recent.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{sale.sale_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.customer?.name ?? "Walk-in"}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="text-sm font-bold">{fmt(appSettings, sale.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateShort(sale.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
