"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency as fmtCurrencyLib } from "@/lib/format-currency";
import { computeProposalTotals } from "@/lib/sales-proposal-totals";
import { t } from "@/lib/admin-t";

type CurrencyOption = { code: string; name: string; symbol: string; is_default?: boolean };
type TaxOption = { id: string; name: string; rate: number; type: string };
type UnitOption = { id: string; name: string; short_name: string };
type ProductOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit_id: string | null;
  tax_id: string | null;
  tax_rate: number;
  sku: string | null;
};

type LineItem = {
  product_id: string | null;
  item_name: string;
  description: string;
  quantity: number;
  unit_id: string;
  unit_price: number;
  tax_id: string;
  tax_percentage: number;
  attachment_name: string | null;
};

function calcLineAmount(item: LineItem): number {
  return item.quantity * item.unit_price;
}

function formatCurrencyLabel(c: CurrencyOption): string {
  const sym = c.symbol?.trim();
  return sym ? `${c.code} (${sym})` : c.code;
}

function parseItemDescription(full: string | null, productName: string): string {
  if (!full) return "";
  const sep = " — ";
  if (full.includes(sep)) {
    const parts = full.split(sep);
    parts.shift();
    return parts.join(sep);
  }
  if (full === productName) return "";
  return full;
}

export function SalesProposalTemplateForm({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const formatCurrency = (n: number) => fmtCurrencyLib(n, settings);
  const isEdit = Boolean(templateId);

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [currencies, setCurrencies] = React.useState<CurrencyOption[]>([]);
  const [taxes, setTaxes] = React.useState<TaxOption[]>([]);
  const [units, setUnits] = React.useState<UnitOption[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);

  const [name, setName] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [calculateTax, setCalculateTax] = React.useState("after_discount");
  const [description, setDescription] = React.useState("");
  const [requireSignature, setRequireSignature] = React.useState(true);
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [discountType, setDiscountType] = React.useState<"percent" | "fixed">("fixed");
  const [notes, setNotes] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState("Thank you for your business.");
  const [items, setItems] = React.useState<LineItem[]>([]);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [optionsRes, templateRes] = await Promise.all([
          fetch("/api/sales-proposals/form-options", { credentials: "include", cache: "no-store" }),
          templateId
            ? fetch(`/api/sales-proposal-templates/${templateId}`, { credentials: "include", cache: "no-store" })
            : Promise.resolve(null),
        ]);

        const json = (await optionsRes.json().catch(() => null)) as {
          ok?: boolean;
          currencies?: CurrencyOption[];
          taxes?: TaxOption[];
          units?: UnitOption[];
          products?: ProductOption[];
          message?: string;
        };
        if (!optionsRes.ok || !json?.ok) {
          throw new Error(json?.message ?? t("Failed to load form options."));
        }

        const currencyList = Array.isArray(json.currencies) ? json.currencies : [];
        setCurrencies(currencyList);
        setTaxes(Array.isArray(json.taxes) ? json.taxes : []);
        setUnits(Array.isArray(json.units) ? json.units : [{ id: "pcs", name: "Pieces", short_name: "Pcs" }]);
        setProducts(Array.isArray(json.products) ? json.products : []);

        if (templateRes) {
          const tplJson = (await templateRes.json().catch(() => null)) as {
            ok?: boolean;
            template?: {
              name: string;
              currency: string;
              calculate_tax: string | null;
              description: string | null;
              require_signature: boolean;
              notes: string | null;
              payment_terms: string | null;
              discount: number;
              discount_type: string;
              items: Array<{
                product_id: string | null;
                description: string | null;
                quantity: number;
                unit_price: number;
                tax_percentage: number;
              }>;
            };
            message?: string;
          };
          if (!templateRes.ok || !tplJson?.ok || !tplJson.template) {
            throw new Error(tplJson?.message ?? t("Template not found."));
          }
          const tpl = tplJson.template;
          const productList = Array.isArray(json.products) ? json.products : [];
          const unitList = Array.isArray(json.units) ? json.units : [{ id: "pcs", name: "Pieces", short_name: "Pcs" }];
          const taxList = Array.isArray(json.taxes) ? json.taxes : [];

          setName(tpl.name);
          setCurrency(tpl.currency || currencyList.find((c) => c.is_default)?.code || "USD");
          setCalculateTax(tpl.calculate_tax ?? "after_discount");
          setDescription(tpl.description ?? "");
          setRequireSignature(tpl.require_signature);
          setNotes(tpl.notes ?? "");
          setPaymentTerms(tpl.payment_terms ?? "Thank you for your business.");
          setDiscount(String(tpl.discount ?? 0));
          setDiscountType(tpl.discount_type === "percent" ? "percent" : "fixed");
          setItems(
            tpl.items.map((it) => {
              const product = productList.find((p) => p.id === it.product_id);
              const tax = taxList.find((tx) => tx.rate === it.tax_percentage);
              return {
                product_id: it.product_id,
                item_name: product?.name ?? it.description?.split(" — ")[0] ?? "",
                description: parseItemDescription(it.description, product?.name ?? ""),
                quantity: it.quantity,
                unit_id: product?.unit_id && unitList.some((u) => u.id === product.unit_id) ? product.unit_id : unitList[0]?.id ?? "pcs",
                unit_price: it.unit_price,
                tax_id: tax?.id ?? product?.tax_id ?? "",
                tax_percentage: it.tax_percentage,
                attachment_name: null,
              };
            }),
          );
        } else {
          const defaultCurrency = currencyList.find((c) => c.is_default)?.code ?? currencyList[0]?.code ?? "USD";
          setCurrency(defaultCurrency);
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : t("Failed to load form."));
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  const totals = React.useMemo(
    () =>
      computeProposalTotals(
        items.map((i) => ({
          product_id: i.product_id ? Number(i.product_id) : undefined,
          item_name: i.item_name,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tax_percentage: i.tax_percentage,
        })),
        calculateTax,
        Number(discount) || 0,
        discountType,
      ),
    [items, calculateTax, discount, discountType],
  );

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleTaxChange = (index: number, taxId: string) => {
    const tax = taxes.find((tx) => tx.id === taxId);
    updateItem(index, { tax_id: taxId, tax_percentage: tax?.rate ?? 0 });
  };

  const addProductToItems = () => {
    if (!selectedProductId) {
      toast.error(t("Select a product first."));
      return;
    }
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const unitId =
      product.unit_id && units.some((u) => u.id === product.unit_id)
        ? product.unit_id
        : units[0]?.id ?? "pcs";

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        item_name: product.name,
        description: product.description?.trim() ?? "",
        quantity: 1,
        unit_id: unitId,
        unit_price: product.price,
        tax_id: product.tax_id ?? "",
        tax_percentage: product.tax_rate,
        attachment_name: null,
      },
    ]);
    setSelectedProductId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("Template name is required."));
      return;
    }
    const validItems = items.filter((i) => i.product_id);
    if (validItems.length === 0) {
      toast.error(t("Add at least one product."));
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/sales-proposal-templates/${templateId}` : "/api/sales-proposal-templates";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          currency,
          calculate_tax: calculateTax,
          description: description.trim() || null,
          require_signature: requireSignature,
          notes: notes.trim() || null,
          payment_terms: paymentTerms.trim() || null,
          discount: Number(discount) || 0,
          discount_type: discountType,
          items: validItems.map((i) => ({
            product_id: i.product_id ? Number(i.product_id) : undefined,
            item_name: i.item_name.trim(),
            description: [i.item_name.trim(), i.description.trim()].filter(Boolean).join(" — ") || i.item_name.trim(),
            quantity: i.quantity,
            unit_price: i.unit_price,
            tax_percentage: i.tax_percentage,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? t("Failed to save template."));
      toast.success(isEdit ? t("Template updated successfully.") : t("Template created successfully."));
      router.push("/sales-proposal-templates");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-4 text-muted-foreground">{t("Loading...")}</div>;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Template Details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label required>{t("Name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Festival Medical Package")} />
            </div>
            <div className="space-y-2">
              <Label>{t("Currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {formatCurrencyLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Calculate Tax")}</Label>
              <Select value={calculateTax} onValueChange={setCalculateTax}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after_discount">{t("After Discount")}</SelectItem>
                  <SelectItem value="before_discount">{t("Before Discount")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Description")}</Label>
            <RichTextEditor content={description} onChange={setDescription} placeholder={t("Enter template description...")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={requireSignature} onCheckedChange={(v) => setRequireSignature(v === true)} />
            {t("Require customer signature for approval")}
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Items")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1 space-y-2">
              <Label required>{t("Select Product")}</Label>
              <Select value={selectedProductId || undefined} onValueChange={setSelectedProductId} disabled={products.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={products.length ? t("Select product") : t("No products available")} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.sku ? ` (${p.sku})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" onClick={addProductToItems} disabled={!selectedProductId}>
              {t("Add")}
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              {t("Select a product above and click Add to include items in this template.")}
            </p>
          ) : null}

          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">{t("Description")}</th>
                    <th className="w-28 pb-2 pr-3 font-medium">{t("Quantity")}</th>
                    <th className="w-28 pb-2 pr-3 font-medium">{t("Unit Price")}</th>
                    <th className="w-40 pb-2 pr-3 font-medium">{t("Tax")}</th>
                    <th className="w-24 pb-2 pr-3 text-right font-medium">{t("Amount")}</th>
                    <th className="w-10 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b align-top">
                      <td className="py-3 pr-3">
                        <Input placeholder={t("Item Name")} value={item.item_name} readOnly className="mb-2 bg-muted/40" />
                        <Textarea
                          rows={2}
                          placeholder={t("Enter Description (optional)")}
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value, 10) || 1 })}
                            className="w-16"
                          />
                          <Select value={item.unit_id} onValueChange={(v) => updateItem(index, { unit_id: v })}>
                            <SelectTrigger className="w-[72px] px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.short_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unit_price || ""}
                          onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <Select
                          value={item.tax_id || "__none__"}
                          onValueChange={(v) => handleTaxChange(index, v === "__none__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("Nothing selected")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t("Nothing selected")}</SelectItem>
                            {taxes.map((tx) => (
                              <SelectItem key={tx.id} value={tx.id}>
                                {tx.name} ({tx.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50">
                          <input
                            type="file"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              updateItem(index, { attachment_name: file?.name ?? null });
                              e.target.value = "";
                            }}
                          />
                          {item.attachment_name ?? t("Choose a file")}
                        </label>
                      </td>
                      <td className="py-3 pr-3 text-right font-medium tabular-nums">
                        {formatCurrency(calcLineAmount(item))}
                      </td>
                      <td className="py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setItems((p) => p.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex justify-end border-t pt-4">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Sub Total")}</span>
                <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("Discount")}</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="h-8 w-20 text-right"
                  />
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}>
                    <SelectTrigger className="h-8 w-14 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="fixed">
                        {currency === "USD" ? "$" : currencies.find((c) => c.code === currency)?.symbol ?? currency}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Tax")}</span>
                <span className="tabular-nums">{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between rounded-md bg-muted px-2 py-1.5 font-semibold">
                <span>{t("Total")}</span>
                <span className="tabular-nums">{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("Note for the recipient")}</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("Terms and Conditions")}</Label>
          <Textarea rows={3} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/sales-proposal-templates")}>
          {t("Cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? t("Update Template") : t("Create Template")}
        </Button>
      </div>
    </form>
  );
}
