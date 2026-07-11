"use client";

import * as React from "react";
import {
  Building2,
  ClipboardList,
  Coins,
  Edit,
  FileText,
  LayoutDashboard,
  ListTodo,
  MapPin,
  MessageSquare,
  Receipt,
  ShoppingBag,
  User,
  Wallet,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { hasAccountPermission } from "@/lib/authz";
import { formatPhoneDisplay } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CustomerRow } from "./account-customers-admin";
import { AccountCustomerFormDialog } from "./account-customer-form-dialog";

type RecentOrder = {
  id: number;
  order_number: string;
  total: number;
  currency: string;
  status: string;
  payment_status: string | null;
  created_at: string;
};

export type CustomerDetailPayload = CustomerRow & {
  storefront_ecommerce?: {
    order_count: number;
    unpaid_order_count: number;
    lifetime_value_placeholder: number;
    recent_orders: RecentOrder[];
  };
};

type CustomerSectionId =
  | "overview"
  | "customer_details"
  | "orders"
  | "invoices"
  | "payments"
  | "notes"
  | "documents";

type NavItem = {
  id: CustomerSectionId;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const CUSTOMER_SECTIONS: NavItem[] = [
  { id: "overview", titleKey: "Overview", icon: LayoutDashboard },
  { id: "customer_details", titleKey: "Customer details", icon: ClipboardList },
  { id: "orders", titleKey: "Orders", icon: ShoppingBag },
  { id: "invoices", titleKey: "Invoices", icon: Receipt },
  { id: "payments", titleKey: "Payments", icon: Wallet },
  { id: "notes", titleKey: "Notes", icon: MessageSquare },
  { id: "documents", titleKey: "Documents", icon: FileText },
];

/** Same chrome as `ProjectSectionShell` in `project-detail.tsx`. */
function CustomerSectionShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 shrink-0" />
            {title}
          </CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SnapshotField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function parseCustomerDetailResponse(res: Response): Promise<CustomerDetailPayload> {
  const text = await res.text();
  let body: unknown = null;
  if (text.trim()) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Invalid response (${res.status}). Expected JSON.`);
    }
  }
  if (!res.ok) {
    const msg =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error?: unknown }).error ?? "").trim()
        : "";
    throw new Error(msg || res.statusText || `HTTP ${res.status}`);
  }
  if (!body || typeof body !== "object" || !("id" in body)) {
    throw new Error("Invalid customer response from server.");
  }
  return body as CustomerDetailPayload;
}

function formatAddress(addr: Record<string, unknown> | null | undefined): string {
  if (!addr || typeof addr !== "object") return "—";
  const parts = [
    addr.name,
    addr.address_line_1,
    addr.address_line_2,
    [addr.city, addr.state].filter(Boolean).join(", "),
    [addr.country, addr.zip_code].filter(Boolean).join(" "),
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join("\n") : "—";
}

export default function AccountCustomerView({
  customerId,
  permissions,
}: {
  customerId: string;
  permissions: string[];
}) {
  const { t } = useTranslation();
  const canEdit =
    permissions.includes("*") ||
    permissions.includes("manage-customers") ||
    permissions.includes("edit-customers");

  const [active, setActive] = React.useState<CustomerSectionId>("overview");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<CustomerDetailPayload | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const canView = hasAccountPermission(permissions, "manage-customers");

  const rowForForm = React.useMemo((): CustomerRow | null => {
    if (!detail) return null;
    const { storefront_ecommerce: _ignored, ...rest } = detail;
    void _ignored;
    return rest as CustomerRow;
  }, [detail]);

  const reloadDetail = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/account/customers/${encodeURIComponent(customerId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await parseCustomerDetailResponse(res);
      setDetail(data);
    } catch {
      /* ignore reload errors */
    }
  }, [customerId]);

  React.useEffect(() => {
    if (!canView) {
      setLoading(false);
      setError(t("You do not have permission to view this customer."));
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/account/customers/${encodeURIComponent(customerId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        const data = await parseCustomerDetailResponse(res);
        setDetail(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t("Failed to load customer"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView, customerId, t]);

  const sf = detail?.storefront_ecommerce;
  const displayName = detail?.contact_person_name?.trim() || detail?.company_name || t("Customer");
  const primaryCurrency = sf?.recent_orders?.[0]?.currency ?? "USD";

  const editAction = canEdit ? (
    <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
      <Edit className="h-4 w-4 mr-1" />
      {t("Edit")}
    </Button>
  ) : null;

  const overviewActions = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setActive("customer_details")}>
        {t("Customer details")}
      </Button>
      {editAction}
    </div>
  );

  const customerDetailsActions = editAction;

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">{t("Loading...")}</div>;
  }

  if (error || !detail) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("Could not load customer")}</CardTitle>
          <CardDescription className="text-destructive/90">
            {error?.trim() ? error : t("Customer not found.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("Try refreshing the page.")}</CardContent>
      </Card>
    );
  }

  const renderSection = () => {
    switch (active) {
      case "overview":
        return (
          <CustomerSectionShell
            title={t("Overview")}
            description={t("Key metrics and customer record summary at a glance.")}
            icon={LayoutDashboard}
            actions={overviewActions}
          >
            <div className="space-y-8">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Summary metrics")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
                        {detail.user?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={detail.user.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-7 w-7 text-muted-foreground" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold leading-snug">{displayName}</div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">{detail.company_name}</div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {detail.customer_code ? `${detail.customer_code} · ` : null}
                          {detail.updated_at ? new Date(detail.updated_at).toLocaleString() : "—"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Storefront orders")}</div>
                        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-primary">
                          {sf?.order_count ?? 0}
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <ListTodo className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Paid storefront total")}</div>
                        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-primary">
                          {formatMoney(sf?.lifetime_value_placeholder ?? 0, primaryCurrency)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <Coins className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-gradient-to-b from-muted/40 to-background shadow-none transition-colors hover:border-primary/25">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">{t("Unpaid storefront orders")}</div>
                        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-primary">
                          {sf?.unpaid_order_count ?? 0}
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-3 text-primary">
                        <Receipt className="h-6 w-6" aria-hidden />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Customer snapshot")}
                </h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border/80 bg-muted/10 p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <User className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t("Contact & company")}</p>
                        <p className="text-xs text-muted-foreground">{t("Primary contact and billing identity.")}</p>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <SnapshotField label={t("Contact person")}>{detail.contact_person_name}</SnapshotField>
                      <SnapshotField label={t("Email")}>{detail.contact_person_email}</SnapshotField>
                      <SnapshotField label={t("Company name")}>{detail.company_name}</SnapshotField>
                      <SnapshotField label={t("Tax number")}>{detail.tax_number?.trim() || "—"}</SnapshotField>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/10 p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShoppingBag className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t("Commerce")}</p>
                        <p className="text-xs text-muted-foreground">{t("Storefront activity linked to this customer.")}</p>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <SnapshotField label={t("Storefront orders")}>{sf?.order_count ?? 0}</SnapshotField>
                      <SnapshotField label={t("Unpaid orders")}>{sf?.unpaid_order_count ?? 0}</SnapshotField>
                      <SnapshotField label={t("Paid total")}>
                        {formatMoney(sf?.lifetime_value_placeholder ?? 0, primaryCurrency)}
                      </SnapshotField>
                      <SnapshotField label={t("Customer code")}>{detail.customer_code}</SnapshotField>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {t("Open Customer details in the sidebar for the full read-only view.")}
              </p>
            </div>
          </CustomerSectionShell>
        );

      case "customer_details":
        return (
          <CustomerSectionShell
            title={t("Customer details")}
            description={t("Full profile, identifiers, and addresses.")}
            icon={ClipboardList}
            actions={customerDetailsActions}
          >
            <div className="space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                <SnapshotField label={t("Company name")}>{detail.company_name}</SnapshotField>
                <SnapshotField label={t("Customer code")}>{detail.customer_code}</SnapshotField>
                <SnapshotField label={t("Contact person")}>{detail.contact_person_name}</SnapshotField>
                <SnapshotField label={t("Email")}>{detail.contact_person_email}</SnapshotField>
                <SnapshotField label={t("Mobile")}>{formatPhoneDisplay(detail.contact_person_mobile, "—")}</SnapshotField>
                <SnapshotField label={t("Tax number")}>{detail.tax_number ?? "—"}</SnapshotField>
                <SnapshotField label={t("Payment terms")}>{detail.payment_terms ?? "—"}</SnapshotField>
                <SnapshotField label={t("Linked user")}>
                  {detail.user ? `${detail.user.name ?? "—"} (ID ${detail.user.id})` : "—"}
                </SnapshotField>
              </div>
              <Separator />
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4" />
                      {t("Billing address")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {formatAddress(detail.billing_address)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" />
                      {t("Shipping address")}
                    </CardTitle>
                    <CardDescription>{detail.same_as_billing ? t("Same as billing") : null}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {detail.same_as_billing ? formatAddress(detail.billing_address) : formatAddress(detail.shipping_address)}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CustomerSectionShell>
        );

      case "orders":
        return (
          <CustomerSectionShell
            title={t("Orders")}
            description={t("Recent ecommerce orders linked to this CRM customer.")}
            icon={ShoppingBag}
          >
            {!sf?.recent_orders?.length ? (
              <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {t("No storefront orders yet.")}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">{t("Order")}</th>
                      <th className="p-3 text-left font-medium">{t("Date")}</th>
                      <th className="p-3 text-left font-medium">{t("Status")}</th>
                      <th className="p-3 text-left font-medium">{t("Payment")}</th>
                      <th className="p-3 text-right font-medium">{t("Total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sf.recent_orders.map((o) => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="p-3 font-mono text-xs">{o.order_number}</td>
                        <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                        <td className="p-3">{o.status}</td>
                        <td className="p-3">{o.payment_status ?? "—"}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{formatMoney(o.total, o.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CustomerSectionShell>
        );

      case "invoices":
        return (
          <CustomerSectionShell
            title={t("Invoices")}
            description={t("Accounting invoices for this customer.")}
            icon={Receipt}
          >
            <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("Invoice history will appear here when linked to this customer.")}
            </div>
          </CustomerSectionShell>
        );

      case "payments":
        return (
          <CustomerSectionShell
            title={t("Payments")}
            description={t("Recorded customer payments.")}
            icon={Wallet}
          >
            <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("Payment records will appear here when available.")}
            </div>
          </CustomerSectionShell>
        );

      case "notes":
        return (
          <CustomerSectionShell
            title={t("Notes")}
            description={t("Internal notes on this customer record.")}
            icon={MessageSquare}
          >
            <p className="text-sm whitespace-pre-wrap text-foreground">{detail.notes?.trim() || t("No notes.")}</p>
          </CustomerSectionShell>
        );

      case "documents":
        return (
          <CustomerSectionShell
            title={t("Documents")}
            description={t("Files attached to this customer.")}
            icon={FileText}
          >
            <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("No documents uploaded yet.")}
            </div>
          </CustomerSectionShell>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="flex-shrink-0 md:w-64">
          <div className="md:sticky md:top-4">
            <div className="md:hidden -mx-1 px-1">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {CUSTOMER_SECTIONS.map((s) => (
                  <Button
                    key={s.id}
                    variant={active === s.id ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setActive(s.id)}
                  >
                    <s.icon className="mr-2 h-4 w-4" />
                    {t(s.titleKey)}
                  </Button>
                ))}
              </div>
            </div>

            <ScrollArea className="hidden h-[min(70vh,calc(100vh-8rem))] md:block">
              <div className="space-y-1 pr-4">
                {CUSTOMER_SECTIONS.map((s) => (
                  <Button
                    key={s.id}
                    variant="ghost"
                    className={cn("w-full justify-start", active === s.id && "bg-muted font-medium")}
                    onClick={() => setActive(s.id)}
                  >
                    <s.icon className="mr-2 h-4 w-4 shrink-0" />
                    {t(s.titleKey)}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="pt-0 md:pt-4">
            <section className="scroll-mt-6" aria-labelledby={`customer-section-${active}`}>
              <h2 id={`customer-section-${active}`} className="sr-only">
                {t(CUSTOMER_SECTIONS.find((x) => x.id === active)?.titleKey ?? "")}
              </h2>
              {renderSection()}
            </section>
          </div>
        </div>
      </div>

      {rowForForm ? (
        <AccountCustomerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={rowForForm}
          onSuccess={() => {
            setFormOpen(false);
            void reloadDetail();
          }}
        />
      ) : null}
    </>
  );
}
