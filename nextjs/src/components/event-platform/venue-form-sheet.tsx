"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  collectCompletedWizardSteps,
  markWizardStepComplete,
  WizardStepIndicator,
} from "@/components/ui/wizard-step-indicator";
import {
  EVENT_VENUE_CATEGORIES,
  EVENT_VENUE_TYPES,
  VENUE_WIZARD_STEPS,
} from "@/lib/event-platform/venues/venue-constants";
import { defaultVenueBusinessHours } from "@/lib/event-platform/venues/venue-business-hours";
import type { EventVenueDto, VenueWeekday } from "@/lib/event-platform/venues/venue-types";
import { VENUE_WEEKDAYS } from "@/lib/event-platform/venues/venue-types";
import { formatPhone, formatPhoneDisplay } from "@/lib/phone";
import { normalizeWebsiteUrl } from "@/lib/website-url";

import { VenueAmenitiesHoursStep } from "./venue-amenities-hours-step";

const WEEKDAY_LABELS: Record<VenueWeekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type VenueFormState = {
  name: string;
  phone: string;
  website: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;
  category: string;
  venueType: string;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  seating: string;
  age21Plus: boolean;
  drinksAlcohol: boolean;
  food: boolean;
  businessHours: Record<VenueWeekday, string>;
};

function emptyBusinessHours(): Record<VenueWeekday, string> {
  return defaultVenueBusinessHours();
}

export function emptyVenueForm(): VenueFormState {
  return {
    name: "",
    phone: "",
    website: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    latitude: "",
    longitude: "",
    category: "",
    venueType: "",
    contactFirstName: "",
    contactLastName: "",
    contactPhone: "",
    contactEmail: "",
    seating: "",
    age21Plus: false,
    drinksAlcohol: false,
    food: false,
    businessHours: emptyBusinessHours(),
  };
}

export function venueFormFromDto(v: EventVenueDto): VenueFormState {
  const hours = emptyBusinessHours();
  if (v.businessHours) {
    for (const day of VENUE_WEEKDAYS) {
      hours[day] = v.businessHours[day] ?? "";
    }
  }
  return {
    name: v.name,
    phone: formatPhone(v.phone ?? ""),
    website: v.website ?? "",
    address: v.address ?? "",
    address2: v.address2 ?? "",
    city: v.city ?? "",
    state: v.state ?? "",
    zip: v.zip ?? "",
    latitude: v.latitude ?? "",
    longitude: v.longitude ?? "",
    category: v.category ?? "",
    venueType: v.venueType ?? "",
    contactFirstName: v.contactFirstName ?? "",
    contactLastName: v.contactLastName ?? "",
    contactPhone: formatPhone(v.contactPhone ?? ""),
    contactEmail: v.contactEmail ?? "",
    seating: v.seating != null ? String(v.seating) : "",
    age21Plus: v.age21Plus,
    drinksAlcohol: v.drinksAlcohol,
    food: v.food,
    businessHours: hours,
  };
}

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

function validateStep(step: number, form: VenueFormState): string | null {
  if (step === 0) {
    if (!form.name.trim()) return "Venue name is required.";
    if (!form.phone.trim()) return "Venue phone is required.";
    if (!form.address.trim()) return "Address is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.state.trim()) return "State is required.";
    if (!form.zip.trim()) return "Zip code is required.";
    if (!form.category.trim()) return "Venue category is required.";
    if (!form.venueType.trim()) return "Venue type is required.";
    if (form.latitude.trim()) {
      const lat = Number(form.latitude.trim());
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return "Latitude must be between -90 and 90.";
      }
    }
    if (form.longitude.trim()) {
      const lng = Number(form.longitude.trim());
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return "Longitude must be between -180 and 180.";
      }
    }
  }
  return null;
}

const VENUE_STEP_LABELS = VENUE_WIZARD_STEPS.map((s) => s.label);

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: VenueFormState;
  setForm: React.Dispatch<React.SetStateAction<VenueFormState>>;
  saving: boolean;
  googleMapsApiKey?: string | null;
  onSubmit: (e: React.FormEvent) => void;
};

export function VenueFormSheet({
  open,
  onOpenChange,
  editingId,
  form,
  setForm,
  saving,
  googleMapsApiKey,
  onSubmit,
}: Props) {
  const [step, setStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(() => new Set());
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>([...EVENT_VENUE_CATEGORIES]);
  const [typeOptions, setTypeOptions] = React.useState<string[]>([...EVENT_VENUE_TYPES]);

  React.useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [catRes, typeRes] = await Promise.all([
          fetch("/api/event-platform/venue-categories?active=1", { credentials: "include", cache: "no-store" }),
          fetch("/api/event-platform/venue-types?active=1", { credentials: "include", cache: "no-store" }),
        ]);
        const catData = (await catRes.json().catch(() => null)) as { ok?: boolean; items?: { name: string }[] } | null;
        const typeData = (await typeRes.json().catch(() => null)) as { ok?: boolean; items?: { name: string }[] } | null;
        if (catRes.ok && catData?.ok && catData.items?.length) {
          setCategoryOptions(catData.items.map((i) => i.name));
        }
        if (typeRes.ok && typeData?.ok && typeData.items?.length) {
          setTypeOptions(typeData.items.map((i) => i.name));
        }
      } catch {
        /* keep defaults */
      }
    })();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setCompletedSteps(
      editingId
        ? collectCompletedWizardSteps(VENUE_WIZARD_STEPS.length - 1, (index) => validateStep(index, form))
        : new Set(),
    );
    // Only reset wizard navigation when the sheet opens — not on every field change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  const categorySelectOptions = React.useMemo(() => {
    const names = new Set(categoryOptions);
    if (form.category.trim()) names.add(form.category.trim());
    return [...names];
  }, [categoryOptions, form.category]);

  const typeSelectOptions = React.useMemo(() => {
    const names = new Set(typeOptions);
    if (form.venueType.trim()) names.add(form.venueType.trim());
    return [...names];
  }, [typeOptions, form.venueType]);

  function handleNext() {
    const nextForm =
      step === 0 && form.website.trim()
        ? { ...form, website: normalizeWebsiteUrl(form.website) }
        : form;
    if (nextForm !== form) setForm(nextForm);
    const err = validateStep(step, nextForm);
    if (err) {
      toast.error(err);
      return;
    }
    setCompletedSteps((prev) => markWizardStepComplete(prev, step));
    setStep((s) => Math.min(s + 1, VENUE_WIZARD_STEPS.length - 1));
  }

  const fullAddress = [form.address, form.address2].filter(Boolean).join(", ");
  const contactName = [form.contactFirstName, form.contactLastName].filter(Boolean).join(" ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-lg">{editingId ? "Edit Venue" : "Add Venue"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <WizardStepIndicator
              steps={VENUE_STEP_LABELS}
              current={step}
              completedSteps={completedSteps}
              className="mb-6"
              onStepClick={(index) => {
                if (index === step || completedSteps.has(index)) setStep(index);
              }}
            />

            {step === 0 ? (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <RequiredLabel htmlFor="venue-name">Venue Name</RequiredLabel>
                  <Input
                    id="venue-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Main Arena"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <RequiredLabel htmlFor="venue-phone">Venue Phone</RequiredLabel>
                    <Input
                      id="venue-phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                      placeholder="(000) 000 0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-website">Website</Label>
                    <Input
                      id="venue-website"
                      value={form.website}
                      onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                      onBlur={(e) =>
                        setForm((f) => ({ ...f, website: normalizeWebsiteUrl(e.target.value) }))
                      }
                      placeholder="example.com"
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Location</h3>
                  <div className="space-y-1.5">
                    <RequiredLabel htmlFor="venue-address">Address</RequiredLabel>
                    <AddressAutocomplete
                      id="venue-address"
                      apiKey={googleMapsApiKey ?? undefined}
                      value={form.address}
                      onChange={(value) => setForm((f) => ({ ...f, address: value }))}
                      onPlaceSelect={(addr) =>
                        setForm((f) => ({
                          ...f,
                          address: addr.street || addr.formattedAddress || f.address,
                          city: addr.city || f.city,
                          state: addr.state || f.state,
                          zip: addr.zip || f.zip,
                          latitude:
                            addr.latitude != null && Number.isFinite(addr.latitude)
                              ? String(addr.latitude)
                              : f.latitude,
                          longitude:
                            addr.longitude != null && Number.isFinite(addr.longitude)
                              ? String(addr.longitude)
                              : f.longitude,
                        }))
                      }
                      placeholder="Street address"
                      inputProps={{ autoComplete: "off" }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-address-2">Address 2</Label>
                    <Input
                      id="venue-address-2"
                      value={form.address2}
                      onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                      placeholder="Apt, suite, unit, building (optional)"
                      autoComplete="address-line2"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <RequiredLabel htmlFor="venue-city">City</RequiredLabel>
                      <Input
                        id="venue-city"
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <RequiredLabel htmlFor="venue-state">State</RequiredLabel>
                      <Input
                        id="venue-state"
                        value={form.state}
                        onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                        placeholder="MN"
                        autoComplete="address-level1"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <RequiredLabel htmlFor="venue-zip">Zip Code</RequiredLabel>
                      <Input
                        id="venue-zip"
                        value={form.zip}
                        onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="venue-lat">Latitude</Label>
                      <Input
                        id="venue-lat"
                        inputMode="decimal"
                        value={form.latitude}
                        onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                        placeholder="44.9778"
                      />
                      <p className="text-xs text-muted-foreground">Between -90 and 90</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="venue-lng">Longitude</Label>
                      <Input
                        id="venue-lng"
                        inputMode="decimal"
                        value={form.longitude}
                        onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                        placeholder="-93.2650"
                      />
                      <p className="text-xs text-muted-foreground">Between -180 and 180</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <RequiredLabel htmlFor="venue-category">Venue Category</RequiredLabel>
                    <Select
                      value={form.category || undefined}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger id="venue-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorySelectOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <RequiredLabel htmlFor="venue-type">Venue Type</RequiredLabel>
                    <Select
                      value={form.venueType || undefined}
                      onValueChange={(v) => setForm((f) => ({ ...f, venueType: v }))}
                    >
                      <SelectTrigger id="venue-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {typeSelectOptions.map((typeName) => (
                          <SelectItem key={typeName} value={typeName}>
                            {typeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? <VenueAmenitiesHoursStep form={form} setForm={setForm} /> : null}

            {step === 2 ? (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Contact</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-first">Contact first name</Label>
                    <Input
                      id="contact-first"
                      value={form.contactFirstName}
                      onChange={(e) => setForm((f) => ({ ...f, contactFirstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-last">Contact last name</Label>
                    <Input
                      id="contact-last"
                      value={form.contactLastName}
                      onChange={(e) => setForm((f) => ({ ...f, contactLastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-phone">Contact phone</Label>
                    <Input
                      id="contact-phone"
                      value={form.contactPhone}
                      onChange={(e) => setForm((f) => ({ ...f, contactPhone: formatPhone(e.target.value) }))}
                      placeholder="(000) 000 0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email">Contact email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold">Review your venue</h3>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Venue details</p>
                  <ReviewRow label="Name" value={form.name} />
                  <ReviewRow label="Phone" value={formatPhoneDisplay(form.phone)} />
                  <ReviewRow label="Website" value={form.website} />
                  <ReviewRow label="Category" value={form.category} />
                  <ReviewRow label="Type" value={form.venueType} />
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
                  <ReviewRow label="Address" value={fullAddress} />
                  <ReviewRow label="City" value={form.city} />
                  <ReviewRow label="State" value={form.state} />
                  <ReviewRow label="Zip" value={form.zip} />
                  <ReviewRow
                    label="Coordinates"
                    value={
                      form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : ""
                    }
                  />
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</p>
                  <ReviewRow label="Capacity" value={form.seating} />
                  <ReviewRow label="Age 21+" value={form.age21Plus ? "Yes" : "No"} />
                  <ReviewRow label="Drinks" value={form.drinksAlcohol ? "Yes" : "No"} />
                  <ReviewRow label="Food" value={form.food ? "Yes" : "No"} />
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Business hours
                  </p>
                  {VENUE_WEEKDAYS.map((day) => {
                    const hours = form.businessHours[day]?.trim();
                    return (
                      <ReviewRow
                        key={day}
                        label={WEEKDAY_LABELS[day]}
                        value={hours || "Closed"}
                      />
                    );
                  })}
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
                  <ReviewRow label="Name" value={contactName} />
                  <ReviewRow label="Phone" value={formatPhoneDisplay(form.contactPhone)} />
                  <ReviewRow label="Email" value={form.contactEmail} />
                </div>
              </div>
            ) : null}
          </div>

          <SheetFooter className="mt-auto flex-row justify-between gap-3 border-t bg-background px-6 py-4">
            {step === 0 ? (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}

            {step < VENUE_WIZARD_STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next: {VENUE_WIZARD_STEPS[step + 1]?.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create venue"}
              </Button>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
