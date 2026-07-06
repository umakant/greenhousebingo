"use client";

import * as React from "react";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import {
  GoogleAddressInput,
  type GoogleAddressParsed,
} from "./google-address-input";
import { formatPhone, unformatPhone } from "@/lib/phone";

function VendorAddressBlock({
  prefix,
  address,
  city,
  state,
  postalCode,
  country,
  onChange,
  t,
  googleMapsApiKey,
}: {
  prefix: "billing" | "shipping";
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  onChange: (fields: Partial<{
    address: string; city: string; state: string;
    postalCode: string; country: string;
  }>) => void;
  t: (s: string) => string;
  googleMapsApiKey?: string | null;
}) {
  const handlePlace = React.useCallback((result: GoogleAddressParsed) => {
    onChange({
      city: result.city || city,
      state: result.state || state,
      postalCode: result.zip_code || postalCode,
      country: result.country || country,
    });
  }, [city, state, postalCode, country, onChange]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2 space-y-0.5">
        <Label htmlFor={`${prefix}-address`}>{t("Address")}</Label>
        <GoogleAddressInput
          id={`${prefix}-address`}
          placeholder={t("Start typing an address...")}
          value={address}
          onChange={(v) => onChange({ address: v })}
          onPlaceSelected={handlePlace}
          apiKey={googleMapsApiKey}
        />
      </div>
      <div className="space-y-0.5">
        <Label htmlFor={`${prefix}-city`}>{t("City")}</Label>
        <Input
          id={`${prefix}-city`}
          value={city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder={t("City")}
        />
      </div>
      <div className="space-y-0.5">
        <Label htmlFor={`${prefix}-state`}>{t("State / Province")}</Label>
        <Input
          id={`${prefix}-state`}
          value={state}
          onChange={(e) => onChange({ state: e.target.value })}
          placeholder={t("State")}
        />
      </div>
      <div className="space-y-0.5">
        <Label htmlFor={`${prefix}-postal`}>{t("Postal Code")}</Label>
        <Input
          id={`${prefix}-postal`}
          value={postalCode}
          onChange={(e) => onChange({ postalCode: e.target.value })}
          placeholder={t("Postal code")}
        />
      </div>
      <div className="space-y-0.5">
        <Label htmlFor={`${prefix}-country`}>{t("Country")}</Label>
        <Input
          id={`${prefix}-country`}
          value={country}
          onChange={(e) => onChange({ country: e.target.value })}
          placeholder={t("Country")}
        />
      </div>
    </div>
  );
}

export type VendorFormData = {
  name: string;
  company_name: string;
  email: string;
  phone: string;
  tax_number: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  same_as_billing: boolean;
  status: string;
  notes: string;
};

const defaultData: VendorFormData = {
  name: "",
  company_name: "",
  email: "",
  phone: "",
  tax_number: "",
  billing_address: "",
  billing_city: "",
  billing_state: "",
  billing_postal_code: "",
  billing_country: "",
  shipping_address: "",
  shipping_city: "",
  shipping_state: "",
  shipping_postal_code: "",
  shipping_country: "",
  same_as_billing: false,
  status: "active",
  notes: "",
};

type VendorRow = {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  tax_number: string | null;
  status: string;
  notes: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  same_as_billing?: boolean;
};

const FORM_ID = "vendor-sheet-form";

export function AccountVendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: VendorRow | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const appSettings = useAppSettingsOptional();
  const googleMapsApiKey = appSettings?.settings?.googleMapsApiKey;
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<VendorFormData>(defaultData);

  const isEdit = !!vendor;

  const [fetchedVendor, setFetchedVendor] = React.useState<VendorRow | null>(null);

  React.useEffect(() => {
    if (!open) {
      setFetchedVendor(null);
      return;
    }
    setError(null);
    if (!vendor) {
      setData(defaultData);
      return;
    }
    if (
      vendor.billing_address !== undefined ||
      vendor.billing_city !== undefined ||
      vendor.notes !== undefined
    ) {
      setData({
        name: vendor.name ?? "",
        company_name: vendor.company_name ?? "",
        email: vendor.email ?? "",
        phone: formatPhone(vendor.phone ?? ""),
        tax_number: vendor.tax_number ?? "",
        billing_address: vendor.billing_address ?? "",
        billing_city: vendor.billing_city ?? "",
        billing_state: vendor.billing_state ?? "",
        billing_postal_code: vendor.billing_postal_code ?? "",
        billing_country: vendor.billing_country ?? "",
        shipping_address: vendor.shipping_address ?? "",
        shipping_city: vendor.shipping_city ?? "",
        shipping_state: vendor.shipping_state ?? "",
        shipping_postal_code: vendor.shipping_postal_code ?? "",
        shipping_country: vendor.shipping_country ?? "",
        same_as_billing: vendor.same_as_billing ?? false,
        status: vendor.status ?? "active",
        notes: vendor.notes ?? "",
      });
      return;
    }
    fetch(`/api/account/vendors/${vendor.id}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((full: VendorRow | null) => {
        if (full) {
          setFetchedVendor(full);
          setData({
            name: full.name ?? "",
            company_name: full.company_name ?? "",
            email: full.email ?? "",
            phone: formatPhone(full.phone ?? ""),
            tax_number: full.tax_number ?? "",
            billing_address: (full as any).billing_address ?? "",
            billing_city: (full as any).billing_city ?? "",
            billing_state: (full as any).billing_state ?? "",
            billing_postal_code: (full as any).billing_postal_code ?? "",
            billing_country: (full as any).billing_country ?? "",
            shipping_address: (full as any).shipping_address ?? "",
            shipping_city: (full as any).shipping_city ?? "",
            shipping_state: (full as any).shipping_state ?? "",
            shipping_postal_code: (full as any).shipping_postal_code ?? "",
            shipping_country: (full as any).shipping_country ?? "",
            same_as_billing: (full as any).same_as_billing ?? false,
            status: full.status ?? "active",
            notes: (full as any).notes ?? "",
          });
        } else {
          setData({
            ...defaultData,
            name: vendor.name ?? "",
            company_name: vendor.company_name ?? "",
            email: vendor.email ?? "",
            phone: formatPhone(vendor.phone ?? ""),
            tax_number: vendor.tax_number ?? "",
            status: vendor.status ?? "active",
          });
        }
      })
      .catch(() => {
        setData({
          ...defaultData,
          name: vendor.name ?? "",
          company_name: vendor.company_name ?? "",
          email: vendor.email ?? "",
          phone: formatPhone(vendor.phone ?? ""),
          tax_number: vendor.tax_number ?? "",
          status: vendor.status ?? "active",
        });
      });
  }, [open, vendor]);

  const setBillingField = React.useCallback((
    fields: Partial<{ address: string; city: string; state: string; postalCode: string; country: string }>
  ) => {
    setData((p) => ({
      ...p,
      ...(fields.address !== undefined && { billing_address: fields.address }),
      ...(fields.city !== undefined && { billing_city: fields.city }),
      ...(fields.state !== undefined && { billing_state: fields.state }),
      ...(fields.postalCode !== undefined && { billing_postal_code: fields.postalCode }),
      ...(fields.country !== undefined && { billing_country: fields.country }),
    }));
  }, []);

  const setShippingField = React.useCallback((
    fields: Partial<{ address: string; city: string; state: string; postalCode: string; country: string }>
  ) => {
    setData((p) => ({
      ...p,
      ...(fields.address !== undefined && { shipping_address: fields.address }),
      ...(fields.city !== undefined && { shipping_city: fields.city }),
      ...(fields.state !== undefined && { shipping_state: fields.state }),
      ...(fields.postalCode !== undefined && { shipping_postal_code: fields.postalCode }),
      ...(fields.country !== undefined && { shipping_country: fields.country }),
    }));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!data.name.trim()) {
      setError(t("Name is required"));
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/account/vendors/${vendor!.id}` : "/api/account/vendors";
      const method = isEdit ? "PATCH" : "POST";
      const body = {
        name: data.name.trim(),
        company_name: data.company_name.trim() || null,
        email: data.email.trim() || null,
        phone: unformatPhone(data.phone).trim() || null,
        tax_number: data.tax_number.trim() || null,
        billing_address: data.billing_address.trim() || null,
        billing_city: data.billing_city.trim() || null,
        billing_state: data.billing_state.trim() || null,
        billing_postal_code: data.billing_postal_code.trim() || null,
        billing_country: data.billing_country.trim() || null,
        shipping_address: data.same_as_billing ? (data.billing_address.trim() || null) : (data.shipping_address.trim() || null),
        shipping_city: data.same_as_billing ? (data.billing_city.trim() || null) : (data.shipping_city.trim() || null),
        shipping_state: data.same_as_billing ? (data.billing_state.trim() || null) : (data.shipping_state.trim() || null),
        shipping_postal_code: data.same_as_billing ? (data.billing_postal_code.trim() || null) : (data.shipping_postal_code.trim() || null),
        shipping_country: data.same_as_billing ? (data.billing_country.trim() || null) : (data.shipping_country.trim() || null),
        same_as_billing: data.same_as_billing,
        status: data.status,
        notes: data.notes.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Request failed");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[560px] sm:max-w-[560px] p-0 flex flex-col"
        onPointerDownOutside={(e) => {
          const target = e.detail.originalEvent.target as Element | null;
          if (target?.closest(".pac-container")) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const target = (e.detail.originalEvent as PointerEvent).target as Element | null;
          if (target?.closest(".pac-container")) e.preventDefault();
        }}
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEdit ? t("Edit Vendor") : t("Create Vendor")}</SheetTitle>
          <SheetDescription>
            {isEdit ? t("Update vendor details.") : t("Add a new vendor.")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <form id={FORM_ID} onSubmit={submit} className="px-6 py-4 space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="vendor-name">{t("Name")}</Label>
                <Input
                  id="vendor-name"
                  value={data.name}
                  onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t("Vendor name")}
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="vendor-company">{t("Company Name")}</Label>
                <Input
                  id="vendor-company"
                  value={data.company_name}
                  onChange={(e) => setData((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder={t("Company name")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="vendor-email">{t("Email")}</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="vendor-phone">{t("Phone")}</Label>
                <Input
                  id="vendor-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={data.phone}
                  onChange={(e) => setData((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  placeholder="(000) 000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="vendor-tax">{t("Tax Number")}</Label>
                <Input
                  id="vendor-tax"
                  value={data.tax_number}
                  onChange={(e) => setData((p) => ({ ...p, tax_number: e.target.value }))}
                  placeholder={t("Tax number")}
                />
              </div>
              <div className="space-y-0.5">
                <Label>{t("Status")}</Label>
                <Select value={data.status} onValueChange={(v) => setData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("Active")}</SelectItem>
                    <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("Billing Address")}</p>
              <VendorAddressBlock
                prefix="billing"
                address={data.billing_address}
                city={data.billing_city}
                state={data.billing_state}
                postalCode={data.billing_postal_code}
                country={data.billing_country}
                onChange={setBillingField}
                t={t}
                googleMapsApiKey={googleMapsApiKey}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="vendor-same-billing"
                checked={data.same_as_billing}
                onCheckedChange={(v) => setData((p) => ({ ...p, same_as_billing: !!v }))}
              />
              <Label htmlFor="vendor-same-billing" className="font-normal cursor-pointer">
                {t("Shipping address same as billing")}
              </Label>
            </div>

            {!data.same_as_billing && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("Shipping Address")}</p>
                <VendorAddressBlock
                  prefix="shipping"
                  address={data.shipping_address}
                  city={data.shipping_city}
                  state={data.shipping_state}
                  postalCode={data.shipping_postal_code}
                  country={data.shipping_country}
                  onChange={setShippingField}
                  t={t}
                  googleMapsApiKey={googleMapsApiKey}
                />
              </div>
            )}

            <div className="space-y-0.5">
              <Label htmlFor="vendor-notes">{t("Notes")}</Label>
              <Textarea
                id="vendor-notes"
                value={data.notes}
                onChange={(e) => setData((p) => ({ ...p, notes: e.target.value }))}
                placeholder={t("Notes")}
                rows={3}
                className="resize-none"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving}>
            {saving ? t("Saving...") : isEdit ? t("Update Vendor") : t("Create Vendor")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
