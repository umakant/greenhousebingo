"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Loader2, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import {
  ProductFormSheet,
  type ProductFormValues,
} from "@/components/marketplace/admin/product-form-sheet";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

type ProductRow = {
  id: string;
  vendorId: string;
  vendorName: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  category: string | null;
  stock: number | null;
  status: string;
};

export default function VendorProductsAdmin({
  vendorId,
  vendorName,
  canManage,
}: {
  vendorId: string;
  vendorName: string;
  canManage: boolean;
}) {
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<ProductFormValues | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/marketplace/admin/products", window.location.origin);
      url.searchParams.set("vendorId", vendorId);
      const res = await fetch(url.toString(), { credentials: "include" });
      const data = await res.json();
      if (data?.ok) setRows((data.items as ProductRow[]).filter((p) => p.vendorId === vendorId));
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setMode("create");
    setEditing({
      vendorId,
      name: "",
      sku: "",
      description: "",
      price: "",
      currency: "USD",
      imageUrl: "",
      category: "",
      stock: "",
      status: "active",
    });
    setSheetOpen(true);
  };

  const openEdit = (row: ProductRow) => {
    setMode("edit");
    setEditing({
      id: row.id,
      vendorId: row.vendorId,
      name: row.name,
      sku: row.sku ?? "",
      description: row.description ?? "",
      price: String(row.price),
      currency: row.currency,
      imageUrl: row.imageUrl ?? "",
      category: row.category ?? "",
      stock: row.stock == null ? "" : String(row.stock),
      status: row.status,
    });
    setSheetOpen(true);
  };

  const remove = async (row: ProductRow) => {
    if (!window.confirm(`Delete product "${row.name}"?`)) return;
    const res = await fetch(`/api/marketplace/admin/products/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success("Product deleted");
      void load();
    } else {
      toast.error(data?.message ?? "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/marketplace/vendors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to vendors
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-background">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-sm font-semibold">{vendorName} — products</h2>
            <p className="text-xs text-muted-foreground">Catalog for this vendor only.</p>
          </div>
          {canManage ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add product
            </Button>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No products for this vendor yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.sku ?? "—"}</div>
                  </TableCell>
                  <TableCell>{row.category ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.price, settings)}</TableCell>
                  <TableCell>{row.stock == null ? "∞" : row.stock}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TableActionButton
                      label="Edit"
                      primaryIcon={<Pencil className="h-4 w-4" />}
                      onPrimaryClick={() => openEdit(row)}
                      className="ml-auto"
                      disabled={!canManage}
                      items={
                        canManage
                          ? [
                              { label: "Edit", onSelect: () => openEdit(row), icon: <Pencil className="h-4 w-4" /> },
                              {
                                label: "Delete",
                                onSelect: () => void remove(row),
                                icon: <Trash2 className="h-4 w-4" />,
                                destructive: true,
                              },
                            ]
                          : []
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={mode}
        initial={editing}
        vendors={[{ id: vendorId, name: vendorName }]}
        onSaved={() => void load()}
      />
    </div>
  );
}
