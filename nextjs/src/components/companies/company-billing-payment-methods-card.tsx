"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { CreditCard, HelpCircle, Loader2, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { parseExpMmYy } from "@/lib/billing-payment-method-server";
import { COMPANY_BILLING_PRISMA_BANNER, COMPANY_BILLING_PRISMA_TOAST_SHORT } from "@/lib/company-billing-prisma";
import {
  billingCardBrandLabel,
  billingCvvMaxLength,
  billingDigitsOnly,
  billingFormattedPanMaxLength,
  billingPanIsComplete,
  billingPanIsValidForSave,
  billingPanMaxLength,
  billingLuhnValid,
  formatBillingCardPanInput,
  formatBillingExpMmYyInput,
} from "@/lib/billing-payment-inputs";
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";

type AccountingItem = { method: string | null; count: number; last_used: string | null };

type SavedMethod = {
  id: string;
  kind: string;
  card_last4: string | null;
  card_brand: string | null;
  cardholder_name: string | null;
  exp_month: number | null;
  exp_year: number | null;
  paypal_email: string | null;
  is_default: boolean;
  created_at: string;
};

type Props = {
  companyId: string;
  onGoToPayments?: () => void;
};

export function CompanyBillingPaymentMethodsCard({ companyId, onGoToPayments }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [billingPrismaIncomplete, setBillingPrismaIncomplete] = React.useState(false);
  const [accounting, setAccounting] = React.useState<AccountingItem[]>([]);
  const [saved, setSaved] = React.useState<SavedMethod[]>([]);

  const [paymentKind, setPaymentKind] = React.useState<"card" | "paypal">("card");
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardholderName, setCardholderName] = React.useState("");
  const [exp, setExp] = React.useState("");
  const [paypalEmail, setPaypalEmail] = React.useState("");
  const [cvvLocal, setCvvLocal] = React.useState("");
  const [setPrimary, setSetPrimary] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const apiBase = `/api/companies/${encodeURIComponent(companyId)}/billing-payment-methods`;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase, { credentials: "include", cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        accounting_summary?: AccountingItem[];
        saved_methods?: SavedMethod[];
        error?: string;
        message?: string;
        billing_prisma_incomplete?: boolean;
      } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? json?.message ?? t("Failed to load payment methods"));
        setAccounting([]);
        setSaved([]);
        setBillingPrismaIncomplete(false);
        return;
      }
      setBillingPrismaIncomplete(Boolean(json.billing_prisma_incomplete));
      setAccounting(Array.isArray(json.accounting_summary) ? json.accounting_summary : []);
      setSaved(Array.isArray(json.saved_methods) ? json.saved_methods : []);
    } catch {
      setError(t("Failed to load payment methods"));
      setAccounting([]);
      setSaved([]);
      setBillingPrismaIncomplete(false);
    } finally {
      setLoading(false);
    }
  }, [apiBase, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setCardNumber("");
    setCardholderName("");
    setExp("");
    setPaypalEmail("");
    setCvvLocal("");
    setSetPrimary(true);
  };

  const cvvMax = billingCvvMaxLength(billingDigitsOnly(cardNumber));
  const panDigits = billingDigitsOnly(cardNumber);
  const cardBrandLabel = billingCardBrandLabel(panDigits);
  const panFormattedMax = billingFormattedPanMaxLength(panDigits);
  const panComplete = billingPanIsComplete(panDigits);
  const panInvalid =
    panComplete && !billingLuhnValid(panDigits);
  const panHint =
    panDigits.length > 0 && !panComplete
      ? `${panDigits.length} / ${billingPanMaxLength(panDigits)} ${t("digits")}`
      : null;

  const onCardNumberChange = (raw: string) => {
    const formatted = formatBillingCardPanInput(raw);
    setCardNumber(formatted);
    const pan = billingDigitsOnly(formatted);
    const max = billingCvvMaxLength(pan);
    setCvvLocal((c) => billingDigitsOnly(c).slice(0, max));
  };

  const onExpChange = (raw: string) => {
    setExp(formatBillingExpMmYyInput(raw));
  };

  const save = async () => {
    if (paymentKind === "card") {
      const pan = billingDigitsOnly(cardNumber);
      if (!billingPanIsValidForSave(pan)) {
        toast.error(t("Enter a valid card number."));
        return;
      }
      if (!cardholderName.trim()) {
        toast.error(t("Name on card is required."));
        return;
      }
      if (!parseExpMmYy(exp)) {
        toast.error(t("Exp. date must be MM/YY."));
        return;
      }
      const cv = billingDigitsOnly(cvvLocal);
      if (cv.length > 0 && cv.length !== cvvMax) {
        toast.error(t("Enter the full CVV or leave it blank."));
        return;
      }
    }

    setSaving(true);
    try {
      const body =
        paymentKind === "paypal"
          ? {
              kind: "paypal",
              paypal_email: paypalEmail.trim(),
              set_primary: setPrimary,
            }
          : {
              kind: "card",
              card_number: billingDigitsOnly(cardNumber),
              cardholder_name: cardholderName.trim(),
              exp: exp.trim(),
              set_primary: setPrimary,
            };

      const res = await fetch(apiBase, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
      if (!res.ok || !json?.ok) {
        const err = json?.error ?? "";
        if (res.status === 503 || /prisma|billing models|EPERM/i.test(err)) {
          toast.error(COMPANY_BILLING_PRISMA_TOAST_SHORT);
          return;
        }
        throw new Error(err || t("Save failed"));
      }
      toast.success(t("Payment method saved"));
      resetForm();
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (/prisma|billing models|findMany/i.test(msg)) {
        toast.error(COMPANY_BILLING_PRISMA_TOAST_SHORT);
      } else {
        toast.error(msg || t("Save failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const removeSaved = async (methodId: string) => {
    if (!(await appConfirm(t("Remove this saved payment method?")))) return;
    setDeletingId(methodId);
    try {
      const res = await fetch(`${apiBase}/${encodeURIComponent(methodId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? t("Remove failed"));
      toast.success(t("Removed"));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Remove failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const displayAccounting = (method: string | null) =>
    method?.trim() ? method.trim() : t("Unspecified");

  const formatSavedTitle = (m: SavedMethod) => {
    if (m.kind === "paypal" && m.paypal_email) return `PayPal · ${m.paypal_email}`;
    const brand = m.card_brand ?? t("Card");
    const last4 = m.card_last4 ?? "••••";
    return `${brand} · •••• ${last4}`;
  };

  const formatSavedSub = (m: SavedMethod) => {
    if (m.kind === "paypal") return t("PayPal account");
    const name = m.cardholder_name?.trim() || "—";
    const mm =
      m.exp_month != null && m.exp_year != null
        ? `${String(m.exp_month).padStart(2, "0")}/${String(m.exp_year).slice(-2)}`
        : "—";
    return `${name} · ${t("Expires")} ${mm}`;
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardContent className="p-0">
        {billingPrismaIncomplete ? (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-50">
            {COMPANY_BILLING_PRISMA_BANNER}
          </div>
        ) : null}
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="space-y-4 border-b p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" aria-hidden />
              <p className="text-sm font-semibold tracking-tight text-foreground">{t("Payment methods")}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "Add a card or PayPal for billing reference. Only the last four digits of the card are stored; CVV is never saved.",
              )}
            </p>

            <RadioGroup
              value={paymentKind}
              onValueChange={(v) => setPaymentKind(v as "card" | "paypal")}
              className="grid gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="pm-card" />
                <Label htmlFor="pm-card" className="font-normal">
                  {t("Credit / debit / ATM card")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="pm-paypal" />
                <Label htmlFor="pm-paypal" className="font-normal">
                  {t("PayPal account")}
                </Label>
              </div>
            </RadioGroup>

            {paymentKind === "card" ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="pm-card-number">{t("Card number")}</Label>
                    {cardBrandLabel ? (
                      <span className="text-xs font-medium text-muted-foreground">{cardBrandLabel}</span>
                    ) : null}
                  </div>
                  <Input
                    id="pm-card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    maxLength={panFormattedMax}
                    value={cardNumber}
                    onChange={(e) => onCardNumberChange(e.target.value)}
                    aria-invalid={panInvalid || undefined}
                    className={cn(
                      "bg-background font-mono tabular-nums",
                      panInvalid && "border-destructive focus-visible:ring-destructive/30",
                    )}
                  />
                  {panInvalid ? (
                    <p className="text-xs text-destructive">{t("Invalid card number.")}</p>
                  ) : panHint ? (
                    <p className="text-xs text-muted-foreground">{panHint}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pm-name">{t("Name")}</Label>
                  <Input
                    id="pm-name"
                    autoComplete="cc-name"
                    placeholder={t("Name on card")}
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                    <div className="space-y-2">
                      <Label htmlFor="pm-exp" className="flex h-5 items-center">
                        {t("Exp. date")}
                      </Label>
                      <Input
                        id="pm-exp"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={exp}
                        onChange={(e) => onExpChange(e.target.value)}
                        className="bg-background font-mono tabular-nums"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-cvv" className="flex h-5 items-center gap-1">
                        {t("CVV")}
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      </Label>
                      <Input
                        id="pm-cvv"
                        type="password"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder={cvvMax === 4 ? "••••" : "•••"}
                        maxLength={cvvMax}
                        className="bg-background font-mono tabular-nums"
                        value={cvvLocal}
                        onChange={(e) =>
                          setCvvLocal(billingDigitsOnly(e.target.value).slice(0, cvvMax))
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("CVV is not stored.")}</p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="pm-paypal-email">{t("PayPal email")}</Label>
                <Input
                  id="pm-paypal-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="bg-background"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/20 px-3 py-2">
              <Label htmlFor="pm-primary" className="text-sm font-normal text-muted-foreground">
                {t("Set as primary billing method")}
              </Label>
              <Switch id="pm-primary" checked={setPrimary} onCheckedChange={setSetPrimary} />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save changes")}
              </Button>
              <Button type="button" variant="outline" disabled={saving} onClick={resetForm}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-start bg-muted/20 p-6">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" aria-hidden />
              <p className="text-sm font-semibold tracking-tight text-foreground">{t("Saved billing methods")}</p>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Loading…")}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : saved.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No saved methods yet. Use the form on the left.")}</p>
            ) : (
              <ul className="space-y-3">
                {saved.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 rounded-lg border bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                        <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-foreground">{formatSavedTitle(row)}</p>
                          {row.is_default ? (
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">{t("Primary")}</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatSavedSub(row)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deletingId === row.id}
                      aria-label={t("Delete")}
                      onClick={() => void removeSaved(row.id)}
                    >
                      {deletingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 border-t border-border/60 pt-6">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
                <p className="text-sm font-semibold text-foreground">{t("Methods from payments")}</p>
              </div>
              {loading ? null : accounting.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("No payment methods recorded yet. Add payments under the Payments tab to see them here.")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {accounting.map((row, idx) => (
                    <li
                      key={`${row.method ?? "null"}-${idx}`}
                      className={cn(
                        "rounded-lg border bg-background p-4 shadow-sm",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                          <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{displayAccounting(row.method)}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("Used in")} {row.count}{" "}
                            {row.count === 1 ? t("payment") : t("payments")}
                            {row.last_used ? (
                              <>
                                {" · "}
                                {t("Last")} {row.last_used}
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {onGoToPayments ? (
              <div className="mt-6">
                <Button type="button" variant="outline" size="sm" onClick={onGoToPayments}>
                  {t("Open Payments tab")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
