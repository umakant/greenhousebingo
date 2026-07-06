"use client";

import * as React from "react";
import { Package, Trash2, Wrench, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";

export type ProposalCatalogLineItem = {
  line_type: "product" | "service";
  product_id: string | null;
  service_id: string | null;
  item_name: string;
  description: string;
  quantity: number;
  unit_id: string;
  unit_price: number;
  tax_id: string;
  tax_percentage: number;
  attachment_name: string | null;
};

type CatalogOption = { id: string; label: string };
type TaxOption = { id: string; name: string; rate: number };
type UnitOption = { id: string; short_name: string };

type Props = {
  title: string;
  selectLabel: string;
  priceLabel: string;
  lineType: "product" | "service";
  catalogOptions: CatalogOption[];
  catalogEmptyHint: string;
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  onAdd: () => void;
  items: ProposalCatalogLineItem[];
  itemIndices: number[];
  taxes: TaxOption[];
  units: UnitOption[];
  formatCurrency: (n: number) => string;
  onUpdateItem: (index: number, patch: Partial<ProposalCatalogLineItem>) => void;
  onRemoveItem: (index: number) => void;
  onTaxChange: (index: number, taxId: string) => void;
  addButtonLabel?: string;
  hideTitle?: boolean;
};

function calcLineAmount(item: ProposalCatalogLineItem): number {
  return item.quantity * item.unit_price;
}

export function ProposalCatalogSection({
  title,
  selectLabel,
  priceLabel,
  lineType,
  catalogOptions,
  catalogEmptyHint,
  selectedId,
  onSelectedIdChange,
  onAdd,
  items,
  itemIndices,
  taxes,
  units,
  formatCurrency,
  onUpdateItem,
  onRemoveItem,
  onTaxChange,
  addButtonLabel,
  hideTitle = false,
}: Props) {
  const sectionItems = itemIndices.map((idx) => ({ idx, item: items[idx] })).filter((x) => x.item?.line_type === lineType);

  return (
    <div className="space-y-4">
      {hideTitle ? null : <h3 className="text-sm font-semibold">{title}</h3>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1 space-y-2">
          <Label required>{selectLabel}</Label>
          <Select value={selectedId || undefined} onValueChange={onSelectedIdChange} disabled={catalogOptions.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={catalogOptions.length ? t("Select") : catalogEmptyHint} />
            </SelectTrigger>
            <SelectContent>
              {catalogOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {catalogOptions.length === 0 ? <p className="text-xs text-muted-foreground">{catalogEmptyHint}</p> : null}
        </div>
        <Button type="button" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5" onClick={onAdd} disabled={!selectedId}>
          {addButtonLabel ?? t("Add")}
        </Button>
      </div>

      {sectionItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {lineType === "product" ? (
            <Package className="mb-3 h-10 w-10 text-muted-foreground/50" />
          ) : (
            <Wrench className="mb-3 h-10 w-10 text-muted-foreground/50" />
          )}
          <p>
            {lineType === "product"
              ? t("No products added yet. Select a product above and click \"Add Product\" to include items in this proposal.")
              : t("No services added yet. Select a service above and click \"Add Service\" to include items in this proposal.")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">{t("Description")}</th>
                <th className="w-28 pb-2 pr-3 font-medium">{t("Quantity")}</th>
                <th className="w-28 pb-2 pr-3 font-medium">{priceLabel}</th>
                <th className="w-40 pb-2 pr-3 font-medium">{t("Tax")}</th>
                <th className="w-24 pb-2 pr-3 text-right font-medium">{t("Amount")}</th>
                <th className="w-10 pb-2" />
              </tr>
            </thead>
            <tbody>
              {sectionItems.map(({ idx, item }) => (
                <tr key={idx} className="border-b align-top">
                  <td className="py-3 pr-3">
                    <Input placeholder={t("Item Name")} value={item.item_name} readOnly className="mb-2 bg-muted/40" />
                    <Textarea
                      rows={2}
                      placeholder={t("Enter Description (optional)")}
                      value={item.description}
                      onChange={(e) => onUpdateItem(idx, { description: e.target.value })}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => onUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-16"
                      />
                      <Select value={item.unit_id} onValueChange={(v) => onUpdateItem(idx, { unit_id: v })}>
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
                      onChange={(e) => onUpdateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <Select
                      value={item.tax_id || "__none__"}
                      onValueChange={(v) => onTaxChange(idx, v === "__none__" ? "" : v)}
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
                          onUpdateItem(idx, { attachment_name: file?.name ?? null });
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveItem(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {sectionItems.map(({ idx, item }) => (
          <div key={idx} className="space-y-2 rounded-lg border p-3">
            <Input placeholder={t("Item Name")} value={item.item_name} readOnly className="bg-muted/40" />
            <Textarea
              rows={2}
              placeholder={t("Enter Description (optional)")}
              value={item.description}
              onChange={(e) => onUpdateItem(idx, { description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => onUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
              />
              <Select value={item.unit_id} onValueChange={(v) => onUpdateItem(idx, { unit_id: v })}>
                <SelectTrigger>
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
              <Input
                type="number"
                step="0.01"
                min={0}
                value={item.unit_price || ""}
                onChange={(e) => onUpdateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
              />
              <Select
                value={item.tax_id || "__none__"}
                onValueChange={(v) => onTaxChange(idx, v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Tax")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("Nothing selected")}</SelectItem>
                  {taxes.map((tx) => (
                    <SelectItem key={tx.id} value={tx.id}>
                      {tx.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium tabular-nums">{formatCurrency(calcLineAmount(item))}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveItem(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
