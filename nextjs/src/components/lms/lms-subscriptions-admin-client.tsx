"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  LmsSubscriptionPlanFormSheet,
  type LmsSubscriptionPlanFormPlan,
  type LmsSubscriptionPlanSheetMode,
} from "@/components/lms/lms-subscription-plan-form-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PlanCourse = { courseId: string; title: string; slug: string };
type Plan = {
  id: string;
  name: string;
  description: string | null;
  status: boolean;
  freePlan: boolean;
  packagePriceMonthly: string;
  packagePriceYearly: string;
  trial: boolean;
  trialDays: number;
  courseCount: number;
  courses: PlanCourse[];
  activeSubscriberCount?: number;
};

type CourseOption = { id: string; title: string };

function planToSheetPlan(plan: Plan): LmsSubscriptionPlanFormPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    status: plan.status,
    freePlan: plan.freePlan,
    packagePriceMonthly: plan.packagePriceMonthly,
    packagePriceYearly: plan.packagePriceYearly,
    trial: plan.trial,
    trialDays: plan.trialDays,
    courseIds: plan.courses.map((c) => c.courseId),
  };
}

export function LmsSubscriptionsAdminClient() {
  const [plans, setPlans] = React.useState<Plan[] | null>(null);
  const [courses, setCourses] = React.useState<CourseOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<LmsSubscriptionPlanSheetMode>("create");
  const [sheetPlan, setSheetPlan] = React.useState<LmsSubscriptionPlanFormPlan | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/lms/subscription-plans", { credentials: "include", cache: "no-store" }),
        fetch("/api/lms/courses", { credentials: "include", cache: "no-store" }),
      ]);
      const pJson = (await pRes.json()) as { ok?: boolean; items?: Plan[]; message?: string };
      const cJson = (await cRes.json()) as {
        ok?: boolean;
        items?: { id: string; title: string }[];
      };
      if (!pRes.ok || !pJson.ok) throw new Error(pJson.message ?? "Failed to load plans");
      setPlans(pJson.items ?? []);
      if (cRes.ok && cJson.ok && Array.isArray(cJson.items)) {
        setCourses(cJson.items.map((c) => ({ id: c.id, title: c.title })));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const openCreate = React.useCallback(() => {
    setSheetMode("create");
    setSheetPlan(null);
    setSheetOpen(true);
  }, []);

  const openEdit = React.useCallback((plan: Plan) => {
    setSheetMode("edit");
    setSheetPlan(planToSheetPlan(plan));
    setSheetOpen(true);
  }, []);

  async function handleDelete(planId: string) {
    if (!confirm("Delete this subscription plan? Active learner subscriptions will remain until they expire.")) {
      return;
    }
    const res = await fetch(`/api/lms/subscription-plans/${planId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) {
      toast.error(data.message ?? "Delete failed");
      return;
    }
    toast.success("Plan deleted");
    await reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Monthly or yearly bundles that grant learners access to multiple courses. Pricing mirrors SaaS
          subscription plans; link a POS product for storefront checkout.
        </p>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !plans?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No subscription plans yet</CardTitle>
            <CardDescription>
              Create a bundle with monthly pricing and attach courses learners unlock while subscribed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    className="text-left text-lg font-semibold text-primary hover:underline"
                  >
                    {plan.name}
                  </button>
                  <Badge variant={plan.status ? "default" : "secondary"}>
                    {plan.status ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {plan.description ? (
                  <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Monthly:</span>{" "}
                  {plan.freePlan ? "Free" : `$${plan.packagePriceMonthly}`}
                  {" · "}
                  <span className="text-muted-foreground">Yearly:</span>{" "}
                  {plan.freePlan ? "Free" : `$${plan.packagePriceYearly}`}
                </p>
                <p className="text-muted-foreground">
                  {plan.courseCount} course{plan.courseCount === 1 ? "" : "s"} in bundle
                  {plan.activeSubscriberCount != null
                    ? ` · ${plan.activeSubscriberCount} active subscriber${plan.activeSubscriberCount === 1 ? "" : "s"}`
                    : ""}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(plan)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void handleDelete(plan.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LmsSubscriptionPlanFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        plan={sheetPlan}
        courses={courses}
        onSaved={() => void reload()}
      />
    </div>
  );
}
