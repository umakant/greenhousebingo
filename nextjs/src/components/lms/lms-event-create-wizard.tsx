"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LMS_EVENT_DELIVERY_MODES,
  LMS_EVENT_STATUS_LABELS,
  LMS_EVENT_TYPES,
  LMS_EVENT_TYPE_LABELS,
} from "@/lib/lms-events/constants";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import type { LmsEventCategory } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

export const LMS_EVENT_CREATE_FORM_ID = "lms-event-create-form";

const STEPS = ["Details", "Schedule", "Tickets", "Settings", "Review"] as const;

type StepId = (typeof STEPS)[number];

const DEFAULT_VALUES: LmsEventCreateWizardInput = {
  title: "",
  description: "",
  shortDescription: "",
  imageUrl: "",
  categoryId: "",
  eventType: "live_workshop",
  deliveryMode: "in_person",
  instructorName: "",
  isPublic: true,
  certificationAvailable: false,
  certificationName: "",
  requirements: "",
  startsAt: "",
  endsAt: "",
  timezone: "America/New_York",
  venueName: "",
  venueAddress: "",
  venueCity: "",
  venueState: "",
  venuePostalCode: "",
  venueCountry: "US",
  onlineMeetingUrl: "",
  ticketName: "General admission",
  ticketDescription: "",
  price: 0,
  currency: "USD",
  quantity: 50,
  ticketStatus: "available",
  isFree: false,
  capacity: 50,
  cancellationPolicy: "",
  status: "registration_open",
};

function toLocalDatetimeInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-2 border-b pb-4">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            i === current
              ? "bg-primary text-primary-foreground"
              : i < current
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          <span className="tabular-nums">{i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export function LmsEventCreateWizard(props: {
  categories: LmsEventCategory[];
  onSubmit: (values: LmsEventCreateWizardInput) => Promise<void>;
  onSavingChange?: (saving: boolean) => void;
}) {
  const { categories, onSubmit, onSavingChange } = props;
  const [step, setStep] = React.useState(0);
  const [values, setValues] = React.useState<LmsEventCreateWizardInput>(DEFAULT_VALUES);
  const [err, setErr] = React.useState<string | null>(null);

  function patch(partial: Partial<LmsEventCreateWizardInput>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!values.title.trim() || values.title.trim().length < 3) return "Event title is required.";
      if (!values.categoryId) return "Select a category.";
    }
    if (index === 1) {
      if (!values.startsAt) return "Start date/time is required.";
      if (!values.endsAt) return "End date/time is required.";
      if (new Date(values.endsAt) <= new Date(values.startsAt)) return "End must be after start.";
    }
    if (index === 2) {
      if (!values.ticketName.trim()) return "Ticket name is required.";
      if (!values.isFree && values.price < 0) return "Enter a valid price.";
    }
    return null;
  }

  async function handleNext() {
    const message = validateStep(step);
    if (message) {
      setErr(message);
      return;
    }
    setErr(null);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    onSavingChange?.(true);
    setErr(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save event.");
    } finally {
      onSavingChange?.(false);
    }
  }

  function handleBack() {
    setErr(null);
    setStep((s) => Math.max(0, s - 1));
  }

  const categoryName = categories.find((c) => c.id === values.categoryId)?.name ?? "—";

  return (
    <form
      id={LMS_EVENT_CREATE_FORM_ID}
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleNext();
      }}
    >
      <StepIndicator current={step} />

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      {step === 0 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">
              Event title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ev-title"
              value={values.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="CPR & First Aid Certification"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={values.categoryId || undefined} onValueChange={(v) => patch({ categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event type</Label>
              <Select value={values.eventType} onValueChange={(v) => patch({ eventType: v as LmsEventCreateWizardInput["eventType"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LMS_EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LMS_EVENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {LMS_EVENT_DELIVERY_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm transition",
                    values.deliveryMode === mode ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
                  )}
                  onClick={() => patch({ deliveryMode: mode })}
                >
                  <span className="font-medium capitalize">{mode.replace(/_/g, " ")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-short">Short description</Label>
            <Textarea
              id="ev-short"
              rows={2}
              maxLength={150}
              value={values.shortDescription ?? ""}
              onChange={(e) => patch({ shortDescription: e.target.value })}
              placeholder="Brief summary shown on event cards"
            />
            <p className="text-xs text-muted-foreground">{(values.shortDescription ?? "").length}/150</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea
              id="ev-desc"
              rows={4}
              value={values.description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Full event details for registrants"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-instructor">Instructor</Label>
            <Input
              id="ev-instructor"
              value={values.instructorName ?? ""}
              onChange={(e) => patch({ instructorName: e.target.value })}
              placeholder="John Davis"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-image">Event image URL</Label>
            <Input
              id="ev-image"
              value={values.imageUrl ?? ""}
              onChange={(e) => patch({ imageUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ev-start">
                Starts <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={toLocalDatetimeInput(values.startsAt)}
                onChange={(e) =>
                  patch({ startsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end">
                Ends <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={toLocalDatetimeInput(values.endsAt)}
                onChange={(e) =>
                  patch({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-tz">Timezone</Label>
            <Input id="ev-tz" value={values.timezone} onChange={(e) => patch({ timezone: e.target.value })} />
          </div>

          {values.deliveryMode !== "online" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ev-venue">Venue name</Label>
                <Input id="ev-venue" value={values.venueName ?? ""} onChange={(e) => patch({ venueName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-address">Address</Label>
                <Input id="ev-address" value={values.venueAddress ?? ""} onChange={(e) => patch({ venueAddress: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ev-city">City</Label>
                  <Input id="ev-city" value={values.venueCity ?? ""} onChange={(e) => patch({ venueCity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-state">State</Label>
                  <Input id="ev-state" value={values.venueState ?? ""} onChange={(e) => patch({ venueState: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-zip">Postal code</Label>
                  <Input id="ev-zip" value={values.venuePostalCode ?? ""} onChange={(e) => patch({ venuePostalCode: e.target.value })} />
                </div>
              </div>
            </>
          ) : null}

          {values.deliveryMode !== "in_person" ? (
            <div className="space-y-2">
              <Label htmlFor="ev-meeting">Online meeting URL</Label>
              <Input
                id="ev-meeting"
                value={values.onlineMeetingUrl ?? ""}
                onChange={(e) => patch({ onlineMeetingUrl: e.target.value })}
                placeholder="https://meet.example.com/…"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-ticket-name">
              Ticket name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ev-ticket-name"
              value={values.ticketName}
              onChange={(e) => patch({ ticketName: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ev-free"
              checked={values.isFree}
              onCheckedChange={(v) => patch({ isFree: v === true, price: v === true ? 0 : values.price })}
            />
            <Label htmlFor="ev-free" className="font-normal">
              Free event
            </Label>
          </div>
          {!values.isFree ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ev-price">Price (USD)</Label>
                <Input
                  id="ev-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.price}
                  onChange={(e) => patch({ price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-qty">Quantity</Label>
                <Input
                  id="ev-qty"
                  type="number"
                  min={1}
                  value={values.quantity ?? ""}
                  onChange={(e) => patch({ quantity: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ev-qty-free">Capacity</Label>
              <Input
                id="ev-qty-free"
                type="number"
                min={1}
                value={values.quantity ?? ""}
                onChange={(e) => patch({ quantity: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ev-ticket-desc">Ticket description</Label>
            <Textarea
              id="ev-ticket-desc"
              rows={2}
              value={values.ticketDescription ?? ""}
              onChange={(e) => patch({ ticketDescription: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-capacity">Event capacity</Label>
            <Input
              id="ev-capacity"
              type="number"
              min={1}
              value={values.capacity ?? ""}
              onChange={(e) => patch({ capacity: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ev-public"
              checked={values.isPublic}
              onCheckedChange={(v) => patch({ isPublic: v === true })}
            />
            <Label htmlFor="ev-public" className="font-normal">
              Public listing (visible in catalog)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ev-cert"
              checked={values.certificationAvailable}
              onCheckedChange={(v) => patch({ certificationAvailable: v === true })}
            />
            <Label htmlFor="ev-cert" className="font-normal">
              Certification available
            </Label>
          </div>
          {values.certificationAvailable ? (
            <div className="space-y-2">
              <Label htmlFor="ev-cert-name">Certification name</Label>
              <Input
                id="ev-cert-name"
                value={values.certificationName ?? ""}
                onChange={(e) => patch({ certificationName: e.target.value })}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ev-cancel">Cancellation policy</Label>
            <Textarea
              id="ev-cancel"
              rows={3}
              value={values.cancellationPolicy ?? ""}
              onChange={(e) => patch({ cancellationPolicy: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-req">Requirements</Label>
            <Textarea
              id="ev-req"
              rows={2}
              value={values.requirements ?? ""}
              onChange={(e) => patch({ requirements: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="space-y-2">
            <Label>Publish status</Label>
            <Select value={values.status} onValueChange={(v) => patch({ status: v as LmsEventCreateWizardInput["status"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["draft", "published", "registration_open"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {LMS_EVENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <dl className="grid gap-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Title</dt>
              <dd className="text-right font-medium">{values.title || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="text-right">{categoryName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Format</dt>
              <dd className="text-right capitalize">{values.deliveryMode.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="text-right">
                {values.startsAt ? new Date(values.startsAt).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Ticket</dt>
              <dd className="text-right">
                {values.ticketName} · {values.isFree ? "Free" : `$${values.price.toFixed(2)}`}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="outline" onClick={handleBack} disabled={step === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button type="submit">
          {step === STEPS.length - 1 ? (
            "Create event"
          ) : (
            <>
              Next: {STEPS[step + 1] as StepId}
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function LmsEventCreateWizardSavingOverlay({ saving }: { saving: boolean }) {
  if (!saving) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
