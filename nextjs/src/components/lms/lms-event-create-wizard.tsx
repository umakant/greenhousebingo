"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import {
  LmsEventFaqFields,
  LmsEventGamesFields,
  LmsEventHostSponsorFields,
  LmsEventPublicPageFields,
} from "@/components/lms/lms-event-page-sections";
import { LmsEventReviewStep } from "@/components/lms/lms-event-review-step";
import MediaPicker from "@/components/MediaPicker";
import {
  collectCompletedWizardSteps,
  markWizardStepComplete,
  WizardStepIndicator,
} from "@/components/ui/wizard-step-indicator";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { useEventFormOptions } from "@/hooks/use-event-form-options";
import {
  LMS_EVENT_DEFAULT_DELIVERY_MODE,
  LMS_EVENT_IN_PERSON_ONLY,
  LMS_EVENT_STATUSES,
} from "@/lib/lms-events/constants";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import { DEFAULT_HERO_TAGLINE, DEFAULT_BINGO_ROUNDS } from "@/lib/lms-events/event-detail-content";
import type { LmsEventCategory } from "@/lib/lms-events/types";
import type { EventVenueDto } from "@/lib/event-platform/venues/venue-types";
import type { FeaturedEventsStats } from "@/lib/event-platform/featured-events-types";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import {
  applyEventDateToSchedule,
  combineScheduleDateTime,
  defaultScheduleTimes,
  eventDateFromIso,
  normalizeEventScheduleInput,
  patchScheduleIso,
  scheduleValueToIso,
  splitScheduleIso,
} from "@/lib/lms-events/event-schedule-helpers";
import { cn } from "@/lib/utils";

export const LMS_EVENT_CREATE_FORM_ID = "lms-event-create-form";

const STEPS = [
  "Details",
  "Schedule",
  "Public page",
  "Host & sponsor",
  "Tickets",
  "Bingo games",
  "FAQs",
  "Settings",
  "Review",
] as const;

type StepId = (typeof STEPS)[number];

const DEFAULT_VALUES: LmsEventCreateWizardInput = {
  title: "",
  description: "",
  shortDescription: "",
  imageUrl: "",
  categoryId: "",
  eventType: "live_workshop",
  deliveryMode: LMS_EVENT_DEFAULT_DELIVERY_MODE,
  instructorName: "",
  instructorUserId: "",
  isPublic: true,
  certificationAvailable: false,
  certificationName: "",
  requirements: "",
  eventDate: "",
  startsAt: "",
  endsAt: "",
  timezone: "America/New_York",
  venueName: "",
  venueAddress: "",
  venueCity: "",
  venueState: "",
  venuePostalCode: "",
  venueCountry: "US",
  venueLat: null,
  venueLng: null,
  onlineMeetingUrl: "",
  isFeatured: false,
  ageRule: "21+",
  doorsOpen: "",
  bingoStart: "",
  venueType: "Brewery",
  venueAge21Plus: false,
  venueDrinksAlcohol: false,
  venueFood: false,
  cardsIncluded: 2,
  extraCardPrice: 5,
  bonusCardsAllowed: true,
  bonusCardName: "Bonus card",
  foodAndDrinks: "",
  attire: "Casual",
  regionTag: "",
  heroTagline: DEFAULT_HERO_TAGLINE,
  descriptionTitle: "",
  bingoEnd: "",
  venuePhone: "",
  agePolicyText: "",
  cardFeePercent: 3.5,
  soldOut: false,
  hostName: "",
  hostBio: "",
  hostImageUrl: "",
  hostIds: [],
  hosts: [],
  sponsorName: "",
  sponsorAddress: "",
  sponsorPhone: "",
  sponsorPerk: "",
  sponsorIds: [],
  sponsors: [],
  whatsIncludedText: "",
  checkInStepsText: "",
  bingoRounds: [...DEFAULT_BINGO_ROUNDS],
  bingoGameIds: [],
  faqIds: [],
  faqs: [],
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

function ScheduleTimeField(props: {
  id: string;
  label: string;
  required?: boolean;
  eventDate: string;
  iso: string;
  onChange: (iso: string) => void;
}) {
  const { id, label, required, eventDate, iso, onChange } = props;
  const effectiveIso =
    iso.includes("T") || !iso.trim() ? iso : scheduleValueToIso(iso, eventDate, iso);
  const { time } = splitScheduleIso(effectiveIso);
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-time`}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <TimeInput12h
        id={`${id}-time`}
        value={time}
        onChange={(nextTime) => {
          const baseDate = eventDate || splitScheduleIso(effectiveIso).date;
          onChange(
            patchScheduleIso(effectiveIso || combineScheduleDateTime(baseDate, "00:00"), {
              date: baseDate,
              time: nextTime,
            }),
          );
        }}
        aria-label={label}
      />
    </div>
  );
}

function venueLocationLabel(v: EventVenueDto): string {
  return [v.city, v.state].filter(Boolean).join(", ");
}

function applyVenueToEventForm(venue: EventVenueDto): Partial<LmsEventCreateWizardInput> {
  const address = [venue.address, venue.address2].filter(Boolean).join(", ");
  return {
    title: venue.name,
    venueName: venue.name,
    venueAddress: address,
    venueCity: venue.city ?? "",
    venueState: venue.state ?? "",
    venuePostalCode: venue.zip ?? "",
    venueCountry: "US",
    venueLat: venue.latitude ? Number(venue.latitude) : null,
    venueLng: venue.longitude ? Number(venue.longitude) : null,
    venuePhone: venue.phone ?? venue.contactPhone ?? "",
    venueType: venue.venueType ?? undefined,
    venueAge21Plus: venue.age21Plus,
    venueDrinksAlcohol: venue.drinksAlcohol,
    venueFood: venue.food,
    ageRule: venue.age21Plus ? "21+" : "All ages",
    ...(venue.seating != null && venue.seating > 0 ? { capacity: venue.seating, quantity: venue.seating } : {}),
  };
}

function applyVenueLocationToForm(venue: EventVenueDto): Partial<LmsEventCreateWizardInput> {
  const address = [venue.address, venue.address2].filter(Boolean).join(", ");
  return {
    title: venue.name,
    venueName: venue.name,
    venueAddress: address,
    venueCity: venue.city ?? "",
    venueState: venue.state ?? "",
    venuePostalCode: venue.zip ?? "",
    venueCountry: "US",
    venueLat: venue.latitude ? Number(venue.latitude) : null,
    venueLng: venue.longitude ? Number(venue.longitude) : null,
    venuePhone: venue.phone ?? venue.contactPhone ?? "",
  };
}

export function LmsEventCreateWizard(props: {
  mode?: "create" | "edit";
  editingEventId?: string;
  categories: LmsEventCategory[];
  initialValues?: LmsEventCreateWizardInput;
  onSubmit: (values: LmsEventCreateWizardInput) => Promise<void>;
  onSavingChange?: (saving: boolean) => void;
}) {
  const { mode = "create", editingEventId, categories, initialValues, onSubmit, onSavingChange } = props;
  const appSettings = useAppSettingsOptional();
  const googleMapsApiKey =
    (appSettings?.settings?.googleMapsApiKey ?? "").trim() || undefined;
  const formOptions = useEventFormOptions();
  const [step, setStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(() => new Set());
  const [values, setValues] = React.useState<LmsEventCreateWizardInput>(
    initialValues ? { ...DEFAULT_VALUES, ...initialValues } : DEFAULT_VALUES,
  );
  const [err, setErr] = React.useState<string | null>(null);
  const [venues, setVenues] = React.useState<EventVenueDto[]>([]);
  const [venuesLoading, setVenuesLoading] = React.useState(false);
  const [selectedVenueId, setSelectedVenueId] = React.useState("");
  const [eventImageOverridden, setEventImageOverridden] = React.useState(false);
  const [featuredStats, setFeaturedStats] = React.useState<FeaturedEventsStats | null>(null);

  const reloadFeaturedStats = React.useCallback(async () => {
    const qs = editingEventId ? `?excludeEventId=${encodeURIComponent(editingEventId)}` : "";
    const res = await fetch(`/api/lms/admin/featured-events/stats${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; stats?: FeaturedEventsStats } | null;
    if (res.ok && data?.ok && data.stats) setFeaturedStats(data.stats);
  }, [editingEventId]);

  React.useEffect(() => {
    void reloadFeaturedStats();
  }, [reloadFeaturedStats]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setVenuesLoading(true);
      try {
        const res = await fetch("/api/lms/admin/venues", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: EventVenueDto[] } | null;
        if (!cancelled && res.ok && data?.ok && Array.isArray(data.items)) {
          setVenues(data.items);
        }
      } finally {
        if (!cancelled) setVenuesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!initialValues?.venueName || venues.length === 0) return;
    const match = venues.find((v) => v.name.trim().toLowerCase() === initialValues.venueName?.trim().toLowerCase());
    if (!match) return;
    setSelectedVenueId(match.id);
    const venueImg = match.imageUrl?.trim() || "";
    const eventImg = initialValues.imageUrl?.trim() || "";
    setEventImageOverridden(Boolean(eventImg && eventImg !== venueImg));
  }, [initialValues?.venueName, initialValues?.imageUrl, venues]);

  const selectedVenue = React.useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? null,
    [venues, selectedVenueId],
  );

  React.useEffect(() => {
    if (!selectedVenueId) return;
    const venue = venues.find((v) => v.id === selectedVenueId);
    if (!venue) return;
    setValues((prev) => ({ ...prev, ...applyVenueLocationToForm(venue) }));
  }, [selectedVenueId, venues]);

  React.useEffect(() => {
    if (selectedVenueId || !values.venueName?.trim() || venues.length === 0) return;
    const match = venues.find((v) => v.name.trim().toLowerCase() === values.venueName?.trim().toLowerCase());
    if (!match) return;
    setSelectedVenueId(match.id);
    setValues((prev) => ({ ...prev, ...applyVenueLocationToForm(match) }));
  }, [values.venueName, venues, selectedVenueId]);

  React.useEffect(() => {
    if (step !== 1 || !selectedVenueId) return;
    const venue = venues.find((v) => v.id === selectedVenueId);
    if (!venue) return;
    setValues((prev) => ({ ...prev, ...applyVenueLocationToForm(venue) }));
  }, [step, selectedVenueId, venues]);

  const syncCompletedSteps = React.useCallback(
    (input: LmsEventCreateWizardInput) => {
      const snapshot = { ...DEFAULT_VALUES, ...input };
      const validate = (index: number): string | null => {
        if (index === 0) {
          if (!snapshot.venueName?.trim()) return "Select a venue.";
          if (!snapshot.categoryId) return "Select a category.";
        }
        if (index === 1) {
          const eventDate = snapshot.eventDate?.trim() || eventDateFromIso(snapshot.startsAt);
          if (!eventDate) return "Event date is required.";
          if (!snapshot.bingoStart && !snapshot.startsAt) return "Bingo start time is required.";
          if (!snapshot.bingoEnd && !snapshot.endsAt) return "Bingo end time is required.";
          const startIso = snapshot.bingoStart || snapshot.startsAt;
          const endIso = snapshot.bingoEnd || snapshot.endsAt;
          if (new Date(endIso) <= new Date(startIso)) return "Bingo end must be after bingo start.";
        }
        if (index === 4) {
          if (!snapshot.ticketName.trim()) return "Bingo card name is required.";
          if (snapshot.price <= 0) return "Enter a ticket price greater than zero.";
        }
        return null;
      };
      setCompletedSteps(collectCompletedWizardSteps(STEPS.length - 1, validate));
    },
    [],
  );

  React.useEffect(() => {
    if (initialValues) {
      const merged = {
        ...DEFAULT_VALUES,
        ...initialValues,
        isFree: false,
        title: initialValues.venueName?.trim() || initialValues.title,
      };
      setValues(merged);
      if (mode === "edit") syncCompletedSteps(merged);
    }
  }, [initialValues, mode, syncCompletedSteps]);

  React.useEffect(() => {
    if (!LMS_EVENT_IN_PERSON_ONLY || values.deliveryMode === LMS_EVENT_DEFAULT_DELIVERY_MODE) return;
    setValues((prev) => ({ ...prev, deliveryMode: LMS_EVENT_DEFAULT_DELIVERY_MODE }));
  }, [values.deliveryMode]);

  function patch(partial: Partial<LmsEventCreateWizardInput>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  const handleVenueSelect = React.useCallback(
    (venueId: string) => {
      setSelectedVenueId(venueId);
      const venue = venues.find((v) => v.id === venueId);
      if (!venue) return;
      const venuePatch = applyVenueToEventForm(venue);
      const venueImage = venue.imageUrl?.trim() || "";
      if (!eventImageOverridden && venueImage) {
        venuePatch.imageUrl = venueImage;
      }
      patch(venuePatch);
    },
    [venues, eventImageOverridden],
  );

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!values.venueName?.trim()) return "Select a venue.";
      if (!values.categoryId) return "Select a category.";
    }
    if (index === 1) {
      const eventDate = values.eventDate?.trim() || eventDateFromIso(values.startsAt);
      if (!eventDate) return "Event date is required.";
      if (!values.bingoStart && !values.startsAt) return "Bingo start time is required.";
      if (!values.bingoEnd && !values.endsAt) return "Bingo end time is required.";
      const startIso = values.bingoStart || values.startsAt;
      const endIso = values.bingoEnd || values.endsAt;
      if (new Date(endIso) <= new Date(startIso)) return "Bingo end must be after bingo start.";
    }
    if (index === 4) {
      if (!values.ticketName.trim()) return "Bingo card name is required.";
      if (values.price <= 0) return "Enter a ticket price greater than zero.";
    }
    return null;
  }

  function patchEventDate(date: string) {
    if (!date.trim()) {
      patch({ eventDate: "" });
      return;
    }
    const hasSchedule = values.doorsOpen || values.bingoStart || values.bingoEnd;
    if (!hasSchedule) {
      const defaults = defaultScheduleTimes(date);
      patch({
        eventDate: date,
        doorsOpen: defaults.doorsOpen,
        bingoStart: defaults.bingoStart,
        bingoEnd: defaults.bingoEnd,
        startsAt: defaults.bingoStart,
        endsAt: defaults.bingoEnd,
      });
      return;
    }
    const scheduled = applyEventDateToSchedule(date, {
      doorsOpen: values.doorsOpen,
      bingoStart: values.bingoStart,
      bingoEnd: values.bingoEnd,
    });
    patch({
      eventDate: date,
      ...scheduled,
      startsAt: scheduled.bingoStart,
      endsAt: scheduled.bingoEnd,
    });
  }

  async function handleNext() {
    const message = validateStep(step);
    if (message) {
      setErr(message);
      return;
    }
    setErr(null);
    setCompletedSteps((prev) => markWizardStepComplete(prev, step));
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    onSavingChange?.(true);
    setErr(null);
    try {
      const venueTitle = values.venueName?.trim() || values.title.trim();
      const bonusAllowed = values.bonusCardsAllowed !== false;
      await onSubmit(
        normalizeEventScheduleInput({
          ...values,
          title: venueTitle,
          quantity: values.capacity ?? values.quantity,
          extraCardPrice: bonusAllowed ? values.extraCardPrice : null,
          bonusCardsAllowed: bonusAllowed,
          instructorName: "",
          instructorUserId: "",
          isFree: false,
          deliveryMode: LMS_EVENT_IN_PERSON_ONLY ? LMS_EVENT_DEFAULT_DELIVERY_MODE : values.deliveryMode,
        }),
      );
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
      <WizardStepIndicator
        steps={STEPS}
        current={step}
        completedSteps={completedSteps}
        onStepClick={(index) => {
          if (index === step || completedSteps.has(index)) {
            setErr(null);
            setStep(index);
          }
        }}
      />

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      {step === 0 ? (
        <div className="space-y-4">
          {values.deliveryMode !== "online" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Venue <span className="text-destructive">*</span>
                </Label>
                <a
                  href={EVENT_PLATFORM_PATHS.venues}
                  className="text-xs text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Manage venues
                </a>
              </div>
              <Select value={selectedVenueId || undefined} onValueChange={handleVenueSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={venuesLoading ? "Loading venues…" : "Select a venue"} />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                      {venueLocationLabel(venue) ? ` — ${venueLocationLabel(venue)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The event is named after the venue. Selecting a venue auto-fills type, location, amenities, and image.
              </p>
            </div>
          ) : null}

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
            <Label>Format</Label>
            {LMS_EVENT_IN_PERSON_ONLY || formOptions.deliveryModes.length <= 1 ? (
              <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium">In person</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {formOptions.deliveryModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left text-sm transition",
                      values.deliveryMode === mode.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
                    )}
                    onClick={() => patch({ deliveryMode: mode.value })}
                  >
                    <span className="font-medium">{mode.label}</span>
                  </button>
                ))}
              </div>
            )}
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

          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <p className="text-sm font-medium">Plant Bingo / community event details</p>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ev-featured"
                    checked={values.isFeatured}
                    disabled={
                      !values.isFeatured &&
                      featuredStats != null &&
                      !featuredStats.canAddFeatured
                    }
                    onCheckedChange={(v) => {
                      const next = v === true;
                      if (next && featuredStats && !featuredStats.canAddFeatured && !values.isFeatured) {
                        toast.error(
                          `Featured limit reached (${featuredStats.used}/${featuredStats.maxSlots}). Unfeature another event or increase the limit in settings.`,
                        );
                        return;
                      }
                      patch({ isFeatured: next });
                    }}
                  />
                  <Label htmlFor="ev-featured" className="font-normal">
                    Featured on events page
                    {featuredStats ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({featuredStats.used}/{featuredStats.maxSlots})
                      </span>
                    ) : null}
                  </Label>
                </div>
                <a
                  href={`${EVENT_PLATFORM_PATHS.settings}?tab=featured-events`}
                  className="text-xs text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Featured settings
                </a>
              </div>
              {featuredStats && !featuredStats.canAddFeatured && !values.isFeatured ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  All {featuredStats.maxSlots} featured slots are in use. Increase the limit in Event Platform settings
                  or unfeature another event.
                </p>
              ) : featuredStats ? (
                <p className="text-xs text-muted-foreground">
                  {featuredStats.remaining > 0
                    ? `${featuredStats.remaining} featured slot${featuredStats.remaining === 1 ? "" : "s"} remaining.`
                    : "No featured slots remaining."}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {values.deliveryMode !== "online" ? (
                <div className="space-y-2">
                  <Label>Venue type</Label>
                  <Select
                    value={values.venueType ?? undefined}
                    onValueChange={(v) => patch({ venueType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Brewery, Greenhouse…" />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptions.venueTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Age rule</Label>
                <Select
                  value={values.ageRule ?? undefined}
                  onValueChange={(v) => patch({ ageRule: v, venueAge21Plus: v === "21+" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select age rule" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.ageRules.map((rule) => (
                      <SelectItem key={rule.value} value={rule.value}>
                        {rule.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {values.deliveryMode !== "online" ? (
              <div className="space-y-2">
                <Label>Venue options</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                    <Checkbox
                      checked={values.venueAge21Plus ?? false}
                      onCheckedChange={(v) =>
                        patch({
                          venueAge21Plus: v === true,
                          ageRule: v === true ? "21+" : values.ageRule,
                        })
                      }
                    />
                    <span>
                      <span className="font-medium">Age 21+</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Guests must be 21 or older</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                    <Checkbox
                      checked={values.venueDrinksAlcohol ?? false}
                      onCheckedChange={(v) => patch({ venueDrinksAlcohol: v === true })}
                    />
                    <span>
                      <span className="font-medium">Drinks (alcohol)</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Alcoholic beverages available</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                    <Checkbox checked={values.venueFood ?? false} onCheckedChange={(v) => patch({ venueFood: v === true })} />
                    <span>
                      <span className="font-medium">Food</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Food or catering available</span>
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="ev-image">Event image</Label>
                {selectedVenue?.imageUrl?.trim() && eventImageOverridden ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      const venueImage = selectedVenue.imageUrl?.trim() || "";
                      if (!venueImage) return;
                      patch({ imageUrl: venueImage });
                      setEventImageOverridden(false);
                    }}
                  >
                    Use venue image
                  </Button>
                ) : null}
              </div>
              <MediaPicker
                id="ev-image"
                value={values.imageUrl ?? ""}
                onChange={(v) => {
                  const next = typeof v === "string" ? v : v[0] ?? "";
                  patch({ imageUrl: next });
                  const venueImage = selectedVenue?.imageUrl?.trim() || "";
                  setEventImageOverridden(Boolean(next.trim() && next.trim() !== venueImage));
                }}
                placeholder="Select or upload an image…"
              />
              <p className="text-xs text-muted-foreground">
                {selectedVenue?.imageUrl?.trim()
                  ? "Defaults to the selected venue photo. Choose a different image here to override it for this event."
                  : "Shown on event cards and the public event page."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-event-date">
              Event date <span className="text-destructive">*</span>
            </Label>
            <DatePickerInput
              id="ev-event-date"
              value={values.eventDate?.trim() || eventDateFromIso(values.startsAt)}
              onChange={(e) => patchEventDate(e.target.value)}
              placeholder="Pick event date"
            />
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            <ScheduleTimeField
              id="ev-doors"
              label="Doors open"
              eventDate={values.eventDate?.trim() || eventDateFromIso(values.startsAt)}
              iso={values.doorsOpen ?? ""}
              onChange={(iso) => patch({ doorsOpen: iso })}
            />
            <ScheduleTimeField
              id="ev-bingo-start"
              label="Bingo start"
              required
              eventDate={values.eventDate?.trim() || eventDateFromIso(values.startsAt)}
              iso={values.bingoStart || values.startsAt}
              onChange={(iso) => patch({ bingoStart: iso, startsAt: iso })}
            />
            <ScheduleTimeField
              id="ev-bingo-end"
              label="Bingo end"
              required
              eventDate={values.eventDate?.trim() || eventDateFromIso(values.startsAt)}
              iso={values.bingoEnd || values.endsAt}
              onChange={(iso) => patch({ bingoEnd: iso, endsAt: iso })}
            />
          </div>

          {values.deliveryMode !== "online" ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Venue</Label>
                  <a
                    href={EVENT_PLATFORM_PATHS.venues}
                    className="text-xs text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Manage venues
                  </a>
                </div>
                <Select value={selectedVenueId || undefined} onValueChange={handleVenueSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={venuesLoading ? "Loading venues…" : "Select a saved venue"} />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                        {venueLocationLabel(venue) ? ` — ${venueLocationLabel(venue)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedVenue
                    ? "Address, city, coordinates, and phone below are filled from your saved venue."
                    : "Select a saved venue to auto-fill the location fields below."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-address">Address</Label>
                <AddressAutocomplete
                  id="ev-address"
                  apiKey={googleMapsApiKey}
                  value={values.venueAddress ?? ""}
                  onChange={(v) => patch({ venueAddress: v })}
                  onPlaceSelect={(parsed) => {
                    patch({
                      venueAddress: parsed.street || parsed.formattedAddress || values.venueAddress,
                      venueCity: parsed.city || values.venueCity,
                      venueState: parsed.state || values.venueState,
                      venuePostalCode: parsed.zip || values.venuePostalCode,
                      venueCountry: parsed.countryCode || values.venueCountry,
                      venueLat:
                        parsed.latitude != null && Number.isFinite(parsed.latitude)
                          ? parsed.latitude
                          : values.venueLat,
                      venueLng:
                        parsed.longitude != null && Number.isFinite(parsed.longitude)
                          ? parsed.longitude
                          : values.venueLng,
                    });
                  }}
                  placeholder="Start typing an address…"
                  inputProps={{ autoComplete: "off" }}
                />
                <p className="text-xs text-muted-foreground">
                  Search by street address — city, state, ZIP, and coordinates update when you pick a Google suggestion.
                </p>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ev-lat">Venue latitude</Label>
                  <Input
                    id="ev-lat"
                    type="number"
                    step="any"
                    value={values.venueLat ?? ""}
                    onChange={(e) => patch({ venueLat: e.target.value ? Number(e.target.value) : null })}
                    placeholder="44.998"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-lng">Venue longitude</Label>
                  <Input
                    id="ev-lng"
                    type="number"
                    step="any"
                    value={values.venueLng ?? ""}
                    onChange={(e) => patch({ venueLng: e.target.value ? Number(e.target.value) : null })}
                    placeholder="-93.246"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ev-venue-phone">Venue phone</Label>
                  <Input
                    id="ev-venue-phone"
                    value={values.venuePhone ?? ""}
                    onChange={(e) => patch({ venuePhone: e.target.value })}
                    placeholder="(214) 555-0100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-tz">Timezone</Label>
                  <Input
                    id="ev-tz"
                    value={values.timezone}
                    onChange={(e) => patch({ timezone: e.target.value })}
                  />
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

      {step === 2 ? <LmsEventPublicPageFields values={values} onPatch={patch} /> : null}

      {step === 3 ? <LmsEventHostSponsorFields values={values} onPatch={patch} /> : null}

      {step === 4 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-ticket-name">
              Bingo card name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ev-ticket-name"
              value={values.ticketName}
              onChange={(e) => patch({ ticketName: e.target.value, isFree: false })}
              placeholder="General admission"
            />
          </div>
          <div className="grid grid-cols-2 items-start gap-4">
            <CurrencyInput
              id="ev-price"
              label="Price (USD)"
              required
              value={values.price > 0 ? values.price : null}
              onChange={(price) => patch({ price: price ?? 0, isFree: false })}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-qty">Number of seats</Label>
              <Input
                id="ev-qty"
                type="number"
                readOnly
                disabled
                value={values.capacity ?? values.quantity ?? ""}
                className="h-10 bg-muted/50"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Number of seats is set when you create or edit the venue in Venue Management.
          </p>

          <div className="grid grid-cols-2 items-start gap-4">
            <CurrencyInput
              id="ev-bonus-price"
              label="Bonus card price (USD)"
              value={values.bonusCardsAllowed === false ? null : values.extraCardPrice}
              onChange={(extraCardPrice) => patch({ extraCardPrice: extraCardPrice ?? 0 })}
              disabled={values.bonusCardsAllowed === false}
            />
            <div className="flex flex-col gap-1.5">
              <Label>Bonus cards</Label>
              <Select
                value={values.bonusCardsAllowed === false ? "not_allowed" : "allowed"}
                onValueChange={(v) =>
                  patch({
                    bonusCardsAllowed: v === "allowed",
                    ...(v === "not_allowed" ? { extraCardPrice: null } : { extraCardPrice: values.extraCardPrice ?? 5 }),
                  })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowed">Allowed</SelectItem>
                  <SelectItem value="not_allowed">Not allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}

      {step === 5 ? <LmsEventGamesFields values={values} onPatch={patch} /> : null}

      {step === 6 ? <LmsEventFaqFields values={values} onPatch={patch} /> : null}

      {step === 7 ? (
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
              id="ev-sold-out"
              checked={values.soldOut}
              onCheckedChange={(v) => patch({ soldOut: v === true })}
            />
            <Label htmlFor="ev-sold-out" className="font-normal">
              Mark as sold out on public page
            </Label>
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

      {step === 8 ? (
        <LmsEventReviewStep values={values} categoryName={categoryName} onPatch={patch} />
      ) : null}

      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="outline" onClick={handleBack} disabled={step === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button type="submit">
          {step === STEPS.length - 1 ? (
            mode === "edit" ? "Save changes" : "Create event"
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
