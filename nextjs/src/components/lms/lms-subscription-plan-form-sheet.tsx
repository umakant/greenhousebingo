"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type LmsSubscriptionPlanSheetMode = "create" | "edit";

export type LmsSubscriptionPlanCourseOption = { id: string; title: string };

export type LmsSubscriptionPlanFormPlan = {
  id: string;
  name: string;
  description: string | null;
  status: boolean;
  freePlan: boolean;
  packagePriceMonthly: string;
  packagePriceYearly: string;
  trial: boolean;
  trialDays: number;
  courseIds: string[];
};

type PlanFormState = {
  name: string;
  description: string;
  status: boolean;
  freePlan: boolean;
  packagePriceMonthly: string;
  packagePriceYearly: string;
  trial: boolean;
  trialDays: string;
  courseIds: string[];
};

const emptyForm: PlanFormState = {
  name: "",
  description: "",
  status: true,
  freePlan: false,
  packagePriceMonthly: "0",
  packagePriceYearly: "0",
  trial: false,
  trialDays: "0",
  courseIds: [],
};

function planToForm(plan: LmsSubscriptionPlanFormPlan): PlanFormState {
  return {
    name: plan.name,
    description: plan.description ?? "",
    status: plan.status,
    freePlan: plan.freePlan,
    packagePriceMonthly: plan.packagePriceMonthly,
    packagePriceYearly: plan.packagePriceYearly,
    trial: plan.trial,
    trialDays: String(plan.trialDays),
    courseIds: [...plan.courseIds],
  };
}

type LmsSubscriptionPlanFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LmsSubscriptionPlanSheetMode;
  plan?: LmsSubscriptionPlanFormPlan | null;
  courses: LmsSubscriptionPlanCourseOption[];
  onSaved: () => void;
};

export function LmsSubscriptionPlanFormSheet({
  open,
  onOpenChange,
  mode: initialMode,
  plan: initialPlan,
  courses,
  onSaved,
}: LmsSubscriptionPlanFormSheetProps) {
  const [mode, setMode] = React.useState<LmsSubscriptionPlanSheetMode>(initialMode);
  const [planId, setPlanId] = React.useState<string | undefined>();
  const [form, setForm] = React.useState<PlanFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSaving(false);
    if (initialMode === "edit" && initialPlan) {
      setPlanId(initialPlan.id);
      setForm(planToForm(initialPlan));
      return;
    }
    setPlanId(undefined);
    setForm(emptyForm);
  }, [open, initialMode, initialPlan]);

  const title =
    mode === "create"
      ? "New subscription plan"
      : form.name.trim()
        ? `Edit subscription plan — ${form.name.trim().slice(0, 48)}`
        : "Edit subscription plan";

  function toggleCourse(courseId: string) {
    setForm((f) => {
      const has = f.courseIds.includes(courseId);
      return {
        ...f,
        courseIds: has ? f.courseIds.filter((id) => id !== courseId) : [...f.courseIds, courseId],
      };
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (form.courseIds.length === 0) {
      toast.error("Select at least one course for the bundle");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        freePlan: form.freePlan,
        packagePriceMonthly: Number(form.packagePriceMonthly) || 0,
        packagePriceYearly: Number(form.packagePriceYearly) || 0,
        trial: form.trial,
        trialDays: Number(form.trialDays) || 0,
        courseIds: form.courseIds,
      };
      const isEdit = mode === "edit" && planId;
      const url = isEdit ? `/api/lms/subscription-plans/${planId}` : "/api/lms/subscription-plans";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; plan?: { id: string }; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
      toast.success(isEdit ? "Plan updated" : "Plan created");
      onSaved();
      if (mode === "create" && data.plan?.id) {
        setMode("edit");
        setPlanId(data.plan.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Learners with an active subscription get enrollments for all bundled courses until the period ends.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-4 px-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea
                id="plan-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="price-mo">Monthly price</Label>
                <Input
                  id="price-mo"
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={form.freePlan}
                  value={form.packagePriceMonthly}
                  onChange={(e) => setForm((f) => ({ ...f, packagePriceMonthly: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price-yr">Yearly price</Label>
                <Input
                  id="price-yr"
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={form.freePlan}
                  value={form.packagePriceYearly}
                  onChange={(e) => setForm((f) => ({ ...f, packagePriceYearly: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.status} onCheckedChange={(v) => setForm((f) => ({ ...f, status: v }))} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.freePlan} onCheckedChange={(v) => setForm((f) => ({ ...f, freePlan: v }))} />
                <Label>Free plan</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.trial} onCheckedChange={(v) => setForm((f) => ({ ...f, trial: v }))} />
                <Label>Trial</Label>
              </div>
            </div>
            {form.trial ? (
              <div className="grid gap-2">
                <Label htmlFor="trial-days">Trial days</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min={0}
                  value={form.trialDays}
                  onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label>Bundled courses</Label>
              <ScrollArea className="h-48 rounded-md border p-3">
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No courses available.</p>
                ) : (
                  <div className="space-y-2">
                    {courses.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.courseIds.includes(c.id)}
                          onCheckedChange={() => toggleCourse(c.id)}
                        />
                        {c.title}
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : mode === "create" ? (
              "Create plan"
            ) : (
              "Save changes"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
