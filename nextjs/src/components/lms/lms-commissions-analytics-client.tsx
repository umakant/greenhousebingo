"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Summary = {
  totalGrossRevenue: number;
  revenueRecordCount: number;
  commissionsByStatus: { status: string; total: number; count: number }[];
  topCourses: { courseId: string; courseTitle: string; grossRevenue: number; recordCount: number }[];
  topInstructorBalances: {
    instructorProfileId: string;
    displayName: string | null;
    defaultPercent: number;
    unpaidCommission: number;
    accrualCount: number;
  }[];
};

type InstructorRow = {
  id: string;
  displayName: string | null;
  commissionPercent: string;
  user: { name: string | null } | null;
};

type PayoutRow = {
  id: string;
  instructorName: string;
  totalAmount: string;
  status: string;
  commissionCount: number;
};

export function LmsCommissionsAnalyticsClient({ embedded = false }: { embedded?: boolean }) {
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [instructors, setInstructors] = React.useState<InstructorRow[]>([]);
  const [payouts, setPayouts] = React.useState<PayoutRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [payoutProfileId, setPayoutProfileId] = React.useState("");
  const [creatingPayout, setCreatingPayout] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, iRes, pRes] = await Promise.all([
        fetch("/api/lms/commissions/summary", { credentials: "include", cache: "no-store" }),
        fetch("/api/lms/instructor-profiles", { credentials: "include", cache: "no-store" }),
        fetch("/api/lms/commissions/payouts", { credentials: "include", cache: "no-store" }),
      ]);
      const sJson = (await sRes.json()) as { ok?: boolean; summary?: Summary; message?: string };
      const iJson = (await iRes.json()) as { ok?: boolean; items?: InstructorRow[] };
      const pJson = (await pRes.json()) as { ok?: boolean; items?: PayoutRow[] };
      if (!sRes.ok || !sJson.ok || !sJson.summary) throw new Error(sJson.message ?? "Failed to load");
      setSummary(sJson.summary);
      setInstructors(iJson.items ?? []);
      setPayouts(pJson.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function saveInstructorPercent(profileId: string, value: string) {
    const pct = Number(value);
    if (!Number.isFinite(pct)) return;
    const res = await fetch(`/api/lms/instructor-profiles/${profileId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionPercent: pct }),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      toast.error(data.message ?? "Update failed");
      return;
    }
    toast.success("Commission % updated");
    await reload();
  }

  async function createPayout() {
    if (!payoutProfileId) {
      toast.error("Select an instructor");
      return;
    }
    setCreatingPayout(true);
    try {
      const res = await fetch("/api/lms/commissions/payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructorProfileId: payoutProfileId }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      toast.success("Draft payout created");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payout failed");
    } finally {
      setCreatingPayout(false);
    }
  }

  async function markPayout(payoutId: string, status: "SCHEDULED" | "PAID") {
    const res = await fetch(`/api/lms/commissions/payouts?payoutId=${payoutId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      toast.error(data.message ?? "Update failed");
      return;
    }
    toast.success(`Payout marked ${status.toLowerCase()}`);
    await reload();
  }

  if (loading) {
    return (
      <div className={embedded ? "flex justify-center py-8" : "flex justify-center py-12"}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Course gross revenue</CardDescription>
            <CardTitle className="text-2xl">{fmt(summary?.totalGrossRevenue ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.revenueRecordCount ?? 0} attributed records
          </CardContent>
        </Card>
        {(summary?.commissionsByStatus ?? []).map((c) => (
          <Card key={c.status}>
            <CardHeader className="pb-2">
              <CardDescription>Commission · {c.status}</CardDescription>
              <CardTitle className="text-2xl">{fmt(c.total)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{c.count} accruals</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by course</CardTitle>
          <CardDescription>Gross attributed from paid storefront orders (and subscription lines).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summary?.topCourses ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No revenue recorded yet. Commissions accrue when paid orders provision LMS seats and courses have
                    instructors with a commission %.
                  </TableCell>
                </TableRow>
              ) : (
                summary!.topCourses.map((c) => (
                  <TableRow key={c.courseId}>
                    <TableCell>{c.courseTitle}</TableCell>
                    <TableCell className="text-right">{fmt(c.grossRevenue)}</TableCell>
                    <TableCell className="text-right">{c.recordCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructor commission rates</CardTitle>
          <CardDescription>Default % per instructor; override on each course assignment in the course editor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {instructors.map((inst) => (
            <div key={inst.id} className="flex flex-wrap items-center gap-3">
              <span className="min-w-[140px] text-sm font-medium">
                {inst.displayName ?? inst.user?.name ?? "Instructor"}
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  className="w-24"
                  defaultValue={inst.commissionPercent}
                  onBlur={(e) => void saveInstructorPercent(inst.id, e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payouts (placeholder)</CardTitle>
          <CardDescription>
            Draft payouts group accrued commissions. Mark scheduled/paid to sync a summary expense in Accounting.
            No payment processor is connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label>Instructor</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={payoutProfileId}
                onChange={(e) => setPayoutProfileId(e.target.value)}
              >
                <option value="">Select…</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.displayName ?? i.user?.name ?? i.id}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" disabled={creatingPayout} onClick={() => void createPayout()}>
              {creatingPayout ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create draft payout
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instructor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No payouts yet.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.instructorName}</TableCell>
                    <TableCell className="text-right">{fmt(Number(p.totalAmount))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {p.status === "DRAFT" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => void markPayout(p.id, "SCHEDULED")}>
                          Schedule
                        </Button>
                      ) : null}
                      {p.status === "DRAFT" || p.status === "SCHEDULED" ? (
                        <Button type="button" size="sm" onClick={() => void markPayout(p.id, "PAID")}>
                          Mark paid
                        </Button>
                      ) : null}
                    </TableCell>
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
