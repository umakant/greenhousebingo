"use client";
import { PosSimpleAdmin, StatusBadge } from "@/components/pos/pos-simple-admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export default function PosSalesClient() {
  return (
    <PosSimpleAdmin
      title="Sales"
      apiPath="/api/pos/sales"
      createTitle="New Sale"
      editTitle="Edit Sale"
      pageActions={
        <Link href="/add-pos"><Button variant="outline" size="sm"><ShoppingCart className="mr-1.5 h-4 w-4" />POS Terminal</Button></Link>
      }
      columns={[
        { key: "number", label: "Invoice #" },
        { key: "customer", label: "Customer", render: r => (r.customer as Record<string, string> | null)?.name ?? "Walk-in" },
        { key: "branch", label: "Branch", render: r => (r.branch as Record<string, string> | null)?.name ?? "—" },
        { key: "total", label: "Total", render: r => `$${Number(r.total ?? 0).toFixed(2)}` },
        { key: "paid", label: "Paid", render: r => `$${Number(r.paid ?? 0).toFixed(2)}` },
        { key: "paymentMethod", label: "Payment" },
        { key: "status", label: "Status", render: r => <StatusBadge status={String(r.status)} /> },
        { key: "date", label: "Date", render: r => new Date(r.date as string).toLocaleDateString() },
      ]}
      fields={[
        { key: "status", label: "Status", type: "select", options: [{ value: "completed", label: "Completed" }, { value: "pending", label: "Pending" }, { value: "cancelled", label: "Cancelled" }] },
        { key: "paymentMethod", label: "Payment Method", type: "select", options: [{ value: "cash", label: "Cash" }, { value: "card", label: "Card" }, { value: "bank", label: "Bank Transfer" }, { value: "other", label: "Other" }] },
        { key: "paid", label: "Paid Amount", type: "number" },
        { key: "note", label: "Note", type: "textarea" },
      ]}
      defaultValues={{ status: "completed", paymentMethod: "cash" }}
    />
  );
}
