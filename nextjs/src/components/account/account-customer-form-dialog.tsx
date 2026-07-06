"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/translation-context";
import { formatPhone, unformatPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomerRow } from "./account-customers-admin";
import {
  DEFAULT_ACCOUNT_PAYMENT_TERMS_OPTIONS,
} from "@/lib/account-payment-terms";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import {
  GoogleAddressInput,
  type GoogleAddressParsed,
} from "./google-address-input";

const PAYMENT_TERM_NONE = "__payment_terms_none__";

const defaultAddr = () => ({
  name: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
});

type Addr = ReturnType<typeof defaultAddr>;

/** Split stored full name for editing (first token + remainder). */
function splitContactPersonName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: "", last: "" };
  const idx = t.indexOf(" ");
  if (idx === -1) return { first: t, last: "" };
  return { first: t.slice(0, idx), last: t.slice(idx + 1).trim() };
}

function joinContactPersonName(first: string, last: string): string {
  return [first.trim(), last.trim()].filter(Boolean).join(" ").trim();
}

function inferBillingNameSource(
  billing: Addr,
  companyName: string,
  first: string,
  last: string,
): "company" | "contact" | "custom" {
  const name = (billing.name ?? "").trim();
  const cn = companyName.trim();
  const contactFull = joinContactPersonName(first, last).trim();
  if (!name) return "company";
  if (cn && name === cn) return "company";
  if (contactFull && name === contactFull) return "contact";
  return "custom";
}

type FormState = {
  company_name: string;
  contact_person_first_name: string;
  contact_person_last_name: string;
  contact_person_email: string;
  contact_person_mobile: string;
  tax_number: string;
  payment_terms: string;
  billing_name_source: "company" | "contact" | "custom";
  billing_address: Addr;
  shipping_address: Addr;
  same_as_billing: boolean;
  notes: string;
};

function toFormState(c: CustomerRow | null): FormState {
  if (!c)
    return {
      company_name: "",
      contact_person_first_name: "",
      contact_person_last_name: "",
      contact_person_email: "",
      contact_person_mobile: "",
      tax_number: "",
      payment_terms: "",
      billing_name_source: "company",
      billing_address: defaultAddr(),
      shipping_address: defaultAddr(),
      same_as_billing: false,
      notes: "",
    };
  const billing = (c.billing_address as Record<string, string> | null) ?? defaultAddr();
  const shipping = (c.shipping_address as Record<string, string> | null) ?? defaultAddr();
  const mapAddr = (a: Record<string, string>): Addr => ({
    name: a.name ?? "",
    address_line_1: a.address_line_1 ?? "",
    address_line_2: a.address_line_2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    country: a.country ?? "",
    zip_code: a.zip_code ?? "",
  });
  const { first, last } = splitContactPersonName(c.contact_person_name ?? "");
  const billingMapped = mapAddr(billing);
  return {
    company_name: c.company_name ?? "",
    contact_person_first_name: first,
    contact_person_last_name: last,
    contact_person_email: c.contact_person_email ?? "",
    contact_person_mobile: formatPhone(c.contact_person_mobile ?? ""),
    tax_number: c.tax_number ?? "",
    payment_terms: c.payment_terms ?? "",
    billing_name_source: inferBillingNameSource(
      billingMapped,
      c.company_name ?? "",
      first,
      last,
    ),
    billing_address: billingMapped,
    shipping_address: mapAddr(shipping),
    same_as_billing: c.same_as_billing ?? false,
    notes: c.notes ?? "",
  };
}

function AddressFields({
  addr,
  prefix,
  onChange,
  onPlaceSelected,
  t,
  nameControl,
  googleMapsApiKey,
}: {
  addr: Addr;
  prefix: "billing" | "shipping";
  onChange: (key: string, value: string) => void;
  onPlaceSelected: (result: GoogleAddressParsed) => void;
  t: (s: string) => string;
  /** When set, replaces the default "Name" input (e.g. billing addressee selector). */
  nameControl?: React.ReactNode;
  googleMapsApiKey?: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {nameControl ?? (
        <Input
          placeholder={t("Name")}
          value={addr.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      )}
      <div className="sm:col-span-2">
        <GoogleAddressInput
          id={`${prefix}_address_line_1`}
          placeholder={t("Start typing an address...")}
          value={addr.address_line_1}
          onChange={(v) => onChange("address_line_1", v)}
          onPlaceSelected={onPlaceSelected}
          apiKey={googleMapsApiKey}
        />
      </div>
      <Input
        placeholder={t("Address Line 2")}
        value={addr.address_line_2}
        onChange={(e) => onChange("address_line_2", e.target.value)}
      />
      <Input
        placeholder={t("City")}
        value={addr.city}
        onChange={(e) => onChange("city", e.target.value)}
      />
      <Input
        placeholder={t("State")}
        value={addr.state}
        onChange={(e) => onChange("state", e.target.value)}
      />
      <Input
        placeholder={t("Country")}
        value={addr.country}
        onChange={(e) => onChange("country", e.target.value)}
      />
      <Input
        placeholder={t("Zip Code")}
        value={addr.zip_code}
        onChange={(e) => onChange("zip_code", e.target.value)}
      />
    </div>
  );
}

const FORM_ID = "customer-sheet-form";

export function AccountCustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerRow | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const appSettings = useAppSettingsOptional();
  const googleMapsApiKey = appSettings?.settings?.googleMapsApiKey;
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(() => toFormState(customer));
  const [paymentTermsOptions, setPaymentTermsOptions] = React.useState<string[]>(() => [
    ...DEFAULT_ACCOUNT_PAYMENT_TERMS_OPTIONS,
  ]);

  type StorefrontEcomSummary = {
    order_count: number;
    lifetime_value_placeholder: number;
    recent_orders: Array<{
      id: number;
      order_number: string;
      total: number;
      currency: string;
      status: string;
      payment_status: string | null;
      created_at: string;
    }>;
  };

  const [storefrontEcom, setStorefrontEcom] = React.useState<StorefrontEcomSummary | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(toFormState(customer));
      setError(null);
    }
  }, [open, customer]);

  React.useEffect(() => {
    if (!open || !customer?.id) {
      setStorefrontEcom(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/account/customers/${customer.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          storefront_ecommerce?: StorefrontEcomSummary;
        };
        if (!cancelled && res.ok && data?.storefront_ecommerce) {
          setStorefrontEcom(data.storefront_ecommerce);
        }
      } catch {
        if (!cancelled) setStorefrontEcom(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customer?.id]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/account/customer-form-options", {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        payment_terms_options?: string[];
      };
      if (
        !cancelled &&
        res.ok &&
        Array.isArray(data.payment_terms_options) &&
        data.payment_terms_options.length > 0
      ) {
        setPaymentTermsOptions(data.payment_terms_options);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    setForm((prev) => {
      if (prev.billing_name_source === "company") {
        const name = prev.company_name.trim();
        if (prev.billing_address.name === name) return prev;
        return {
          ...prev,
          billing_address: { ...prev.billing_address, name },
        };
      }
      if (prev.billing_name_source === "contact") {
        const name = joinContactPersonName(
          prev.contact_person_first_name,
          prev.contact_person_last_name,
        );
        if (prev.billing_address.name === name) return prev;
        return {
          ...prev,
          billing_address: { ...prev.billing_address, name },
        };
      }
      return prev;
    });
  }, [
    form.company_name,
    form.contact_person_first_name,
    form.contact_person_last_name,
    form.billing_name_source,
  ]);

  const paymentTermSelectOptions = React.useMemo(() => {
    const cur = form.payment_terms.trim();
    const base = paymentTermsOptions.length
      ? paymentTermsOptions
      : [...DEFAULT_ACCOUNT_PAYMENT_TERMS_OPTIONS];
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [paymentTermsOptions, form.payment_terms]);

  const set = (key: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setBilling = React.useCallback((key: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      billing_address: { ...prev.billing_address, [key]: value },
    })), []);

  const setShipping = React.useCallback((key: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      shipping_address: { ...prev.shipping_address, [key]: value },
    })), []);

  const handleBillingPlace = React.useCallback((result: GoogleAddressParsed) => {
    setForm((prev) => ({
      ...prev,
      billing_address: {
        ...prev.billing_address,
        address_line_1: result.address_line_1 || prev.billing_address.address_line_1,
        address_line_2: result.address_line_2 || prev.billing_address.address_line_2,
        city: result.city || prev.billing_address.city,
        state: result.state || prev.billing_address.state,
        country: result.country || prev.billing_address.country,
        zip_code: result.zip_code || prev.billing_address.zip_code,
      },
    }));
  }, []);

  const handleShippingPlace = React.useCallback((result: GoogleAddressParsed) => {
    setForm((prev) => ({
      ...prev,
      shipping_address: {
        ...prev.shipping_address,
        address_line_1: result.address_line_1 || prev.shipping_address.address_line_1,
        address_line_2: result.address_line_2 || prev.shipping_address.address_line_2,
        city: result.city || prev.shipping_address.city,
        state: result.state || prev.shipping_address.state,
        country: result.country || prev.shipping_address.country,
        zip_code: result.zip_code || prev.shipping_address.zip_code,
      },
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const contact_person_name = joinContactPersonName(
        form.contact_person_first_name,
        form.contact_person_last_name,
      );
      if (!contact_person_name) {
        setError(t("First name and last name are required."));
        setSaving(false);
        return;
      }
      const payload = {
        company_name: form.company_name.trim(),
        contact_person_name,
        contact_person_email: form.contact_person_email.trim(),
        contact_person_mobile: unformatPhone(form.contact_person_mobile).trim() || null,
        tax_number: form.tax_number.trim() || null,
        payment_terms: form.payment_terms.trim() || null,
        billing_address: form.billing_address,
        shipping_address: form.same_as_billing
          ? form.billing_address
          : form.shipping_address,
        same_as_billing: form.same_as_billing,
        notes: form.notes.trim() || null,
      };
      const url = customer
        ? `/api/account/customers/${customer.id}`
        : "/api/account/customers";
      const res = await fetch(url, {
        method: customer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        portal_password?: string;
        welcome_email_sent?: boolean;
        welcome_email_error?: string;
      };
      if (!res.ok) throw new Error(data.error || res.statusText);

      if (!customer) {
        if (data.portal_password) {
          toast.success(
            `${t("Customer created.")} ${t("Temporary password:")} ${data.portal_password}`,
            { duration: 12000 },
          );
        } else {
          toast.success(t("Customer created."));
        }
        if (data.welcome_email_sent === false) {
          const detail =
            data.welcome_email_error?.trim() ||
            t(
              "Welcome email was not sent. Check Email Settings (SMTP) and that the New User email template exists.",
            );
          toast.warning(`${t("Welcome email could not be sent:")} ${detail}`, {
            duration: 12000,
          });
        } else if (data.portal_password) {
          toast.message(t("Welcome email sent with login details."), { duration: 6000 });
        }
      } else {
        toast.success(t("Customer updated."));
      }

      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!customer;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[600px] sm:max-w-[600px] p-0 flex flex-col"
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
          <SheetTitle>
            {isEdit ? t("Edit Customer") : t("Create Customer")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "A portal login is created from the contact email with access to Expense Management and profile settings. A welcome email with a temporary password is sent using your Email Settings (SMTP).",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <form
            id={FORM_ID}
            onSubmit={handleSubmit}
            className="px-6 py-4 space-y-4"
          >
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="company_name">{t("Company Name")}</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder={t("Enter company name")}
                  required
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="tax_number">{t("Tax ID #")}</Label>
                <Input
                  id="tax_number"
                  value={form.tax_number}
                  onChange={(e) => set("tax_number", e.target.value)}
                  placeholder={t("Enter tax ID")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="contact_person_first_name">{t("First Name")}</Label>
                <Input
                  id="contact_person_first_name"
                  value={form.contact_person_first_name}
                  onChange={(e) =>
                    set("contact_person_first_name", e.target.value)
                  }
                  placeholder={t("Enter first name")}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="contact_person_last_name">{t("Last Name")}</Label>
                <Input
                  id="contact_person_last_name"
                  value={form.contact_person_last_name}
                  onChange={(e) =>
                    set("contact_person_last_name", e.target.value)
                  }
                  placeholder={t("Enter last name")}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="contact_person_mobile">
                  {t("Phone Number")}
                </Label>
                <Input
                  id="contact_person_mobile"
                  type="tel"
                  value={form.contact_person_mobile}
                  onChange={(e) =>
                    set("contact_person_mobile", formatPhone(e.target.value))
                  }
                  placeholder="(000) 000-0000"
                  maxLength={14}
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="contact_person_email">{t("Email Address")}</Label>
                <Input
                  id="contact_person_email"
                  type="email"
                  value={form.contact_person_email}
                  onChange={(e) =>
                    set("contact_person_email", e.target.value)
                  }
                  placeholder={t("Enter email address")}
                  required
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="payment_terms">{t("Payment Terms")}</Label>
              <Select
                value={
                  form.payment_terms.trim()
                    ? form.payment_terms
                    : PAYMENT_TERM_NONE
                }
                onValueChange={(v) =>
                  set("payment_terms", v === PAYMENT_TERM_NONE ? "" : v)
                }
              >
                <SelectTrigger id="payment_terms" className="w-full">
                  <SelectValue placeholder={t("Select payment terms")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PAYMENT_TERM_NONE}>
                    {t("None")}
                  </SelectItem>
                  {paymentTermSelectOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground pt-0.5">
                {t("payment_terms_settings_hint")}
              </p>
            </div>

            {isEdit && storefrontEcom ? (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <p className="text-sm font-medium">{t("Storefront eCommerce")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Orders")}: {storefrontEcom.order_count} · {t("Paid revenue (placeholder)")}:{" "}
                  {storefrontEcom.lifetime_value_placeholder.toFixed(2)}
                </p>
                {storefrontEcom.recent_orders.length > 0 ? (
                  <ul className="text-xs space-y-1">
                    {storefrontEcom.recent_orders.slice(0, 5).map((o) => (
                      <li key={o.id} className="flex justify-between gap-2">
                        <span>
                          {o.order_number} · {o.status}
                          {o.payment_status ? ` (${o.payment_status})` : ""}
                        </span>
                        <span className="text-muted-foreground">
                          {o.currency} {o.total.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("No linked storefront orders yet.")}</p>
                )}
                <Link
                  href="/storefront/orders"
                  className="text-xs text-primary underline-offset-4 hover:underline inline-block"
                >
                  {t("Open storefront orders")}
                </Link>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("Billing Address")}</p>
              <AddressFields
                addr={form.billing_address}
                prefix="billing"
                onChange={setBilling}
                onPlaceSelected={handleBillingPlace}
                t={t}
                googleMapsApiKey={googleMapsApiKey}
                nameControl={
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-xs font-normal text-muted-foreground">
                      {t("Billing addressee")}
                    </Label>
                    <Select
                      value={form.billing_name_source}
                      onValueChange={(v: "company" | "contact" | "custom") => {
                        setForm((prev) => {
                          let name = prev.billing_address.name;
                          if (v === "company") name = prev.company_name.trim();
                          else if (v === "contact")
                            name = joinContactPersonName(
                              prev.contact_person_first_name,
                              prev.contact_person_last_name,
                            );
                          return {
                            ...prev,
                            billing_name_source: v,
                            billing_address: {
                              ...prev.billing_address,
                              name,
                            },
                          };
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">
                          {t("Company name")}:{" "}
                          {form.company_name.trim() || "—"}
                        </SelectItem>
                        <SelectItem value="contact">
                          {t("Contact name")}:{" "}
                          {joinContactPersonName(
                            form.contact_person_first_name,
                            form.contact_person_last_name,
                          ) || "—"}
                        </SelectItem>
                        <SelectItem value="custom">{t("Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.billing_name_source === "custom" ? (
                      <Input
                        placeholder={t("Name")}
                        value={form.billing_address.name}
                        onChange={(e) => setBilling("name", e.target.value)}
                      />
                    ) : null}
                  </div>
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="same_as_billing"
                checked={form.same_as_billing}
                onCheckedChange={(v) => set("same_as_billing", !!v)}
              />
              <Label
                htmlFor="same_as_billing"
                className="font-normal cursor-pointer"
              >
                {t("Shipping address same as billing")}
              </Label>
            </div>

            {!form.same_as_billing && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("Shipping Address")}</p>
                <AddressFields
                  addr={form.shipping_address}
                  prefix="shipping"
                  onChange={setShipping}
                  onPlaceSelected={handleShippingPlace}
                  t={t}
                  googleMapsApiKey={googleMapsApiKey}
                />
              </div>
            )}

            <div className="space-y-0.5">
              <Label htmlFor="notes">{t("Notes")}</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder={t("Optional notes")}
                rows={3}
                className="resize-none"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={saving}
          >
            {saving
              ? t("Saving...")
              : isEdit
              ? t("Update Customer")
              : t("Create Customer")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
