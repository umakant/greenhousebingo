"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EnrollmentRow = {
  id: string;
  status: string;
  purchaseKind: string | null;
  storefrontOrderId: string | null;
  crmCustomerId: string | null;
  enrolledAt: string;
  student: { id: string; name: string | null; email: string | null };
  storefrontOrder: { id: string; orderNumber: string; status: string } | null;
  crmCustomer: { id: string; companyName: string; contactPersonEmail: string } | null;
};

type UserOption = { id: string; name: string | null; email: string | null; label: string };
type CrmOption = {
  id: string;
  userId: string | null;
  companyName: string;
  contactPersonEmail: string;
  label: string;
};

type RosterProgressRow = {
  enrollmentId: string;
  studentUserId: string;
  progress: {
    coursePercent: number;
    completedLessonCount: number;
    publishedLessonCount: number;
    isCourseComplete: boolean;
  } | null;
};

const STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED", "SUSPENDED"] as const;

export function LmsCourseEnrollmentsPanel(props: { courseId: string; embedded?: boolean }) {
  const { courseId, embedded = false } = props;
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<EnrollmentRow[]>([]);
  const [studentUserId, setStudentUserId] = React.useState("");
  const [crmCustomerId, setCrmCustomerId] = React.useState("");
  const [storefrontOrderId, setStorefrontOrderId] = React.useState("");
  const [purchaseKind, setPurchaseKind] = React.useState<"AUTO" | "MANUAL" | "COMPED">("AUTO");
  const [submitting, setSubmitting] = React.useState(false);
  const [optionSearch, setOptionSearch] = React.useState("");
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [crmCustomers, setCrmCustomers] = React.useState<CrmOption[]>([]);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [progressByEnrollment, setProgressByEnrollment] = React.useState<Map<string, RosterProgressRow["progress"]>>(
    new Map(),
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [enrRes, progRes] = await Promise.all([
        fetch(`/api/lms/courses/${courseId}/enrollments`, { credentials: "include" }),
        fetch(`/api/lms/courses/${courseId}/enrollments/progress`, { credentials: "include" }),
      ]);
      const data = (await enrRes.json().catch(() => null)) as { ok?: boolean; items?: EnrollmentRow[] } | null;
      const progData = (await progRes.json().catch(() => null)) as { ok?: boolean; items?: RosterProgressRow[] } | null;

      if (!enrRes.ok || !data?.ok || !Array.isArray(data.items)) {
        toast.error(typeof (data as { message?: string })?.message === "string" ? (data as { message: string }).message : "Failed to load enrollments");
        setItems([]);
        setProgressByEnrollment(new Map());
        return;
      }
      setItems(data.items);

      const progMap = new Map<string, RosterProgressRow["progress"]>();
      if (progRes.ok && progData?.ok && Array.isArray(progData.items)) {
        for (const row of progData.items) {
          progMap.set(row.enrollmentId, row.progress);
        }
      }
      setProgressByEnrollment(progMap);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        setOptionsLoading(true);
        try {
          const params = new URLSearchParams();
          if (optionSearch.trim()) params.set("search", optionSearch.trim());
          const res = await fetch(`/api/lms/enrollment-options?${params.toString()}`, { credentials: "include" });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            users?: UserOption[];
            crmCustomers?: CrmOption[];
          } | null;
          if (res.ok && data?.ok) {
            setUsers(Array.isArray(data.users) ? data.users : []);
            setCrmCustomers(Array.isArray(data.crmCustomers) ? data.crmCustomers : []);
          }
        } finally {
          setOptionsLoading(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(t);
  }, [optionSearch]);

  function onCrmSelect(id: string) {
    setCrmCustomerId(id === "__none__" ? "" : id);
    const row = crmCustomers.find((c) => c.id === id);
    if (row?.userId) setStudentUserId(row.userId);
  }

  async function submitEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!studentUserId.trim()) {
      toast.error("Select a learner");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { studentUserId: studentUserId.trim() };
      const oid = storefrontOrderId.trim();
      if (oid) body.storefrontOrderId = oid;
      if (crmCustomerId.trim()) body.crmCustomerId = crmCustomerId.trim();
      if (purchaseKind !== "AUTO") body.purchaseKind = purchaseKind;

      const res = await fetch(`/api/lms/courses/${courseId}/enrollments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Enrollment failed");
        return;
      }
      toast.success("Learner enrolled");
      setStudentUserId("");
      setCrmCustomerId("");
      setStorefrontOrderId("");
      setPurchaseKind("AUTO");
      setOptionSearch("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function patchStatus(id: string, status: string) {
    const res = await fetch(`/api/lms/courses/${courseId}/enrollments/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Update failed");
      return;
    }
    toast.success("Status updated");
    await load();
  }

  return (
    <EnrollmentsPanelShell embedded={embedded}>
      <form onSubmit={(ev) => void submitEnroll(ev)} className="space-y-4 rounded-md border border-border/60 p-4">
          <div className="space-y-2">
            <Label htmlFor="enr-search">Search learner or CRM contact</Label>
            <Input
              id="enr-search"
              value={optionSearch}
              onChange={(e) => setOptionSearch(e.target.value)}
              placeholder="Name, email, or company…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Learner</Label>
              <Select value={studentUserId || "__none__"} onValueChange={(v) => setStudentUserId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={optionsLoading ? "Loading…" : "Select learner"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select learner…</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CRM contact (optional)</Label>
              <Select value={crmCustomerId || "__none__"} onValueChange={onCrmSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Link CRM contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {crmCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enr-order">Paid storefront order id (if required)</Label>
              <Input
                id="enr-order"
                value={storefrontOrderId}
                onChange={(e) => setStorefrontOrderId(e.target.value)}
                placeholder="Optional — auto-filled after checkout for linked products"
              />
            </div>
            <div className="space-y-2">
              <Label>List-price course (no POS link)</Label>
              <Select value={purchaseKind} onValueChange={(v) => setPurchaseKind(v as typeof purchaseKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Default (free / paid order)</SelectItem>
                  <SelectItem value="MANUAL">MANUAL — paid outside storefront</SelectItem>
                  <SelectItem value="COMPED">COMPED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrolling…
              </>
            ) : (
              "Add enrollment"
            )}
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <LearnerTableCell row={r} />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <EnrollmentProgressCell progress={progressByEnrollment.get(r.id) ?? null} />
                    </TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => void patchStatus(r.id, v)}>
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">{r.purchaseKind ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.storefrontOrder ? (
                        <span>
                          {r.storefrontOrder.orderNumber}
                          <span className="text-muted-foreground"> ({r.storefrontOrder.status})</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.crmCustomer ? (
                        <span className="line-clamp-2" title={r.crmCustomer.contactPersonEmail}>
                          {r.crmCustomer.companyName}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.enrolledAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
    </EnrollmentsPanelShell>
  );
}

function EnrollmentsPanelShell(props: { embedded?: boolean; children: React.ReactNode }) {
  const { embedded, children } = props;
  if (embedded) {
    return <div className="space-y-6">{children}</div>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollments</CardTitle>
        <CardDescription>
          Track learner status, CRM contact, and paid storefront orders. Paid courses require a paid order id; free
          courses enroll without an order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

function LearnerTableCell({ row }: { row: EnrollmentRow }) {
  return (
    <>
      <div className="text-sm font-medium">{row.student.name ?? "—"}</div>
      <div className="text-xs text-muted-foreground">{row.student.email ?? row.student.id}</div>
    </>
  );
}

function EnrollmentProgressCell({ progress }: { progress: RosterProgressRow["progress"] }) {
  if (!progress || progress.publishedLessonCount === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <MotionSafeEnrollmentProgress progress={progress} />
  );
}

function MotionSafeEnrollmentProgress({ progress }: { progress: NonNullable<RosterProgressRow["progress"]> }) {
  return (
    <div className="space-y-1">
      <div className="text-xs">
        <span className="font-medium">{progress.coursePercent}%</span>
        <span className="text-muted-foreground">
          {" "}
          · {progress.completedLessonCount}/{progress.publishedLessonCount}
          {progress.isCourseComplete ? " · complete" : ""}
        </span>
      </div>
      <Progress className="h-1.5" value={progress.coursePercent} />
    </div>
  );
}
