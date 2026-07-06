"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Building2, BadgeDollarSign, Wallet, Copy, Store, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Stats = {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  paidCompanies: number;
  cancelledCompanies: number;
  commissionEarned: number;
  commissionPending: number;
  commissionApproved: number;
  commissionPaid: number;
  marketplaceRevenue: number;
  marketplaceOrders: number;
  marketplaceCompanies: number;
  marketplaceCommissionEarned: number;
  marketplaceCommissionPending: number;
  marketplaceCommissionPaid: number;
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

export default function PartnerDashboard({ slug, referralCode }: { slug: string; referralCode: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      try {
        const res = await fetch("/api/partner/dashboard", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) setStats(d.stats as Stats);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const referralLink = `${origin}/p/${slug}`;
  const signupLink = `${origin}/register?partner=${slug}`;

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard
          label="Referred Companies"
          value={loading ? "…" : stats?.totalCompanies ?? 0}
          sub={`${stats?.activeCompanies ?? 0} active`}
          icon={<Building2 className="h-4 w-4" />}
          href="/partner/companies"
        />
        <DashboardStatCard
          label="Paid Companies"
          value={loading ? "…" : stats?.paidCompanies ?? 0}
          sub={`${stats?.trialCompanies ?? 0} trial`}
          icon={<Users className="h-4 w-4" />}
          href="/partner/referrals"
        />
        <DashboardStatCard
          label="Commission Earned"
          value={loading ? "…" : money(stats?.commissionEarned ?? 0)}
          sub={`${money(stats?.commissionPending ?? 0)} pending`}
          icon={<BadgeDollarSign className="h-4 w-4" />}
          href="/partner/commission"
        />
        <DashboardStatCard
          label="Commission Paid"
          value={loading ? "…" : money(stats?.commissionPaid ?? 0)}
          icon={<Wallet className="h-4 w-4" />}
          href="/partner/commission"
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Marketplace</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardStatCard
            label="Marketplace Revenue"
            value={loading ? "…" : money(stats?.marketplaceRevenue ?? 0)}
            sub={`${stats?.marketplaceOrders ?? 0} paid orders`}
            icon={<TrendingUp className="h-4 w-4" />}
            href="/partner/marketplace-revenue"
          />
          <DashboardStatCard
            label="Buying Companies"
            value={loading ? "…" : stats?.marketplaceCompanies ?? 0}
            icon={<Store className="h-4 w-4" />}
            href="/partner/marketplace-referrals"
          />
          <DashboardStatCard
            label="Marketplace Commission"
            value={loading ? "…" : money(stats?.marketplaceCommissionEarned ?? 0)}
            sub={`${money(stats?.marketplaceCommissionPending ?? 0)} pending`}
            icon={<BadgeDollarSign className="h-4 w-4" />}
            href="/partner/marketplace-commissions"
          />
          <DashboardStatCard
            label="Marketplace Paid"
            value={loading ? "…" : money(stats?.marketplaceCommissionPaid ?? 0)}
            icon={<Wallet className="h-4 w-4" />}
            href="/partner/marketplace-commissions"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your referral links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-muted-foreground">Referral landing</div>
              <code className="block truncate text-xs">{referralLink}</code>
            </div>
            <Button size="sm" variant="outline" onClick={() => copy(referralLink)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-muted-foreground">Direct signup</div>
              <code className="block truncate text-xs">{signupLink}</code>
            </div>
            <Button size="sm" variant="outline" onClick={() => copy(signupLink)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <span className="text-muted-foreground">Referral code: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{referralCode}</code>
          </div>
          <div className="pt-1">
            <Button asChild size="sm" variant="secondary">
              <Link href="/partner/marketing-links">View all marketing links</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
