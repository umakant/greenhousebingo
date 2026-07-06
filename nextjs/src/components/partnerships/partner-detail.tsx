"use client";

import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Detail = {
  item: {
    id: string;
    name: string;
    email: string | null;
    brandName: string | null;
    slug: string;
    referralCode: string;
    commissionRate: number | null;
    status: string;
  };
  stats: {
    totalCompanies: number;
    activeCompanies: number;
    trialCompanies: number;
    paidCompanies: number;
    cancelledCompanies: number;
    commissionEarned: number;
    commissionPending: number;
    commissionApproved: number;
    commissionPaid: number;
  };
  companies: Array<{ id: string; name: string | null; email: string | null; activePlan: number | null; referredAt: string | null }>;
  commissions: Array<{ id: string; companyId: string; orderRef: string | null; amount: number; commissionRate: number; commissionAmount: number; status: string; createdAt: string }>;
  referrals: Array<{ id: string; companyId: string | null; referralStatus: string; partnerSlug: string | null; signupDate: string | null }>;
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

export default function PartnerDetail({ partnerId }: { partnerId: string }) {
  const [data, setData] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [assignSearch, setAssignSearch] = React.useState("");
  const [candidates, setCandidates] = React.useState<Array<{ id: string; name: string | null; email: string | null }>>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partnerships/partners/${partnerId}`, { credentials: "include" });
      const d = await res.json();
      if (d?.ok) setData(d as Detail);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const searchCandidates = React.useCallback(async () => {
    const url = new URL("/api/partnerships/companies", window.location.origin);
    if (assignSearch.trim()) url.searchParams.set("search", assignSearch.trim());
    const res = await fetch(url.toString(), { credentials: "include" });
    const d = await res.json();
    if (d?.ok) setCandidates(d.items);
  }, [assignSearch]);

  const assign = async (companyId: string) => {
    const res = await fetch(`/api/partnerships/partners/${partnerId}/companies`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      toast.success("Company assigned");
      setCandidates((c) => c.filter((x) => x.id !== companyId));
      void load();
    } else {
      toast.error(d?.message ?? "Assign failed");
    }
  };

  const unassign = async (companyId: string) => {
    const res = await fetch(`/api/partnerships/partners/${partnerId}/companies`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      toast.success("Company removed");
      void load();
    } else {
      toast.error(d?.message ?? "Remove failed");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return <p className="text-muted-foreground">Partner not found.</p>;

  const { item, stats } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {item.brandName || item.name}
            <Badge variant={item.status === "active" ? "default" : "outline"}>{item.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Email</div>
            <div>{item.email ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Referral code</div>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.referralCode}</code>
          </div>
          <div>
            <div className="text-muted-foreground">Slug</div>
            <div>/p/{item.slug}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Commission rate</div>
            <div>{item.commissionRate == null ? "Platform default" : `${item.commissionRate}%`}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard label="Companies" value={stats.totalCompanies} sub={`${stats.activeCompanies} active`} />
        <DashboardStatCard label="Paid" value={stats.paidCompanies} sub={`${stats.trialCompanies} trial`} />
        <DashboardStatCard label="Commission earned" value={money(stats.commissionEarned)} />
        <DashboardStatCard label="Commission paid" value={money(stats.commissionPaid)} sub={`${money(stats.commissionPending)} pending`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign a company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search unassigned companies…"
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchCandidates();
              }}
            />
            <Button variant="outline" onClick={() => void searchCandidates()}>
              Search
            </Button>
          </div>
          {candidates.length > 0 && (
            <div className="rounded-md border divide-y">
              {candidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {c.name ?? "—"} <span className="text-muted-foreground">({c.email ?? "—"})</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => void assign(c.id)}>
                    <Plus className="mr-1 h-4 w-4" /> Assign
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referred companies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Referred</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No companies yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name ?? "—"}
                      <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>{c.activePlan != null ? "Paid" : "—"}</TableCell>
                    <TableCell>{c.referredAt ? new Date(c.referredAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => void unassign(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No commissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <code className="text-xs">{c.orderRef ?? "—"}</code>
                    </TableCell>
                    <TableCell>{money(c.amount)}</TableCell>
                    <TableCell>{c.commissionRate}%</TableCell>
                    <TableCell>{money(c.commissionAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
