"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";

type CustomerOption = { id: string; name: string; company_name: string };

type LineItem = { description: string; quantity: string; unit_price: string; tax_percentage: string };

export function SalesInvoiceCreateForm({
  embedded = false,
  redirectOnSuccess = !embedded,
  onSuccess,
  onCancel,
}: {
  embedded?: boolean;
  redirectOnSuccess?: boolean;
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
} = {}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [loadingCustomers, setLoadingCustomers] = React.useState(true);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState("");
  const [paidAmount, setPaidAmount] = React.useState("0");
  const [notes, setNotes] = React.useState("");
  const [terms, setTerms] = React.useState("Thank you for your business.");
  const [items, setItems] = React.useState<LineItem[]>([
    { description: "", quantity: "1", unit_price: "0", tax_percentage: "0" },
  ]);

  React.useEffect(() => {
    void (async () => {
      setLoadingCustomers(true);
      try {
        const res = await fetch("/api/sales-invoices/customers", { credentials: "include", cache: "no-store" });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          customers?: CustomerOption[];
          message?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message ?? t("Failed to load customers."));
        }
        setCustomers(Array.isArray(json.customers) ? json.customers : []);
      } catch (e: unknown) {
        setCustomers([]);
        toast.error(e instanceof Error ? e.message : t("Failed to load customers."));
      } finally {
        setLoadingCustomers(false);
      }
    })();
  }, []);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    if (!customerId) {
      toast.error(t("Customer is required."));
      return;
    }
    if (!invoiceDate) {
      toast.error(t("Invoice date is required."));
      return;
    }
    const validItems = items.filter((it) => it.description.trim());
    if (validItems.length === 0) {
      toast.error(t("Add at least one line item."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sales-invoices", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          project_name: projectName.trim() || null,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          paid_amount: Number(paidAmount) || 0,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          items: validItems.map((it) => ({
            description: it.description.trim(),
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            tax_percentage: Number(it.tax_percentage) || 0,
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? t("Failed to create invoice."));
      toast.success(t("Invoice created."));
      if (redirectOnSuccess) {
        router.push(json.id ? `/sales-invoices/${json.id}` : "/sales-invoices");
      } else {
        onSuccess?.(json.id);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error"));
    } finally {
      setSaving(false);
    }
  };

  const formBody = (
    <>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("Client")}</Label>
            <Select value={customerId || undefined} onValueChange={setCustomerId} disabled={loadingCustomers}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCustomers ? t("Loading customers...") : t("Select customer")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingCustomers && customers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("No customers found. Add customers under Accounting → Customers.")}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>{t("Project")}</Label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={t("Project name")} />
          </div>
          <div className="space-y-2">
            <Label>{t("Invoice Date")}</Label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("Due Date")}</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("Paid Amount")}</Label>
            <Input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t("Line Items")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((prev) => [...prev, { description: "", quantity: "1", unit_price: "0", tax_percentage: "0" }])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("Add line")}
            </Button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_80px_100px_80px_40px]">
              <Input
                placeholder={t("Description")}
                value={it.description}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
              />
              <Input
                type="number"
                placeholder={t("Qty")}
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder={t("Unit Price")}
                value={it.unit_price}
                onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder={t("Tax %")}
                value={it.tax_percentage}
                onChange={(e) => updateItem(idx, { tax_percentage: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                disabled={items.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("Note")}</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("Terms and Conditions")}</Label>
            <Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create Invoice")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) onCancel();
              else router.push("/sales-invoices");
            }}
          >
            {t("Cancel")}
          </Button>
        </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{formBody}</div>;
  }

  return (
    <Card className="mx-auto max-w-3xl shadow-sm">
      <CardHeader>
        <CardTitle>{t("Create Invoice")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">{formBody}</CardContent>
    </Card>
  );
}
