"use client";

import * as React from "react";
import Link from "next/link";
import { DollarSign, Loader2, Package, ShoppingCart, Truck } from "lucide-react";

import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

type Stats = {
  productCount: number;
  orderCount: number;
  openDeliveries: number;
  queueCount: number;
  grossRevenue: number;
};

function StatCard({
  icon,
  label,
  value,
  tint = DASHBOARD_STAT_ICON_TINT,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>{icon}</span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function VendorDashboard({ vendorName }: { vendorName?: string }) {
  const { settings } = useAppSettings();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [name, setName] = React.useState(vendorName ?? "");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/vendor/overview", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (active && data?.ok) {
          setStats(data.stats as Stats);
          if (data.vendorName) setName(data.vendorName);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const money = (n: number) => formatCurrency(n, settings);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{name || "Vendor Dashboard"}</h2>
          <p className="text-sm text-muted-foreground">Overview of your marketplace performance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/marketplace/vendor/products">Products</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/marketplace/vendor/orders">Orders</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
            label="Orders"
            value={String(stats?.orderCount ?? 0)}
          />
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Products"
            value={String(stats?.productCount ?? 0)}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            label="Gross revenue"
            value={money(stats?.grossRevenue ?? 0)}
          />
          <StatCard
            icon={<Truck className="h-5 w-5 text-muted-foreground" />}
            label="Open deliveries"
            value={String(stats?.openDeliveries ?? 0)}
          />
        </div>
      )}
    </div>
  );
}
