"use client";
import { useEffect, useState } from "react";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

export default function PosProductsClient() {
  const { settings } = useAppSettings();
  const formatMoney = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? formatCurrency(n, settings) : "—";
  };
  const [cats, setCats] = useState<{ value: string; label: string }[]>([]);
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);
  const [units, setUnits] = useState<{ value: string; label: string }[]>([]);
  const [taxes, setTaxes] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/pos/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCats(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name }))));
    fetch("/api/pos/brands", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBrands(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name }))));
    fetch("/api/pos/units", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUnits(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name }))));
    fetch("/api/pos/taxes", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTaxes(d.map((x: { id: string; name: string }) => ({ value: String(x.id), label: x.name }))));
  }, []);

  return (
    <PosSimpleAdmin
      title="Products"
      apiPath="/api/pos/products"
      createTitle="Add Product"
      editTitle="Edit Product"
      columns={[
        { key: "name", label: "Name" },
        { key: "barcode", label: "Barcode" },
        { key: "sku", label: "SKU" },
        { key: "price", label: "Price", render: (r) => formatMoney(r.price) },
        { key: "cost", label: "Cost", render: (r) => formatMoney(r.cost) },
        { key: "stock", label: "Stock" },
        { key: "inventoryPolicy", label: "Inv. policy" },
        { key: "category", label: "Category", render: (r) => (r.category as Record<string, string> | null)?.name ?? "—" },
        { key: "brand", label: "Brand", render: (r) => (r.brand as Record<string, string> | null)?.name ?? "—" },
        { key: "unit", label: "Unit", render: (r) => (r.unit as Record<string, string> | null)?.shortName ?? "—" },
        { key: "isActive", label: "Status", render: (r) => <StatusBadge status={r.isActive ? "active" : "inactive"} /> },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "barcode", label: "Barcode" },
        { key: "sku", label: "SKU" },
        { key: "price", label: "Price", type: "currency", required: true },
        { key: "compareAtPrice", label: "Compare-at price", type: "currency" },
        { key: "cost", label: "Cost", type: "currency" },
        { key: "stock", label: "Stock", type: "number" },
        { key: "stockAlert", label: "Stock Alert", type: "number" },
        {
          key: "inventoryPolicy",
          label: "Inventory policy",
          type: "select",
          options: [
            { value: "track", label: "Track — block oversell" },
            { value: "continue", label: "Continue — allow oversell" },
            { value: "deny", label: "Deny — hide when out of stock" },
          ],
        },
        { key: "categoryId", label: "Category", type: "select", options: cats },
        { key: "brandId", label: "Brand", type: "select", options: brands },
        { key: "unitId", label: "Unit", type: "select", options: units },
        { key: "taxId", label: "Tax", type: "select", options: taxes },
        { key: "description", label: "Description", type: "textarea" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      defaultValues={{
        price: 0,
        cost: 0,
        stock: 0,
        stockAlert: 5,
        isActive: true,
        inventoryPolicy: "track",
        storefrontPublished: false,
      }}
    />
  );
}
