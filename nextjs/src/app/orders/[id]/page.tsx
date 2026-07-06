import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { FormattedCurrency } from "@/components/formatted-currency";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { prisma } from "@/lib/prisma";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  const { id } = await params;
  const orderId = BigInt(id);

  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      planId: true,
      amount: true,
      status: true,
      paymentMethod: true,
      transactionId: true,
      metadata: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!order) redirect("/orders");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Orders"), url: "/orders" },
        { label: t("Details") },
      ]}
      pageTitle={t("Order") + " #" + order.id.toString()}
      pageActions={
        <Link
          href="/orders"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
        >
          {t("Back")}
        </Link>
      }
    >
      <div className="rounded-xl border bg-background p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("User ID")}</div>
            <div className="mt-1 font-mono text-sm">{order.userId?.toString?.() ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Plan ID")}</div>
            <div className="mt-1 font-mono text-sm">{order.planId?.toString?.() ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Amount")}</div>
            <div className="mt-1 text-sm font-medium">
              <FormattedCurrency value={Number(order.amount) || 0} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Status")}</div>
            <div className="mt-1 text-sm">{order.status}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Payment method")}</div>
            <div className="mt-1 text-sm">{order.paymentMethod ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Transaction ID")}</div>
            <div className="mt-1 font-mono text-sm">{order.transactionId ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Created at")}</div>
            <div className="mt-1 text-sm">{order.createdAt?.toISOString?.() ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Updated at")}</div>
            <div className="mt-1 text-sm">{order.updatedAt?.toISOString?.() ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("Created by")}</div>
            <div className="mt-1 font-mono text-sm">{order.createdBy?.toString?.() ?? "-"}</div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">{t("Metadata")}</div>
          <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs">
{order.metadata ?? ""}
          </pre>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

