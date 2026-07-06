"use client";

import * as React from "react";
import {
  Bell,
  CreditCard,
  FileText,
  Loader2,
  Save,
  Settings2,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_MARKETPLACE_ADMIN_SETTINGS,
  ORDER_WORKFLOW_KEYS,
  ORDER_WORKFLOW_LABELS,
  VENDOR_PERMISSION_MATRIX_KEYS,
  VENDOR_PERMISSION_MATRIX_LABELS,
  type MarketplaceAdminSettings,
} from "@/lib/marketplace-admin-settings";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


type TabId =
  | "configuration"
  | "vendorManagement"
  | "commissions"
  | "orders"
  | "delivery"
  | "customerExperience"
  | "payments"
  | "notifications"
  | "policies"
  | "advanced";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "configuration", label: "Marketplace Configuration", icon: Settings2 },
  { id: "vendorManagement", label: "Vendor Management", icon: Users },
  { id: "commissions", label: "Commissions", icon: CreditCard },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "customerExperience", label: "Customer Experience", icon: Store },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "policies", label: "Policies", icon: FileText },
  { id: "advanced", label: "Advanced", icon: Wrench },
];

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer font-medium">
          {label}
        </Label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function FieldGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
      {children}
    </div>
  );
}

export default function MarketplaceSettingsForm() {
  const [form, setForm] = React.useState<MarketplaceAdminSettings>(DEFAULT_MARKETPLACE_ADMIN_SETTINGS);
  const [activeTab, setActiveTab] = React.useState<TabId>("configuration");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/admin/settings", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (active && data?.ok && data.settings) {
          setForm({ ...DEFAULT_MARKETPLACE_ADMIN_SETTINGS, ...data.settings });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const patch = <K extends keyof MarketplaceAdminSettings>(
    section: K,
    patchValue: Partial<MarketplaceAdminSettings[K]>,
  ) => {
    setForm((f) => ({
      ...f,
      [section]: { ...f[section], ...patchValue },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/marketplace/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: form }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        toast.success("Marketplace settings saved");
        if (data.settings) setForm(data.settings as MarketplaceAdminSettings);
      } else {
        toast.error(data?.message ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "configuration":
        return (
          <FieldGroup>
            <div className="grid gap-2">
              <Label>{t("Marketplace Status")}</Label>
              <Select
                value={form.configuration.marketplaceStatus}
                onValueChange={(v) =>
                  patch("configuration", { marketplaceStatus: v as "active" | "disabled" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("Active")}</SelectItem>
                  <SelectItem value="disabled">{t("Disabled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("Marketplace Mode")}</Label>
              <Select
                value={form.configuration.marketplaceMode}
                onValueChange={(v) =>
                  patch("configuration", { marketplaceMode: v as "single_vendor" | "multi_vendor" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_vendor">{t("Single Vendor")}</SelectItem>
                  <SelectItem value="multi_vendor">{t("Multi Vendor")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow
              id="require-vendor-approval"
              label={t("Require Vendor Approval")}
              checked={form.configuration.requireVendorApproval}
              onCheckedChange={(v) => patch("configuration", { requireVendorApproval: v })}
            />
            <ToggleRow
              id="vendor-self-reg"
              label={t("Allow Vendor Self Registration")}
              checked={form.configuration.allowVendorSelfRegistration}
              onCheckedChange={(v) => patch("configuration", { allowVendorSelfRegistration: v })}
            />
            <div className="grid gap-2">
              <Label>{t("Default Vendor Status")}</Label>
              <Select
                value={form.configuration.defaultVendorStatus}
                onValueChange={(v) =>
                  patch("configuration", {
                    defaultVendorStatus: v as "pending" | "approved" | "suspended",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("Pending")}</SelectItem>
                  <SelectItem value="approved">{t("Approved")}</SelectItem>
                  <SelectItem value="suspended">{t("Suspended")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow
              id="vendor-imports"
              label={t("Allow Vendor Product Imports")}
              checked={form.configuration.allowVendorProductImports}
              onCheckedChange={(v) => patch("configuration", { allowVendorProductImports: v })}
            />
            <ToggleRow
              id="vendor-store-pages"
              label={t("Enable Vendor Store Pages")}
              checked={form.configuration.enableVendorStorePages}
              onCheckedChange={(v) => patch("configuration", { enableVendorStorePages: v })}
            />
          </FieldGroup>
        );

      case "vendorManagement":
        return (
          <FieldGroup>
            <ToggleRow
              id="commission-override"
              label={t("Default Vendor Commission Override")}
              checked={form.vendorManagement.defaultVendorCommissionOverride}
              onCheckedChange={(v) => patch("vendorManagement", { defaultVendorCommissionOverride: v })}
            />
            <ToggleRow
              id="vendor-staff"
              label={t("Allow Vendors To Manage Staff")}
              checked={form.vendorManagement.allowVendorsToManageStaff}
              onCheckedChange={(v) => patch("vendorManagement", { allowVendorsToManageStaff: v })}
            />
            <ToggleRow
              id="vendor-coupons"
              label={t("Allow Vendors To Create Coupons")}
              checked={form.vendorManagement.allowVendorsToCreateCoupons}
              onCheckedChange={(v) => patch("vendorManagement", { allowVendorsToCreateCoupons: v })}
            />
            <ToggleRow
              id="vendor-refunds"
              label={t("Allow Vendors To Issue Refunds")}
              checked={form.vendorManagement.allowVendorsToIssueRefunds}
              onCheckedChange={(v) => patch("vendorManagement", { allowVendorsToIssueRefunds: v })}
            />
            <ToggleRow
              id="product-approval"
              label={t("Vendor Product Approval Required")}
              checked={form.vendorManagement.vendorProductApprovalRequired}
              onCheckedChange={(v) => patch("vendorManagement", { vendorProductApprovalRequired: v })}
            />
            <ToggleRow
              id="edit-approval"
              label={t("Vendor Product Edit Approval Required")}
              checked={form.vendorManagement.vendorProductEditApprovalRequired}
              onCheckedChange={(v) => patch("vendorManagement", { vendorProductEditApprovalRequired: v })}
            />
            <Separator />
            <FieldGroup title={t("Vendor Permissions Matrix")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {VENDOR_PERMISSION_MATRIX_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(form.vendorManagement.permissionsMatrix[key])}
                      onCheckedChange={(v) =>
                        patch("vendorManagement", {
                          permissionsMatrix: {
                            ...form.vendorManagement.permissionsMatrix,
                            [key]: Boolean(v),
                          },
                        })
                      }
                    />
                    <span>{VENDOR_PERMISSION_MATRIX_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </FieldGroup>
          </FieldGroup>
        );

      case "commissions":
        return (
          <FieldGroup>
            <div className="grid gap-2">
              <Label>{t("Default Commission Type")}</Label>
              <Select
                value={form.commissions.defaultCommissionType}
                onValueChange={(v) =>
                  patch("commissions", { defaultCommissionType: v as "percentage" | "fixed" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("Percentage")}</SelectItem>
                  <SelectItem value="fixed">{t("Fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commission-value">{t("Default Commission Value")}</Label>
              <Input
                id="commission-value"
                type="number"
                min={0}
                step={0.01}
                value={form.commissions.defaultCommissionValue}
                onChange={(e) => patch("commissions", { defaultCommissionValue: e.target.value })}
              />
            </div>
            <ToggleRow
              id="tiered-commission"
              label={t("Enable Tiered Commission")}
              checked={form.commissions.enableTieredCommission}
              onCheckedChange={(v) => patch("commissions", { enableTieredCommission: v })}
            />
            {form.commissions.enableTieredCommission ? (
              <div className="space-y-4 rounded-lg border p-4">
                <p className="text-sm font-medium">{t("Tier Settings")}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t("Orders 1–100")}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t("Rate %")}
                      value={form.commissions.tier1Rate}
                      onChange={(e) => patch("commissions", { tier1Rate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Orders 101–500")}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t("Rate %")}
                      value={form.commissions.tier2Rate}
                      onChange={(e) => patch("commissions", { tier2Rate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Orders 500+")}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t("Rate %")}
                      value={form.commissions.tier3Rate}
                      onChange={(e) => patch("commissions", { tier3Rate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="min-payout">{t("Minimum Vendor Payout")}</Label>
              <Input
                id="min-payout"
                type="number"
                min={0}
                step={0.01}
                value={form.commissions.minimumVendorPayout}
                onChange={(e) => patch("commissions", { minimumVendorPayout: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("Payout Frequency")}</Label>
              <Select
                value={form.commissions.payoutFrequency}
                onValueChange={(v) =>
                  patch("commissions", {
                    payoutFrequency: v as "daily" | "weekly" | "biweekly" | "monthly",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("Daily")}</SelectItem>
                  <SelectItem value="weekly">{t("Weekly")}</SelectItem>
                  <SelectItem value="biweekly">{t("Biweekly")}</SelectItem>
                  <SelectItem value="monthly">{t("Monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FieldGroup>
        );

      case "orders":
        return (
          <FieldGroup>
            <div className="grid gap-2">
              <Label htmlFor="order-prefix">{t("Order Prefix")}</Label>
              <Input
                id="order-prefix"
                value={form.orders.orderPrefix}
                onChange={(e) => patch("orders", { orderPrefix: e.target.value })}
              />
            </div>
            <ToggleRow
              id="auto-accept"
              label={t("Auto Accept Orders")}
              checked={form.orders.autoAcceptOrders}
              onCheckedChange={(v) => patch("orders", { autoAcceptOrders: v })}
            />
            <ToggleRow
              id="vendor-accept"
              label={t("Vendor Must Accept Orders")}
              checked={form.orders.vendorMustAcceptOrders}
              onCheckedChange={(v) => patch("orders", { vendorMustAcceptOrders: v })}
            />
            <div className="grid gap-2">
              <Label htmlFor="cancel-window">{t("Order Cancellation Window (hours)")}</Label>
              <Input
                id="cancel-window"
                type="number"
                min={0}
                value={form.orders.orderCancellationWindowHours}
                onChange={(e) => patch("orders", { orderCancellationWindowHours: e.target.value })}
              />
            </div>
            <ToggleRow
              id="customer-cancel"
              label={t("Allow Customer Cancellations")}
              checked={form.orders.allowCustomerCancellations}
              onCheckedChange={(v) => patch("orders", { allowCustomerCancellations: v })}
            />
            <ToggleRow
              id="vendor-cancel"
              label={t("Allow Vendor Cancellations")}
              checked={form.orders.allowVendorCancellations}
              onCheckedChange={(v) => patch("orders", { allowVendorCancellations: v })}
            />
            <ToggleRow
              id="refund-approval"
              label={t("Refund Approval Required")}
              checked={form.orders.refundApprovalRequired}
              onCheckedChange={(v) => patch("orders", { refundApprovalRequired: v })}
            />
            <Separator />
            <FieldGroup title={t("Order Status Workflow")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {ORDER_WORKFLOW_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(form.orders.orderStatusWorkflow[key])}
                      onCheckedChange={(v) =>
                        patch("orders", {
                          orderStatusWorkflow: {
                            ...form.orders.orderStatusWorkflow,
                            [key]: Boolean(v),
                          },
                        })
                      }
                    />
                    <span>{ORDER_WORKFLOW_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </FieldGroup>
          </FieldGroup>
        );

      case "delivery":
        return (
          <FieldGroup>
            <ToggleRow
              id="delivery-queue"
              label={t("Enable Delivery Queue")}
              checked={form.delivery.enableDeliveryQueue}
              onCheckedChange={(v) => patch("delivery", { enableDeliveryQueue: v })}
            />
            <ToggleRow
              id="delivery-events"
              label={t("Enable Delivery Events")}
              checked={form.delivery.enableDeliveryEvents}
              onCheckedChange={(v) => patch("delivery", { enableDeliveryEvents: v })}
            />
            <ToggleRow
              id="delivery-map"
              label={t("Enable Delivery Map")}
              checked={form.delivery.enableDeliveryMap}
              onCheckedChange={(v) => patch("delivery", { enableDeliveryMap: v })}
            />
            <ToggleRow
              id="route-opt"
              label={t("Enable Route Optimization")}
              checked={form.delivery.enableRouteOptimization}
              onCheckedChange={(v) => patch("delivery", { enableRouteOptimization: v })}
            />
            <div className="grid gap-2">
              <Label>{t("Delivery Assignment Mode")}</Label>
              <Select
                value={form.delivery.deliveryAssignmentMode}
                onValueChange={(v) =>
                  patch("delivery", { deliveryAssignmentMode: v as "manual" | "auto" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t("Manual")}</SelectItem>
                  <SelectItem value="auto">{t("Auto")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delivery-radius">{t("Maximum Delivery Radius (miles)")}</Label>
              <Input
                id="delivery-radius"
                type="number"
                min={0}
                value={form.delivery.maximumDeliveryRadiusMiles}
                onChange={(e) => patch("delivery", { maximumDeliveryRadiusMiles: e.target.value })}
              />
            </div>
            <ToggleRow
              id="driver-assign"
              label={t("Driver Assignment Required")}
              checked={form.delivery.driverAssignmentRequired}
              onCheckedChange={(v) => patch("delivery", { driverAssignmentRequired: v })}
            />
            <ToggleRow
              id="driver-notify"
              label={t("Driver Notification Enabled")}
              checked={form.delivery.driverNotificationEnabled}
              onCheckedChange={(v) => patch("delivery", { driverNotificationEnabled: v })}
            />
          </FieldGroup>
        );

      case "customerExperience":
        return (
          <FieldGroup>
            <ToggleRow
              id="product-reviews"
              label={t("Enable Product Reviews")}
              checked={form.customerExperience.enableProductReviews}
              onCheckedChange={(v) => patch("customerExperience", { enableProductReviews: v })}
            />
            <ToggleRow
              id="vendor-reviews"
              label={t("Enable Vendor Reviews")}
              checked={form.customerExperience.enableVendorReviews}
              onCheckedChange={(v) => patch("customerExperience", { enableVendorReviews: v })}
            />
            <ToggleRow
              id="wishlist"
              label={t("Enable Wishlist")}
              checked={form.customerExperience.enableWishlist}
              onCheckedChange={(v) => patch("customerExperience", { enableWishlist: v })}
            />
            <ToggleRow
              id="coupons"
              label={t("Enable Coupons")}
              checked={form.customerExperience.enableCoupons}
              onCheckedChange={(v) => patch("customerExperience", { enableCoupons: v })}
            />
            <ToggleRow
              id="promotions"
              label={t("Enable Promotions")}
              checked={form.customerExperience.enablePromotions}
              onCheckedChange={(v) => patch("customerExperience", { enablePromotions: v })}
            />
            <ToggleRow
              id="related"
              label={t("Enable Related Products")}
              checked={form.customerExperience.enableRelatedProducts}
              onCheckedChange={(v) => patch("customerExperience", { enableRelatedProducts: v })}
            />
            <ToggleRow
              id="recommended"
              label={t("Enable Recommended Products")}
              checked={form.customerExperience.enableRecommendedProducts}
              onCheckedChange={(v) => patch("customerExperience", { enableRecommendedProducts: v })}
            />
            <ToggleRow
              id="messaging"
              label={t("Enable Customer Messaging")}
              checked={form.customerExperience.enableCustomerMessaging}
              onCheckedChange={(v) => patch("customerExperience", { enableCustomerMessaging: v })}
            />
          </FieldGroup>
        );

      case "payments":
        return (
          <FieldGroup>
            <div className="grid gap-2">
              <Label>{t("Commission Collection Method")}</Label>
              <Select
                value={form.payments.commissionCollectionMethod}
                onValueChange={(v) =>
                  patch("payments", {
                    commissionCollectionMethod: v as "at_checkout" | "at_payout",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="at_checkout">{t("At Checkout")}</SelectItem>
                  <SelectItem value="at_payout">{t("At Payout")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hold-period">{t("Vendor Payout Hold Period (days)")}</Label>
              <Input
                id="hold-period"
                type="number"
                min={0}
                value={form.payments.vendorPayoutHoldPeriodDays}
                onChange={(e) => patch("payments", { vendorPayoutHoldPeriodDays: e.target.value })}
              />
            </div>
            <ToggleRow
              id="auto-payouts"
              label={t("Automatic Vendor Payouts")}
              checked={form.payments.automaticVendorPayouts}
              onCheckedChange={(v) => patch("payments", { automaticVendorPayouts: v })}
            />
            <ToggleRow
              id="split-payments"
              label={t("Split Payments Enabled")}
              checked={form.payments.splitPaymentsEnabled}
              onCheckedChange={(v) => patch("payments", { splitPaymentsEnabled: v })}
            />
            <ToggleRow
              id="wallet"
              label={t("Vendor Wallet System")}
              checked={form.payments.vendorWalletSystem}
              onCheckedChange={(v) => patch("payments", { vendorWalletSystem: v })}
            />
          </FieldGroup>
        );

      case "notifications":
        return (
          <FieldGroup>
            <ToggleRow
              id="notify-vendor-order"
              label={t("Vendor New Order Notification")}
              checked={form.notifications.vendorNewOrder}
              onCheckedChange={(v) => patch("notifications", { vendorNewOrder: v })}
            />
            <ToggleRow
              id="notify-customer-order"
              label={t("Customer Order Confirmation")}
              checked={form.notifications.customerOrderConfirmation}
              onCheckedChange={(v) => patch("notifications", { customerOrderConfirmation: v })}
            />
            <ToggleRow
              id="notify-delivery"
              label={t("Delivery Notifications")}
              checked={form.notifications.deliveryNotifications}
              onCheckedChange={(v) => patch("notifications", { deliveryNotifications: v })}
            />
            <ToggleRow
              id="notify-payout"
              label={t("Vendor Payout Notifications")}
              checked={form.notifications.vendorPayoutNotifications}
              onCheckedChange={(v) => patch("notifications", { vendorPayoutNotifications: v })}
            />
            <ToggleRow
              id="notify-refund"
              label={t("Refund Notifications")}
              checked={form.notifications.refundNotifications}
              onCheckedChange={(v) => patch("notifications", { refundNotifications: v })}
            />
            <Separator />
            <FieldGroup title={t("Notification Channels")}>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["email", "sms", "push"] as const).map((ch) => (
                  <label key={ch} className="flex cursor-pointer items-center gap-2 text-sm capitalize">
                    <Checkbox
                      checked={form.notifications.channels[ch]}
                      onCheckedChange={(v) =>
                        patch("notifications", {
                          channels: { ...form.notifications.channels, [ch]: Boolean(v) },
                        })
                      }
                    />
                    <span>{ch === "sms" ? "SMS" : ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
                  </label>
                ))}
              </div>
            </FieldGroup>
          </FieldGroup>
        );

      case "policies":
        return (
          <FieldGroup>
            <div className="grid gap-2">
              <Label htmlFor="vendor-agreement">{t("Vendor Agreement")}</Label>
              <Textarea
                id="vendor-agreement"
                rows={5}
                value={form.policies.vendorAgreement}
                onChange={(e) => patch("policies", { vendorAgreement: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="marketplace-terms">{t("Marketplace Terms")}</Label>
              <Textarea
                id="marketplace-terms"
                rows={5}
                value={form.policies.marketplaceTerms}
                onChange={(e) => patch("policies", { marketplaceTerms: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-rules">{t("Vendor Refund Rules")}</Label>
              <Textarea
                id="refund-rules"
                rows={4}
                value={form.policies.vendorRefundRules}
                onChange={(e) => patch("policies", { vendorRefundRules: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cancel-rules">{t("Vendor Cancellation Rules")}</Label>
              <Textarea
                id="cancel-rules"
                rows={4}
                value={form.policies.vendorCancellationRules}
                onChange={(e) => patch("policies", { vendorCancellationRules: e.target.value })}
              />
            </div>
          </FieldGroup>
        );

      case "advanced":
        return (
          <FieldGroup>
            <ToggleRow
              id="api-access"
              label={t("Marketplace API Access")}
              checked={form.advanced.marketplaceApiAccess}
              onCheckedChange={(v) => patch("advanced", { marketplaceApiAccess: v })}
            />
            <ToggleRow
              id="vendor-api"
              label={t("Vendor API Access")}
              checked={form.advanced.vendorApiAccess}
              onCheckedChange={(v) => patch("advanced", { vendorApiAccess: v })}
            />
            <div className="grid gap-2">
              <Label htmlFor="webhook">{t("Webhook URL")}</Label>
              <Input
                id="webhook"
                type="url"
                placeholder="https://"
                value={form.advanced.webhookUrl}
                onChange={(e) => patch("advanced", { webhookUrl: e.target.value })}
              />
            </div>
            <ToggleRow
              id="analytics"
              label={t("Marketplace Analytics")}
              checked={form.advanced.marketplaceAnalytics}
              onCheckedChange={(v) => patch("advanced", { marketplaceAnalytics: v })}
            />
            <ToggleRow
              id="audit-log"
              label={t("Audit Logging")}
              description={t("Track marketplace configuration changes.")}
              checked={form.advanced.auditLogging}
              onCheckedChange={(v) => patch("advanced", { auditLogging: v })}
            />
            <ToggleRow
              id="activity-tracking"
              label={t("Vendor Activity Tracking")}
              checked={form.advanced.vendorActivityTracking}
              onCheckedChange={(v) => patch("advanced", { vendorActivityTracking: v })}
            />
          </FieldGroup>
        );

      default:
        return null;
    }
  };

  const activeMeta = TABS.find((tab) => tab.id === activeTab)!;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative pb-20">
      <p className="mb-6 text-sm text-muted-foreground">
        {t("Manage marketplace operational settings. Global branding, email, and system settings are configured in Super Admin Settings.")}
      </p>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="lg:sticky lg:top-4">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="mr-1.5 h-3.5 w-3.5" />
                  {tab.label}
                </Button>
              ))}
            </div>
            <ScrollArea className="hidden lg:block h-[min(70vh,calc(100vh-10rem))]">
              <div className="space-y-1 pr-3">
                {TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-start whitespace-normal py-2.5 text-left",
                      activeTab === tab.id && "bg-muted font-medium",
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <tab.icon className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-sm leading-snug">{tab.label}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <activeMeta.icon className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{activeMeta.label}</CardTitle>
                  <CardDescription>
                    {t("Configure marketplace behavior for this section.")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">{renderTab()}</CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-20">
        <Button size="lg" className="gap-2 shadow-lg" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("Save changes")}
        </Button>
      </div>
    </div>
  );
}
