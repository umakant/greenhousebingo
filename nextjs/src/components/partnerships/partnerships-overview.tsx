"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Handshake,
  Building2,
  Wallet,
  BadgeDollarSign,
  Clock,
  UserCheck,
  CircleDollarSign,
  CheckCircle2,
  Tag,
  Users,
  ShieldAlert,
  Percent,
} from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency as formatCurrencyUtil } from "@/lib/format-currency";
import { t } from "@/lib/admin-t";


type Stats = {
  totalPartners: number;
  activePartners: number;
  pendingApplications: number;
  referredCompanies: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  pendingPayoutTotal: number;
  totalBrands: number;
  activeBrands: number;
  totalOwnershipHolders: number;
  pendingOwnershipRequests: number;
  avgBrandOwnership: number;
};

type BrandSummary = {
  id: string;
  name: string;
  status: string;
  holderCount: number;
  totalOwnership: number;
  availableOwnership: number;
};

export default function PartnershipsOverview() {
  const { settings } = useAppSettings();
  const formatCurrency = (value: number) => formatCurrencyUtil(value || 0, settings);

  const [stats, setStats] = useState<Stats | null>(null);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/partnerships/overview", { credentials: "include" });
        const data = await res.json();
        if (active && data?.ok) {
          setStats(data.stats as Stats);
          setBrands(Array.isArray(data.brands) ? (data.brands as BrandSummary[]) : []);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const dash = (v: string | number) => (loading ? "…" : v);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Partnership overview")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            href="/partnerships/partners"
            label={t("Total Partners")}
            value={dash(stats?.totalPartners ?? 0)}
            sub={`${stats?.activePartners ?? 0} ${t("active")}`}
            icon={<Handshake className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/applications"
            label={t("Pending Applications")}
            value={dash(stats?.pendingApplications ?? 0)}
            sub={t("Awaiting review")}
            icon={<Clock className="h-8 w-8" />}



          />
          <DashboardStatCard
            label={t("Referred Companies")}
            value={dash(stats?.referredCompanies ?? 0)}
            sub={t("Attributed tenants")}
            icon={<Building2 className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/payouts"
            label={t("Total Commission")}
            value={dash(formatCurrency(stats?.totalCommission ?? 0))}
            sub={`${formatCurrency(stats?.paidCommission ?? 0)} ${t("paid")}`}
            icon={<BadgeDollarSign className="h-8 w-8" />}



          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Brand ownership")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            href="/partnerships/brands"
            label={t("Total Brands")}
            value={dash(stats?.totalBrands ?? 0)}
            sub={`${stats?.activeBrands ?? 0} ${t("active")}`}
            icon={<Tag className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/partners"
            label={t("Ownership Partners")}
            value={dash(stats?.totalOwnershipHolders ?? 0)}
            sub={t("Active holders across brands")}
            icon={<Users className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/ownership-requests"
            label={t("Ownership Requests")}
            value={dash(stats?.pendingOwnershipRequests ?? 0)}
            sub={t("Pending review")}
            icon={<ShieldAlert className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/brands"
            label={t("Avg Brand Ownership")}
            value={dash(`${stats?.avgBrandOwnership ?? 0}%`)}
            sub={t("Average assigned ownership")}
            icon={<Percent className="h-8 w-8" />}



          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Commission & payouts")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            href="/partnerships/partners"
            label={t("Active Partners")}
            value={dash(stats?.activePartners ?? 0)}
            sub={`${t("of")} ${stats?.totalPartners ?? 0} ${t("total")}`}
            icon={<UserCheck className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/commission-rules"
            label={t("Pending Commission")}
            value={dash(formatCurrency(stats?.pendingCommission ?? 0))}
            sub={t("Pending / approved")}
            icon={<CircleDollarSign className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/payouts"
            label={t("Paid Commission")}
            value={dash(formatCurrency(stats?.paidCommission ?? 0))}
            sub={t("Settled to partners")}
            icon={<CheckCircle2 className="h-8 w-8" />}



          />
          <DashboardStatCard
            href="/partnerships/payouts"
            label={t("Pending Payouts")}
            value={dash(formatCurrency(stats?.pendingPayoutTotal ?? 0))}
            sub={t("Awaiting processing")}
            icon={<Wallet className="h-8 w-8" />}



          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Commission pipeline")}</CardTitle>
            <CardDescription>{t("Lifetime commission breakdown")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("Pending / approved")}</span>
              <span className="font-medium">{formatCurrency(stats?.pendingCommission ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("Paid out")}</span>
              <span className="font-medium">{formatCurrency(stats?.paidCommission ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("Pending payouts")}</span>
              <span className="font-medium">{formatCurrency(stats?.pendingPayoutTotal ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-medium">{t("Total commission")}</span>
              <span className="font-semibold">{formatCurrency(stats?.totalCommission ?? 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Brands")}</CardTitle>
            <CardDescription>{t("Ownership summary by brand")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">{t("Loading brands…")}</p>
            ) : brands.length === 0 ? (
              <p className="text-muted-foreground">{t("No brands yet.")}</p>
            ) : (
              <>
                {brands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {brand.holderCount} {t("partners")} · {brand.availableOwnership}% {t("available")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={brand.status === "active" ? "default" : "secondary"} className="capitalize">
                        {brand.status}
                      </Badge>
                      <span className="font-medium tabular-nums">{brand.totalOwnership}%</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href="/partnerships/brands">{t("View all brands")}</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Quick actions")}</CardTitle>
            <CardDescription>{t("Manage the partnership program")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/partnerships/partners">{t("Manage Partners")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/brands">{t("Manage Brands")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/applications">{t("Applications")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/ownership-requests">{t("Ownership Requests")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/ownership-history">{t("Ownership History")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/commission-rules">{t("Commission Rules")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/payouts">{t("Payouts")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/marketing-pages">{t("Marketing Pages")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/partnerships/referral-links">{t("Referral Links")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}