"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  Shield,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency as fmtCurrencyLib } from "@/lib/format-currency";
import { formatDate as fmtDateLib, isDateBeforeToday, toIsoDateString } from "@/lib/format-date";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";
import { ProposalCatalogSection, type ProposalCatalogLineItem } from "@/components/sales-proposals/proposal-catalog-section";

type LeadOption = { id: string; name: string; company?: string | null };
type DealOption = { id: string; name: string; leadId?: string | null };
type ProjectOption = { id: string; name: string; status?: string | null };
type CurrencyOption = { code: string; name: string; symbol: string; is_default?: boolean };
type TaxOption = { id: string; name: string; rate: number; type: string };
type UnitOption = { id: string; name: string; short_name: string };
type ProductOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit_id: string | null;
  unit_name: string | null;
  tax_id: string | null;
  tax_rate: number;
  sku: string | null;
};

type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  rate: number;
  unit_id: string | null;
  tax_id: string | null;
  tax_rate: number;
  code: string | null;
};

type LineItem = ProposalCatalogLineItem;

const PROPOSAL_STEPS = [
  { id: 1, title: "Proposal Details", description: "Basic information about the proposal." },
  { id: 2, title: "Items & Pricing", description: "Add products or services to your proposal." },
  { id: 3, title: "Notes & Terms", description: "Notes and payment terms for the recipient." },
  { id: 4, title: "Review & Submit", description: "Review your proposal before submitting." },
] as const;

function SectionHeader({ icon: Icon, title }: { icon: typeof FileText; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-border pb-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function OrderSummaryPanel({
  totals,
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  currency,
  currencies,
  formatCurrency,
  taxRateLabel,
}: {
  totals: ReturnType<typeof computeTotals>;
  discount: string;
  discountType: "percent" | "fixed";
  onDiscountChange: (v: string) => void;
  onDiscountTypeChange: (v: "percent" | "fixed") => void;
  currency: string;
  currencies: CurrencyOption[];
  formatCurrency: (n: number) => string;
  taxRateLabel: string;
}) {
  const currencySymbol = currencies.find((c) => c.code === currency)?.symbol ?? "$";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">{t("Order Summary")}</h3>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
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
              onChange={(e) => onDiscountChange(e.target.value)}
              className="h-8 w-16 text-right"
            />
            <Select value={discountType} onValueChange={(v) => onDiscountTypeChange(v as "percent" | "fixed")}>
              <SelectTrigger className="h-8 w-14 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="fixed">{currencySymbol}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("Tax")} ({taxRateLabel})</span>
          <span className="tabular-nums">{formatCurrency(totals.taxAmount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold">{t("Total")}</span>
          <span className="text-lg font-bold tabular-nums text-primary">{formatCurrency(totals.total)}</span>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("All calculations are in USD ($) and auto-saved.").replace("USD ($)", `${currency} (${currencySymbol})`)}</span>
      </div>
    </div>
  );
}

function computeTotals(
  items: LineItem[],
  calculateTax: string,
  discountValue: number,
  discountType: "percent" | "fixed",
) {
  let subtotal = 0;
  const lines: Array<{ lineTotal: number; taxPct: number }> = [];

  for (const it of items) {
    if (!it.product_id && !it.service_id) continue;
    const lineTotal = it.quantity * it.unit_price;
    subtotal += lineTotal;
    lines.push({ lineTotal, taxPct: it.tax_percentage });
  }

  const proposalDiscount =
    discountType === "percent"
      ? (subtotal * Math.min(100, Math.max(0, discountValue))) / 100
      : Math.min(Math.max(0, discountValue), subtotal);

  let taxAmount = 0;
  for (const line of lines) {
    const lineShare = subtotal > 0 ? line.lineTotal / subtotal : 0;
    const proposalDiscShare = proposalDiscount * lineShare;
    const taxableBase =
      calculateTax === "before_discount" ? line.lineTotal : line.lineTotal - proposalDiscShare;
    taxAmount += (Math.max(0, taxableBase) * line.taxPct) / 100;
  }

  const total = subtotal - proposalDiscount + taxAmount;
  return { subtotal, discountAmount: proposalDiscount, taxAmount, total };
}


function formatCurrencyLabel(c: CurrencyOption): string {
  const sym = c.symbol?.trim();
  return sym ? `${c.code} (${sym})` : c.code;
}

export function SalesProposalCreateForm({
  embedded = false,
  redirectOnSuccess = !embedded,
  templateId,
  onSuccess,
  onCancel,
}: {
  embedded?: boolean;
  redirectOnSuccess?: boolean;
  templateId?: string;
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
} = {}) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const formatCurrency = (n: number) => fmtCurrencyLib(n, settings);

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [leads, setLeads] = React.useState<LeadOption[]>([]);
  const [deals, setDeals] = React.useState<DealOption[]>([]);
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [currencies, setCurrencies] = React.useState<CurrencyOption[]>([]);
  const [taxes, setTaxes] = React.useState<TaxOption[]>([]);
  const [units, setUnits] = React.useState<UnitOption[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [services, setServices] = React.useState<ServiceOption[]>([]);

  const [leadId, setLeadId] = React.useState("");
  const [dealId, setDealId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [validTill, setValidTill] = React.useState("");
  const [validTillError, setValidTillError] = React.useState("");
  const minValidTill = React.useMemo(() => toIsoDateString(new Date()), []);
  const [currency, setCurrency] = React.useState("USD");
  const [calculateTax, setCalculateTax] = React.useState("after_discount");
  const [description, setDescription] = React.useState("");
  const [requireSignature, setRequireSignature] = React.useState(true);
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [selectedServiceId, setSelectedServiceId] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [discountType, setDiscountType] = React.useState<"percent" | "fixed">("fixed");
  const [notes, setNotes] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState("Thank you for your business.");
  const [items, setItems] = React.useState<LineItem[]>([]);
  const [activeStep, setActiveStep] = React.useState(1);
  const [itemsTab, setItemsTab] = React.useState("products");

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
        const res = optionsRes;
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          leads?: LeadOption[];
          deals?: Array<{ id: string; name: string; lead_id?: string | null }>;
          projects?: ProjectOption[];
          currencies?: CurrencyOption[];
          taxes?: TaxOption[];
          units?: UnitOption[];
          products?: ProductOption[];
          services?: ServiceOption[];
          message?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message ?? t("Failed to load form options."));
        }
        setLeads(Array.isArray(json.leads) ? json.leads : []);
        setDeals(
          (Array.isArray(json.deals) ? json.deals : []).map((d) => ({
            id: d.id,
            name: d.name,
            leadId: d.lead_id ?? null,
          })),
        );
        setProjects(Array.isArray(json.projects) ? json.projects : []);
        const currencyList = Array.isArray(json.currencies) ? json.currencies : [];
        setCurrencies(currencyList);
        const defaultCurrency =
          currencyList.find((c) => c.is_default)?.code ?? currencyList[0]?.code ?? "USD";
        setCurrency(defaultCurrency);
        setTaxes(Array.isArray(json.taxes) ? json.taxes : []);
        const unitList = Array.isArray(json.units) ? json.units : [{ id: "pcs", name: "Pieces", short_name: "Pcs" }];
        setUnits(unitList);
        setProducts(Array.isArray(json.products) ? json.products : []);
        setServices(Array.isArray(json.services) ? json.services : []);

        if (templateRes) {
          const tplJson = (await templateRes.json().catch(() => null)) as {
            ok?: boolean;
            template?: {
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
          };
          if (templateRes.ok && tplJson?.ok && tplJson.template) {
            const tpl = tplJson.template;
            const productList = Array.isArray(json.products) ? json.products : [];
            const taxList = Array.isArray(json.taxes) ? json.taxes : [];
            setCurrency(tpl.currency || defaultCurrency);
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
                const itemName = product?.name ?? it.description?.split(" — ")[0] ?? "";
                let itemDesc = "";
                if (it.description?.includes(" — ")) {
                  itemDesc = it.description.split(" — ").slice(1).join(" — ");
                } else if (it.description && it.description !== itemName) {
                  itemDesc = it.description;
                }
                return {
                  line_type: "product" as const,
                  product_id: it.product_id,
                  service_id: null,
                  item_name: itemName,
                  description: itemDesc,
                  quantity: it.quantity,
                  unit_id:
                    product?.unit_id && unitList.some((u) => u.id === product.unit_id)
                      ? product.unit_id
                      : unitList[0]?.id ?? "pcs",
                  unit_price: it.unit_price,
                  tax_id: tax?.id ?? product?.tax_id ?? "",
                  tax_percentage: it.tax_percentage,
                  attachment_name: null,
                };
              }),
            );
          }
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : t("Failed to load form options."));
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  const filteredDeals = leadId ? deals.filter((d) => !d.leadId || d.leadId === leadId) : deals;

  const totals = React.useMemo(
    () => computeTotals(items, calculateTax, Number(discount) || 0, discountType),
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

    const newItem: LineItem = {
      line_type: "product",
      product_id: product.id,
      service_id: null,
      item_name: product.name,
      description: product.description?.trim() ?? "",
      quantity: 1,
      unit_id: unitId,
      unit_price: product.price,
      tax_id: product.tax_id ?? "",
      tax_percentage: product.tax_rate,
      attachment_name: null,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProductId("");
  };

  const addServiceToItems = () => {
    if (!selectedServiceId) {
      toast.error(t("Select a service first."));
      return;
    }
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return;

    const unitId =
      service.unit_id && units.some((u) => u.id === service.unit_id)
        ? service.unit_id
        : units[0]?.id ?? "pcs";

    const newItem: LineItem = {
      line_type: "service",
      product_id: null,
      service_id: service.id,
      item_name: service.name,
      description: service.description?.trim() ?? "",
      quantity: 1,
      unit_id: unitId,
      unit_price: service.rate,
      tax_id: service.tax_id ?? "",
      tax_percentage: service.tax_rate,
      attachment_name: null,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedServiceId("");
  };

  const handleValidTillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValidTill(value);
    if (value && isDateBeforeToday(value)) {
      setValidTillError(t("Valid till date cannot be in the past."));
    } else {
      setValidTillError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!leadId) {
      toast.error(t("Lead contact is required."));
      return;
    }
    if (filteredDeals.length > 0 && !dealId) {
      toast.error(t("Deal is required."));
      return;
    }
    if (!projectId) {
      toast.error(t("Project is required."));
      return;
    }
    if (!validTill) {
      toast.error(t("Valid till date is required."));
      return;
    }
    if (isDateBeforeToday(validTill)) {
      setValidTillError(t("Valid till date cannot be in the past."));
      toast.error(t("Valid till date cannot be in the past."));
      return;
    }
    const validItems = items.filter((i) => i.product_id || i.service_id);
    if (!saveAsDraft && validItems.length === 0) {
      toast.error(t("Add at least one product or service."));
      return;
    }
    if (validItems.some((i) => !i.product_id && !i.service_id)) {
      toast.error(t("Every line item must be linked to a product or service."));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sales-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lead_id: leadId,
          deal_id: dealId || null,
          project_id: projectId,
          due_date: validTill,
          currency,
          calculate_tax: calculateTax,
          description: description.trim() || null,
          require_signature: requireSignature,
          notes: notes.trim() || null,
          payment_terms: paymentTerms.trim() || null,
          discount: Number(discount) || 0,
          discount_type: discountType,
          save_as_draft: saveAsDraft,
          items: validItems.map((i) => ({
            product_id: i.product_id ? Number(i.product_id) : undefined,
            service_id: i.service_id ? Number(i.service_id) : undefined,
            item_name: i.item_name.trim(),
            description: [i.item_name.trim(), i.description.trim()].filter(Boolean).join(" — ") || i.item_name.trim(),
            quantity: i.quantity,
            unit_price: i.unit_price,
            tax_percentage: i.tax_percentage,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; message?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? t("Failed to create proposal."));
      toast.success(saveAsDraft ? t("Draft saved successfully.") : t("Proposal created successfully."));
      if (redirectOnSuccess) {
        router.push(data.id ? `/sales-proposals/${data.id}` : "/sales-proposals");
      } else {
        onSuccess?.(data.id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const saveAsDraft = submitter?.value === "draft";
    void handleSubmit(e, saveAsDraft);
  };

  if (loading) return <div className="py-4 text-muted-foreground">{t("Loading...")}</div>;

  const validTillDisplay = validTill ? fmtDateLib(validTill, settings) : "—";
  const currencySymbol = currencies.find((c) => c.code === currency)?.symbol ?? "$";
  const taxRateLabel =
    totals.subtotal > 0
      ? `${Math.round((totals.taxAmount / Math.max(totals.subtotal - totals.discountAmount, 1)) * 100)}%`
      : "0%";

  const basicInfoFields = (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label required>{t("Lead Contacts")}</Label>
        <Select value={leadId || undefined} onValueChange={(v) => { setLeadId(v); setDealId(""); }}>
          <SelectTrigger>
            <SelectValue placeholder={t("Select Lead")} />
          </SelectTrigger>
          <SelectContent>
            {leads.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}{l.company ? ` — ${l.company}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label required={filteredDeals.length > 0}>{t("Deal")}</Label>
        <Select value={dealId || undefined} onValueChange={setDealId} disabled={!leadId}>
          <SelectTrigger>
            <SelectValue placeholder={leadId ? t("Select deal") : t("Select A Lead First")} />
          </SelectTrigger>
          <SelectContent>
            {filteredDeals.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label required>{t("Project")}</Label>
        <Select value={projectId || undefined} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder={projects.length ? t("Select Project") : t("No projects available")} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}{p.status ? ` — ${p.status}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label required>{t("Valid Till")}</Label>
        <DatePickerInput
          value={validTill}
          onChange={handleValidTillChange}
          min={minValidTill}
          required
          className={cn(validTillError && "border-destructive focus-visible:border-destructive")}
        />
        {validTillError ? <p className="text-xs text-destructive">{validTillError}</p> : null}
      </div>
      <div className="space-y-2">
        <Label required>{t("Currency")}</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {currencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>{formatCurrencyLabel(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("Calculate Tax")}</Label>
        <Select value={calculateTax} onValueChange={setCalculateTax}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="after_discount">{t("After Discount")}</SelectItem>
            <SelectItem value="before_discount">{t("Before Discount")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>{t("Description")}</Label>
        <RichTextEditor
          content={description}
          onChange={setDescription}
          placeholder={t("Add a description for this proposal...")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <Checkbox checked={requireSignature} onCheckedChange={(v) => setRequireSignature(v === true)} />
        {t("Require Customer Signature For Approval")}
      </label>
    </div>
  );

  const itemsSection = (
    <Tabs value={itemsTab} onValueChange={setItemsTab} className="w-full">
      <TabsList className="mb-4 h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="products"
          className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
        >
          {t("Products")}
        </TabsTrigger>
        <TabsTrigger
          value="services"
          className="rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
        >
          {t("Services")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="products" className="mt-0">
        <ProposalCatalogSection
          title={t("Products")}
          selectLabel={t("Select Product")}
          priceLabel={t("Unit Price")}
          lineType="product"
          hideTitle
          addButtonLabel={t("Add Product")}
          catalogOptions={products.map((p) => ({ id: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ""}` }))}
          catalogEmptyHint={t("No products found. Add products under Accounting → Products.")}
          selectedId={selectedProductId}
          onSelectedIdChange={setSelectedProductId}
          onAdd={addProductToItems}
          items={items}
          itemIndices={items.map((_, i) => i)}
          taxes={taxes}
          units={units}
          formatCurrency={formatCurrency}
          onUpdateItem={updateItem}
          onRemoveItem={(index) => setItems((p) => p.filter((_, i) => i !== index))}
          onTaxChange={handleTaxChange}
        />
      </TabsContent>
      <TabsContent value="services" className="mt-0">
        <ProposalCatalogSection
          title={t("Services")}
          selectLabel={t("Select Service")}
          priceLabel={t("Rate")}
          lineType="service"
          hideTitle
          addButtonLabel={t("Add Service")}
          catalogOptions={services.map((s) => ({ id: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ""}` }))}
          catalogEmptyHint={t("No services found. Add services under Accounting → Services.")}
          selectedId={selectedServiceId}
          onSelectedIdChange={setSelectedServiceId}
          onAdd={addServiceToItems}
          items={items}
          itemIndices={items.map((_, i) => i)}
          taxes={taxes}
          units={units}
          formatCurrency={formatCurrency}
          onUpdateItem={updateItem}
          onRemoveItem={(index) => setItems((p) => p.filter((_, i) => i !== index))}
          onTaxChange={handleTaxChange}
        />
      </TabsContent>
    </Tabs>
  );

  const notesSection = (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>{t("Note for the recipient")}</Label>
        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("e.g. Thank you for your business")} />
      </div>
      <div className="space-y-2">
        <Label>{t("Terms and Conditions")}</Label>
        <Textarea rows={4} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
      </div>
    </div>
  );

  const reviewSection = (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border bg-muted/20 p-4">
        <p><span className="font-medium">{t("Lead")}:</span> {leads.find((l) => l.id === leadId)?.name ?? "—"}</p>
        <p><span className="font-medium">{t("Project")}:</span> {projects.find((p) => p.id === projectId)?.name ?? "—"}</p>
        <p><span className="font-medium">{t("Valid Till")}:</span> {validTillDisplay}</p>
        <p><span className="font-medium">{t("Items")}:</span> {items.filter((i) => i.product_id || i.service_id).length}</p>
      </div>
      <p className="text-muted-foreground">{t("Review the details above, then click Create Proposal to finish.")}</p>
    </div>
  );

  const sidebarSummary = (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h4 className="mb-3 text-sm font-semibold text-foreground">{t("Proposal Summary")}</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">{t("Sub Total")}</span><span className="tabular-nums">{formatCurrency(totals.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("Discount")}</span><span className="tabular-nums">{formatCurrency(totals.discountAmount)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("Tax")} ({taxRateLabel})</span><span className="tabular-nums">{formatCurrency(totals.taxAmount)}</span></div>
        <div className="flex justify-between border-t border-primary/20 pt-2">
          <span className="font-semibold text-foreground">{t("Total")}</span>
          <span className="text-lg font-bold tabular-nums text-primary">{formatCurrency(totals.total)}</span>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>{t("Currency")}: {currency} ({currencySymbol})</p>
        <p>{t("Valid Till")}: {validTillDisplay}</p>
      </div>
    </div>
  );

  const wizardLayout = (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b bg-muted/10 p-5 lg:w-[280px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <nav className="space-y-1">
          {PROPOSAL_STEPS.map((step) => {
            const active = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors",
                  active ? "bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <span className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  active ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground",
                )}>
                  {step.id}
                </span>
                <span>
                  <span className={cn("block text-sm font-medium", active ? "text-primary" : "text-foreground")}>{t(step.title)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t(step.description)}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-6 hidden lg:block">{sidebarSummary}</div>
        <div className="mt-6 hidden items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground lg:flex">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{t("Secure & Professional: Your proposal is protected and compliance-ready.")}</span>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="mb-6 lg:hidden">{sidebarSummary}</div>

          {activeStep === 1 && (
            <>
              <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
                <SectionHeader icon={FileText} title={t("Basic Information")} />
                {basicInfoFields}
              </section>
              <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
                <SectionHeader icon={Package} title={t("Items")} />
                {itemsSection}
              </section>
            </>
          )}

          {activeStep === 2 && (
            <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionHeader icon={Package} title={t("Items")} />
              {itemsSection}
            </section>
          )}

          {activeStep === 3 && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionHeader icon={FileText} title={t("Notes & Terms")} />
              {notesSection}
            </section>
          )}

          {activeStep === 4 && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionHeader icon={FileText} title={t("Review & Submit")} />
              {reviewSection}
            </section>
          )}

          <div className="mt-6 flex justify-between gap-2">
            <Button type="button" variant="outline" disabled={activeStep <= 1} onClick={() => setActiveStep((s) => Math.max(1, s - 1))}>
              {t("Previous")}
            </Button>
            {activeStep < 4 ? (
              <Button type="button" onClick={() => setActiveStep((s) => Math.min(4, s + 1))}>
                {t("Next")}
              </Button>
            ) : null}
          </div>
        </div>

        <aside className="w-full shrink-0 border-t bg-muted/5 p-5 xl:w-[340px] xl:border-l xl:border-t-0">
          <OrderSummaryPanel
            totals={totals}
            discount={discount}
            discountType={discountType}
            onDiscountChange={setDiscount}
            onDiscountTypeChange={setDiscountType}
            currency={currency}
            currencies={currencies}
            formatCurrency={formatCurrency}
            taxRateLabel={taxRateLabel}
          />
        </aside>
      </div>
    </div>
  );

  const simpleLayout = (
    <>
      <Card><CardHeader><CardTitle>{t("Proposal Details")}</CardTitle></CardHeader><CardContent>{basicInfoFields}</CardContent></Card>
      <Card><CardHeader><CardTitle>{t("Items")}</CardTitle></CardHeader><CardContent>{itemsSection}</CardContent></Card>
      {notesSection}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { if (onCancel) onCancel(); else router.push("/sales-proposals"); }}>{t("Cancel")}</Button>
        <Button type="submit" value="create" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create Proposal")}</Button>
      </div>
    </>
  );

  return (
    <form
      id="sales-proposal-create-form"
      onSubmit={onFormSubmit}
      className={embedded ? "flex min-h-0 flex-1 flex-col" : "mx-auto max-w-5xl space-y-6"}
    >
      {embedded ? wizardLayout : simpleLayout}
      {embedded ? (
        <div className="hidden">
          <Button type="submit" value="draft" disabled={submitting} />
          <Button type="submit" value="create" disabled={submitting} />
        </div>
      ) : null}
    </form>
  );
}
