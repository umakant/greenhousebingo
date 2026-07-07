"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Building,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  Cookie,
  Database,
  Download,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  FormInput,
  Globe,
  GraduationCap,
  HardDrive,
  Image as ImageLibraryIcon,
  Languages,
  Layout,
  Mail,
  Map,
  MessageCircle,
  Moon,
  Package,
  Palette,
  Plus,
  Radio,
  Receipt,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Send,
  Settings as SettingsIcon,
  Shield,
  SidebarIcon,
  Smartphone,
  Trash2,
  Upload,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const ProjectsBoardLazy = dynamic(
  () => import("@/components/projects/projects-board"),
  { loading: () => <div className="py-6 text-sm text-muted-foreground">Loading project roadmap…</div> },
);

const FormBuilderAdminLazy = dynamic(
  () => import("@/components/form-builder/form-builder-admin"),
  { loading: () => <div className="py-6 text-sm text-muted-foreground">Loading form builder…</div> },
);

const SubscriptionSettingLazy = dynamic(
  () => import("@/components/plans/subscription-setting"),
  { loading: () => <div className="py-6 text-sm text-muted-foreground">Loading subscription plans…</div> },
);

const UserManagementUsersLazy = dynamic(
  () => import("@/components/user-management/user-management-users"),
  { loading: () => <div className="py-6 text-sm text-muted-foreground">Loading users…</div> },
);

const UserManagementRolesLazy = dynamic(
  () => import("@/components/user-management/user-management-roles"),
  { loading: () => <div className="py-6 text-sm text-muted-foreground">Loading roles…</div> },
);

const MediaLibraryPageLazy = dynamic(
  () => import("@/components/media/media-library-page"),
  { loading: () => <div className="py-6 text-sm text-muted-foreground">Loading media library…</div> },
);

const AppointmentSystemSetupLazy = dynamic(
  () => import("@/components/appointment/appointment-setup-admin"),
  { loading: () => <div className="py-6 text-sm text-muted-foreground">Loading appointment setup…</div> },
);

import { EmailOtpVerifiedSection } from "@/components/settings/email-otp-verified-section";
import { CompanyWebsiteThemeSettingsSection } from "@/components/settings/company-website-theme-settings-section";
import { TwilioSmsSettingsSection } from "@/components/settings/twilio-sms-settings-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";
import { hasPermission } from "@/lib/authz";
import MediaPicker from "@/components/MediaPicker";
import { LmsOrgSettingsSection } from "@/components/settings/lms-org-settings-section";
import { StorefrontSettingsSection } from "@/components/settings/storefront-settings-section";
import { ThemePreview } from "@/components/settings/theme-preview";
import { DatabaseBackupSection } from "@/components/settings/database-backup-section";
import { EmployeePayoutSettingsSection } from "@/components/settings/employee-payout-settings-section";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { getImagePath } from "@/utils/image-path";
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";
import { companyWebsiteDnsTargetForDisplay, normalizeWebsiteUrl } from "@/lib/website-url";
import { brandTextDefaultsFromCompanyName } from "@/lib/brand-text-defaults";
import {
  brandLogoImageStyle,
  brandLogoPreviewBoxStyle,
  DEFAULT_BRAND_LOGO_HEIGHT,
  DEFAULT_BRAND_LOGO_WIDTH,
  resolveBrandLogoHeight,
  resolveBrandLogoPosition,
  resolveBrandLogoWidth,
  syncBrandLogoDimensions,
} from "@/lib/brand-logo-size";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import type {
  CurrencyForClient,
  EmailProvidersMap,
  LanguageRow,
  NotificationForClient,
  TenantBillingPanelPageData,
} from "@/lib/settings-page-data";
import { isDefaultEnabledLanguage } from "@/lib/language-catalog";
import type { UserSubscriptionInfo } from "@/components/plans/subscription-setting";
import { CompanyBillingPaymentMethodsCard } from "@/components/companies/company-billing-payment-methods-card";
import { CompanyBillingPlanPanel } from "@/components/companies/company-billing-plan-panel";
import {
  parseAccountPaymentTermsOptions,
  serializeAccountPaymentTermsOptions,
} from "@/lib/account-payment-terms";
import { normalizeCurrencySymbolPosition, normalizeCurrencySymbolSpace } from "@/lib/format-currency";

type User = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
};

type Props = {
  /** From server cookies (pf_role / pf_roles); company & impersonated sessions are false. */
  isSuperAdmin: boolean;
  user: User;
  /** Settings sidebar tab from `?tab=` (e.g. launchpad Email delivery → email). */
  initialTab?: string;
  /** Sub-tab under Payment Settings (`?payment=stripe|paypal|bank-transfer`). */
  initialPaymentSubTab?: string;
  pageData: {
    settings: Record<string, string>;
    currencies: CurrencyForClient[];
    notifications: Record<string, NotificationForClient[]>;
    emailProviders: EmailProvidersMap;
    availableLanguages: LanguageRow[];
    cacheSize: string;
    userSubscriptionInfo: UserSubscriptionInfo | null;
    companyBilling: TenantBillingPanelPageData | null;
    mailUsesPlatformDefaults: boolean;
    brandUsesPlatformDefaults: boolean;
    currentUserPhone: string;
  };
};

type SectionId =
  | "brand"
  | "company-website-theme"
  | "system"
  | "system-setup"
  | "company"
  | "payment-terms"
  | "payment-settings"
  | "media-library"
  | "currency"
  | "cookie"
  | "pusher"
  | "seo"
  | "cache"
  | "storage"
  | "email"
  | "email-notifications"
  | "subscription-plans"
  | "whatsapp-api"
  | "twilio-sms"
  | "database-backup"
  | "user-management"
  | "form-builder"
  | "project-roadmap"
  | "employee-payout"
  | "bank-transfer"
  | "stripe"
  | "paypal"
  | "recurring-invoice"
  | "storefront"
  | "lms";

const VALID_SECTION_IDS = new Set<SectionId>([
  "brand",
  "company-website-theme",
  "system",
  "system-setup",
  "company",
  "payment-terms",
  "payment-settings",
  "media-library",
  "currency",
  "cookie",
  "pusher",
  "seo",
  "cache",
  "storage",
  "email",
  "email-notifications",
  "subscription-plans",
  "whatsapp-api",
  "twilio-sms",
  "database-backup",
  "user-management",
  "form-builder",
  "project-roadmap",
  "employee-payout",
  "bank-transfer",
  "stripe",
  "paypal",
  "recurring-invoice",
  "storefront",
  "lms",
]);

const SETTINGS_TAB_ALIASES: Record<string, SectionId> = {
  "email-delivery": "email",
  email_delivery: "email",
  payment: "payment-settings",
  payment_setup: "payment-settings",
  whatsapp: "whatsapp-api",
  whatsapp_setup: "whatsapp-api",
  whatsapp_api: "whatsapp-api",
  twilio: "twilio-sms",
  twilio_sms: "twilio-sms",
  "twilio-sms": "twilio-sms",
  "project-roadmap": "project-roadmap",
  project_roadmap: "project-roadmap",
  "company-website": "company-website-theme",
  company_website_theme: "company-website-theme",
};

const PAYMENT_GATEWAY_TABS = ["stripe", "paypal", "bank-transfer"] as const;
type PaymentGatewayTab = (typeof PAYMENT_GATEWAY_TABS)[number];

function isPaymentGatewayTab(v: string | null | undefined): v is PaymentGatewayTab {
  return PAYMENT_GATEWAY_TABS.includes(v as PaymentGatewayTab);
}

function resolvePaymentGatewaySubTab(tab?: string | null, payment?: string | null): PaymentGatewayTab {
  if (isPaymentGatewayTab(payment)) return payment;
  if (isPaymentGatewayTab(tab)) return tab;
  return "stripe";
}

function resolveSettingsTabParam(tab: string | null | undefined): SectionId | null {
  if (!tab?.trim()) return null;
  const normalized = tab.trim().toLowerCase();
  const aliased = SETTINGS_TAB_ALIASES[normalized] ?? normalized;
  if (VALID_SECTION_IDS.has(aliased as SectionId)) return aliased as SectionId;
  return null;
}

type SectionDef = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  viewPermission: string;
  writePermission: string;
  /** Order for sidebar (matches Laravel superadmin-setting.ts) */
  order: number;
};

const NAVY_LEFT = "#0f172a";
const NAVY_FORM = "#1e293b";
/** Matches recommended brand logo dimensions (220×65). */
const BRAND_LOGO_PREVIEW_BOX = "flex w-full items-center rounded-md border p-3";
const BRAND_LOGO_PREVIEW_IMG = "w-full object-contain object-left";
const BRAND_LOGO_UPLOAD_PREVIEW_BOX_STYLE = brandLogoPreviewBoxStyle(
  String(DEFAULT_BRAND_LOGO_WIDTH),
  String(DEFAULT_BRAND_LOGO_HEIGHT),
);
const BRAND_LOGO_UPLOAD_PREVIEW_IMG_STYLE = brandLogoImageStyle(
  String(DEFAULT_BRAND_LOGO_WIDTH),
  String(DEFAULT_BRAND_LOGO_HEIGHT),
);

const SECTIONS: SectionDef[] = [
  { id: "brand", title: "Brand Settings", icon: Palette, viewPermission: "manage-brand-settings", writePermission: "edit-brand-settings", order: 10 },
  {
    id: "company-website-theme",
    title: "Company Website Theme",
    icon: Globe,
    viewPermission: "manage-brand-settings",
    writePermission: "edit-brand-settings",
    order: 15,
  },
  { id: "system", title: "System Settings", icon: SettingsIcon, viewPermission: "manage-system-settings", writePermission: "edit-system-settings", order: 20 },
  {
    id: "system-setup",
    title: "System Setup",
    icon: CalendarClock,
    viewPermission: "manage-appointment",
    writePermission: "manage-appointment",
    order: 21,
  },
  { id: "company", title: "Company Settings", icon: Building, viewPermission: "manage-company-settings", writePermission: "edit-company-settings", order: 25 },
  {
    id: "payment-terms",
    title: "Payment terms",
    icon: Receipt,
    viewPermission: "manage-company-settings",
    writePermission: "edit-company-settings",
    order: 26,
  },
  {
    id: "payment-settings",
    title: "Payment Settings",
    icon: CreditCard,
    viewPermission: "manage-settings",
    writePermission: "edit-settings",
    order: 265,
  },
  {
    id: "media-library",
    title: "Media Library",
    icon: ImageLibraryIcon,
    viewPermission: "manage-media",
    writePermission: "manage-media",
    order: 27,
  },
  { id: "currency", title: "Currency Settings", icon: DollarSign, viewPermission: "manage-currency-settings", writePermission: "edit-currency-settings", order: 30 },
  { id: "cookie", title: "Cookie Settings", icon: Cookie, viewPermission: "manage-cookie-settings", writePermission: "edit-cookie-settings", order: 40 },
  { id: "pusher", title: "Pusher Settings", icon: Radio, viewPermission: "manage-pusher-settings", writePermission: "edit-pusher-settings", order: 50 },
  { id: "seo", title: "SEO Settings", icon: Search, viewPermission: "manage-seo-settings", writePermission: "edit-seo-settings", order: 60 },
  { id: "cache", title: "Cache Settings", icon: HardDrive, viewPermission: "manage-cache-settings", writePermission: "clear-cache", order: 70 },
  { id: "storage", title: "Storage Settings", icon: HardDrive, viewPermission: "manage-storage-settings", writePermission: "edit-storage-settings", order: 80 },
  {
    id: "recurring-invoice",
    title: "Recurring Invoice Settings",
    icon: RefreshCw,
    viewPermission: "manage-recurring-invoice-bill",
    writePermission: "manage-recurring-invoice-bill",
    order: 1010,
  },
  { id: "email", title: "Email Settings", icon: Mail, viewPermission: "manage-email-settings", writePermission: "edit-email-settings", order: 500 },
  {
    id: "email-notifications",
    title: "Email Notification Settings",
    icon: Mail,
    viewPermission: "manage-email-notification-settings",
    writePermission: "manage-email-notification-settings",
    order: 510,
  },
  {
    id: "subscription-plans",
    title: "Subscription Plans",
    icon: Package,
    viewPermission: "manage-plans",
    writePermission: "manage-plans",
    order: 512,
  },
  {
    id: "whatsapp-api",
    title: "WhatsApp API Settings",
    icon: MessageCircle,
    viewPermission: "manage-whatsapp-settings",
    writePermission: "manage-whatsapp-settings",
    order: 515,
  },
  {
    id: "twilio-sms",
    title: "Twilio SMS Settings",
    icon: Smartphone,
    viewPermission: "manage-system-settings",
    writePermission: "edit-system-settings",
    order: 516,
  },
  {
    id: "database-backup",
    title: "Database Backup",
    icon: Database,
    /** Gated in UI/API by superadmin role, not company permissions. */
    viewPermission: "manage-system-settings",
    writePermission: "edit-system-settings",
    /** Right below Twilio SMS in the sidebar (superadmin only). */
    order: 517,
  },
  {
    id: "user-management",
    title: "User Management",
    icon: Users,
    viewPermission: "manage-user",
    writePermission: "manage-user",
    order: 520,
  },
  {
    id: "form-builder",
    title: "Form Builder",
    icon: FormInput,
    viewPermission: "view-formbuilder-form",
    writePermission: "manage-formbuilder",
    order: 525,
  },
  {
    id: "project-roadmap",
    title: "Project Roadmap",
    icon: Map,
    viewPermission: "manage-project",
    writePermission: "manage-project",
    order: 526,
  },
  {
    id: "employee-payout",
    title: "Employee Payout",
    icon: Wallet,
    viewPermission: "manage-project",
    writePermission: "manage-project",
    order: 527,
  },
  {
    id: "bank-transfer",
    title: "Bank Transfer Settings",
    icon: CreditCard,
    viewPermission: "manage-bank-transfer-settings",
    writePermission: "edit-bank-transfer-settings",
    order: 1000,
  },
  { id: "stripe", title: "Stripe Settings", icon: CreditCard, viewPermission: "manage-stripe-settings", writePermission: "edit-stripe-settings", order: 1020 },
  { id: "paypal", title: "PayPal Settings", icon: CreditCard, viewPermission: "manage-paypal-settings", writePermission: "edit-paypal-settings", order: 1030 },
  {
    id: "storefront",
    title: "Storefront",
    icon: ShoppingBag,
    viewPermission: "storefront.settings.manage",
    writePermission: "storefront.settings.manage",
    order: 517,
  },
  {
    id: "lms",
    title: "LMS",
    icon: GraduationCap,
    viewPermission: "manage-lms-settings",
    writePermission: "manage-lms-settings",
    order: 518,
  },
];

function can(perms: string[], required: string) {
  return perms.includes("*") || hasPermission(perms, required);
}

function canAccessMediaLibrary(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-media") ||
    hasPermission(perms, "create-media") ||
    hasPermission(perms, "delete-media") ||
    hasPermission(perms, "manage-media-directories") ||
    hasPermission(perms, "create-media-directories")
  );
}

function canAccessSubscriptionPlans(perms: string[], roles: string[] = []): boolean {
  if (perms.includes("*")) return true;
  if (
    hasPermission(perms, "manage-plans") ||
    hasPermission(perms, "view-plans") ||
    hasPermission(perms, "manage-settings") ||
    hasPermission(perms, "edit-settings")
  ) {
    return true;
  }
  return (roles ?? []).some((r) => r === "company" || r === "company_admin" || r === "staff");
}

function canAccessFormBuilder(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "view-formbuilder-form") ||
    hasPermission(perms, "manage-formbuilder") ||
    hasPermission(perms, "create-formbuilder")
  );
}

function canAccessProjectRoadmap(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return hasPermission(perms, "manage-project");
}

function canAccessPaymentSettings(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-settings") ||
    hasPermission(perms, "edit-settings") ||
    hasPermission(perms, "manage-stripe-settings") ||
    hasPermission(perms, "edit-stripe-settings") ||
    hasPermission(perms, "manage-paypal-settings") ||
    hasPermission(perms, "edit-paypal-settings") ||
    hasPermission(perms, "manage-bank-transfer-settings") ||
    hasPermission(perms, "edit-bank-transfer-settings")
  );
}

function canEditPaymentGateway(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "edit-settings") ||
    hasPermission(perms, "manage-settings") ||
    hasPermission(perms, "edit-stripe-settings") ||
    hasPermission(perms, "edit-paypal-settings") ||
    hasPermission(perms, "edit-bank-transfer-settings")
  );
}

function canAccessStorefrontSettings(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "storefront.settings.manage") ||
    hasPermission(perms, "manage-storefront-settings") ||
    hasPermission(perms, "manage-storefront")
  );
}

function canAccessLmsOrgSettings(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return hasPermission(perms, "manage-lms-settings") || hasPermission(perms, "manage-lms");
}

/** Appointment module: business hours + booking options (same UI as /appointment/setup). */
function canAccessAppointmentSystemSetup(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-appointment") ||
    hasPermission(perms, "manage-appointment-hours") ||
    hasPermission(perms, "manage-appointment-settings")
  );
}

async function postSettings(section: SectionId, settings: Record<string, unknown>) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ section, settings }),
  });
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || "Failed to save settings.");
  }
}

function SectionShell({
  title,
  description,
  icon: Icon,
  canEdit,
  onSave,
  saving,
  saveLabel = "Save Changes",
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  canEdit: boolean;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" />
            {t(title)}
          </CardTitle>
          {description ? <CardDescription className="mt-1">{t(description)}</CardDescription> : null}
        </div>
        {actions ? (
          actions
        ) : canEdit ? (
          <Button onClick={onSave} disabled={saving} size="sm" className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? t("Saving...") : t(saveLabel)}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const getCountryFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

function titleCase(s: string) {
  return t(s);
}

export default function SettingsPage({ isSuperAdmin, user, pageData, initialTab, initialPaymentSubTab }: Props) {
  const initialSettings = pageData.settings;
  const perms = user.permissions ?? [];
  const rawRequestedTab = resolveSettingsTabParam(initialTab);
  const paymentSubFromTab =
    !isSuperAdmin && rawRequestedTab && isPaymentGatewayTab(rawRequestedTab) ? rawRequestedTab : null;
  const resolvedActiveTab: SectionId = paymentSubFromTab ? "payment-settings" : (rawRequestedTab ?? "brand");
  const [active, setActive] = React.useState<SectionId>(resolvedActiveTab);
  const [paymentSubTab, setPaymentSubTab] = React.useState<PaymentGatewayTab>(
    resolvePaymentGatewaySubTab(paymentSubFromTab ?? initialTab, initialPaymentSubTab),
  );
  const [flash, setFlash] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const visible = React.useMemo(() => {
    // Laravel: each section gated by its view permission (company-setting.ts / superadmin-setting.ts).
    const activatedLower = (user.activatedPackages ?? []).map((p) => String(p).toLowerCase());
    const base = SECTIONS.filter((s) => {
      // Database Backup: superadmin-only tab (not on company / tenant "admin" settings).
      if (s.id === "database-backup" && !isSuperAdmin) return false;
      if (s.id === "twilio-sms" && !isSuperAdmin) return false;
      if (s.id === "storefront") {
        if (!activatedLower.includes("storefront")) return false;
        return perms.includes("*") || canAccessStorefrontSettings(perms);
      }
      if (s.id === "lms") {
        if (isSuperAdmin) return false;
        if (!activatedLower.includes("lms")) return false;
        return canAccessLmsOrgSettings(perms);
      }
      if (s.id === "project-roadmap") {
        if (isSuperAdmin) return false;
        return canAccessProjectRoadmap(perms);
      }
      if (s.id === "employee-payout") {
        if (isSuperAdmin) return false;
        return canAccessProjectRoadmap(perms);
      }
      if (s.id === "system-setup") {
        const hasApptAddon = activatedLower.some(
          (p) => p === "appointment" || p.includes("appointment") || p === "hrm" || p.startsWith("hrm-"),
        );
        if (!hasApptAddon) return false;
        return perms.includes("*") || canAccessAppointmentSystemSetup(perms);
      }
      if (s.id === "company-website-theme") {
        if (isSuperAdmin) return false;
        return perms.includes("*") || can(perms, s.viewPermission) || can(perms, s.writePermission);
      }
      if (perms.includes("*")) return true;
      if (s.id === "media-library") return canAccessMediaLibrary(perms);
      if (s.id === "subscription-plans") return canAccessSubscriptionPlans(perms, user.roles);
      if (s.id === "form-builder") return canAccessFormBuilder(perms);
      if (s.id === "payment-settings") {
        if (isSuperAdmin) return false;
        return canAccessPaymentSettings(perms);
      }
      if (!isSuperAdmin && (s.id === "bank-transfer" || s.id === "stripe" || s.id === "paypal")) {
        return false;
      }
      if (s.id === "email-notifications") {
        return (
          can(perms, s.viewPermission) ||
          hasPermission(perms, "edit-email-settings") ||
          hasPermission(perms, "manage-email-settings")
        );
      }
      if (s.id === "whatsapp-api") {
        return (
          can(perms, s.viewPermission) ||
          hasPermission(perms, "manage-whatsapp-chat") ||
          hasPermission(perms, "manage-settings") ||
          hasPermission(perms, "edit-settings")
        );
      }
      return can(perms, s.viewPermission);
    });
    // Hide company section for superadmin (Laravel: superadmin settings don't include company).
    const filtered = base.filter((s) => (isSuperAdmin ? s.id !== "company" && s.id !== "payment-terms" : true));
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }, [perms, user.activatedPackages, isSuperAdmin]);

  // Open tab from ?tab= when arriving from Launchpad or deep links.
  React.useEffect(() => {
    const tab = resolveSettingsTabParam(initialTab);
    if (!tab) return;
    if (!isSuperAdmin && isPaymentGatewayTab(tab)) {
      if (visible.some((s) => s.id === "payment-settings")) {
        setActive("payment-settings");
        setPaymentSubTab(tab);
      }
      return;
    }
    if (!visible.some((s) => s.id === tab)) return;
    setActive(tab);
  }, [initialTab, initialPaymentSubTab, visible, isSuperAdmin]);

  React.useEffect(() => {
    const sub = resolvePaymentGatewaySubTab(null, initialPaymentSubTab);
    if (initialPaymentSubTab && isPaymentGatewayTab(initialPaymentSubTab)) {
      setPaymentSubTab(sub);
    }
  }, [initialPaymentSubTab]);

  // Ensure active tab is always a visible section.
  React.useEffect(() => {
    if (!visible.length) return;
    if (!visible.some((s) => s.id === active)) setActive(visible[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Auto-clear flash after a short delay so the banner doesn't persist across navigation.
  React.useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(id);
  }, [flash]);

  const onNavClick = (id: SectionId) => {
    setActive(id);
    // Clear any previous success/error when switching sections.
    setFlash(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      if (id !== "payment-settings") url.searchParams.delete("payment");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  };

  const onPaymentSubTabClick = (sub: PaymentGatewayTab) => {
    setPaymentSubTab(sub);
    setFlash(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "payment-settings");
      url.searchParams.set("payment", sub);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  };

  const renderActiveSection = (id: SectionId) => {
    const canEdit =
      id === "lms"
        ? perms.includes("*") ||
          hasPermission(perms, "manage-lms-settings") ||
          hasPermission(perms, "manage-lms")
        : can(perms, (SECTIONS.find((s) => s.id === id)?.writePermission as string) ?? "");
    if (id === "brand")
      return (
        <BrandSection
          isSuperAdmin={isSuperAdmin}
          perms={perms}
          canEdit={canEdit}
          initial={initialSettings}
          usesPlatformBrandDefaults={pageData.brandUsesPlatformDefaults}
          onFlash={setFlash}
        />
      );
    if (id === "company-website-theme")
      return (
        <CompanyWebsiteThemeSettingsSection
          canEdit={canEdit}
          initial={initialSettings}
          onFlash={setFlash}
        />
      );
    if (id === "system")
      return (
        <SystemSection
          isSuperAdmin={isSuperAdmin}
          user={user}
          canEdit={canEdit}
          initial={initialSettings}
          availableLanguages={pageData.availableLanguages}
          onFlash={setFlash}
        />
      );
    if (id === "system-setup") return <AppointmentSystemSetupLazy permissions={perms} />;
    if (id === "company")
      return (
        <CompanySection canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />
      );
    if (id === "payment-terms")
      return (
        <PaymentTermsSettingsSection canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />
      );
    if (id === "media-library") return <MediaLibrarySection />;
    if (id === "currency") return <CurrencySection canEdit={canEdit} initial={initialSettings} currencies={pageData.currencies} onFlash={setFlash} />;
    if (id === "cookie") return <CookieSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "pusher") return <PusherSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "seo") return <SeoSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "cache") return <CacheSection canEdit={canEdit} cacheSize={pageData.cacheSize} onFlash={setFlash} />;
    if (id === "storage") return <StorageSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "recurring-invoice") return <RecurringInvoiceSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "email")
      return (
        <EmailSection
          canEdit={canEdit}
          initial={initialSettings}
          emailProviders={pageData.emailProviders}
          usesPlatformMailDefaults={pageData.mailUsesPlatformDefaults}
          onFlash={setFlash}
          userEmail={user.email}
          userPhone={pageData.currentUserPhone ?? ""}
        />
      );
    if (id === "email-notifications")
      return (
        <EmailNotificationsSection
          user={user}
          canEdit={
            canEdit ||
            hasPermission(perms, "edit-email-settings") ||
            hasPermission(perms, "manage-email-settings")
          }
          initial={initialSettings}
          notifications={pageData.notifications}
          onFlash={setFlash}
        />
      );
    if (id === "subscription-plans")
      return (
        <SubscriptionPlansSection
          isSuperAdmin={isSuperAdmin}
          user={user}
          userSubscriptionInfo={pageData.userSubscriptionInfo}
          companyBilling={pageData.companyBilling}
          perms={perms}
        />
      );
    if (id === "whatsapp-api")
      return (
        <WhatsAppApiSection
          canEdit={
            canEdit ||
            hasPermission(perms, "manage-whatsapp-chat") ||
            hasPermission(perms, "manage-settings") ||
            hasPermission(perms, "edit-settings")
          }
          initial={initialSettings}
          onFlash={setFlash}
        />
      );
    if (id === "twilio-sms")
      return <TwilioSmsSettingsSection canEdit={canEdit && isSuperAdmin} onFlash={setFlash} />;
    if (id === "database-backup") return <DatabaseBackupSection canEdit={canEdit} onFlash={setFlash} />;
    if (id === "user-management") return <UserManagementSettingsSection />;
    if (id === "form-builder") return <FormBuilderSettingsSection perms={perms} />;
    if (id === "project-roadmap") return <ProjectRoadmapSettingsSection perms={perms} />;
    if (id === "employee-payout")
      return (
        <EmployeePayoutSettingsSection canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />
      );
    if (id === "payment-settings")
      return (
        <PaymentSettingsSection
          perms={perms}
          canEdit={canEditPaymentGateway(perms)}
          paymentSubTab={paymentSubTab}
          onPaymentSubTabClick={onPaymentSubTabClick}
          initial={initialSettings}
          onFlash={setFlash}
        />
      );
    if (id === "bank-transfer") return <BankTransferSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "stripe") return <StripeSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "paypal") return <PaypalSection perms={perms} canEdit={canEdit} initial={initialSettings} onFlash={setFlash} />;
    if (id === "storefront") return <StorefrontSettingsSection canEdit={canEdit} />;
    if (id === "lms") return <LmsOrgSettingsSection canEdit={canEdit} />;
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-64 flex-shrink-0">
        <div className="md:sticky md:top-4">
          {/* Mobile: horizontal section nav */}
          <div className="md:hidden -mx-3 px-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {visible.map((s) => (
                <Button
                  key={s.id}
                  variant={active === s.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => onNavClick(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2" />
                  {t(s.title)}
                </Button>
              ))}
            </div>
          </div>

          {/* Desktop: vertical section nav — scrollable like Laravel so all sections are reachable */}
          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <div className="pr-4 space-y-1">
              {visible.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  className={cn("w-full justify-start", active === s.id && "bg-muted font-medium")}
                  onClick={() => onNavClick(s.id)}
                >
                  <s.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  {t(s.title)}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div id="settings-content-top" />
        {flash ? (
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm mb-4",
              flash.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900",
            )}
          >
            {flash.message}
          </div>
        ) : null}

        {/* Laravel-style: single selected section in main panel */}
        <div className="pt-4">
          <section id={`sec-${active}`} className="scroll-mt-6">
            {renderActiveSection(active)}
          </section>
        </div>
      </div>
    </div>
  );
}

function BrandSection({
  isSuperAdmin,
  canEdit,
  initial,
  usesPlatformBrandDefaults = false,
  onFlash,
}: {
  isSuperAdmin: boolean;
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  usesPlatformBrandDefaults?: boolean;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<"logos" | "text" | "theme">("logos");
  const companyName = (initial.company_name ?? "").trim();
  const brandTextDefaults = React.useMemo(
    () => brandTextDefaultsFromCompanyName(companyName),
    [companyName],
  );

  const buildBrandSettings = React.useCallback(
    (source: Record<string, string>) => {
      const logoWidth = resolveBrandLogoWidth(source);
      const logoHeight = resolveBrandLogoHeight(source);
      const logoDimensions = syncBrandLogoDimensions(logoWidth, logoHeight);

      return {
      logo_dark: source.logo_dark?.trim() || "",
      logo_light: source.logo_light?.trim() || "",
      ...logoDimensions,
      logo_position: resolveBrandLogoPosition(source),
      favicon: source.favicon?.trim() || source.logo_icon?.trim() || "",
      logo_icon: source.favicon?.trim() || source.logo_icon?.trim() || "",
      powered_by_light: source.powered_by_light?.trim() || "",
      powered_by_dark: source.powered_by_dark?.trim() || "",
      titleText: source.titleText?.trim() || brandTextDefaults.titleText,
      footerText: source.footerText?.trim() || brandTextDefaults.footerText,
      sidebarVariant: source.sidebarVariant?.trim() || "inset",
      sidebarStyle: source.sidebarStyle?.trim() || "plain",
      layoutDirection: source.layoutDirection?.trim() || "ltr",
      themeMode: source.themeMode?.trim() || "light",
      themeColor: source.themeColor?.trim() || "green",
      customColor: source.customColor?.trim() || "#10b981",
      loginImage: source.loginImage?.trim() || "",
      loginBgColor: source.loginBgColor?.trim() || "",
      loginFormBgColor: source.loginFormBgColor?.trim() || "",
      };
    },
    [brandTextDefaults.footerText, brandTextDefaults.titleText],
  );

  const [settings, setSettings] = React.useState(() => buildBrandSettings(initial));

  React.useEffect(() => {
    setSettings(buildBrandSettings(initial));
  }, [initial, buildBrandSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleMediaSelect = (name: string, url: string | string[]) => {
    const urlString = Array.isArray(url) ? url[0] || "" : url;
    setSettings((prev) => {
      const next = { ...prev, [name]: urlString };
      if (typeof window !== "undefined" && (name === "logo_dark" || name === "logo_light" || name === "logo_icon" || name === "favicon")) {
        window.dispatchEvent(new CustomEvent("pf:app-settings-updated", { detail: { [name]: urlString } }));
      }
      return next;
    });
  };

  const handleBrandIconSelect = (url: string | string[]) => {
    const urlString = Array.isArray(url) ? url[0] || "" : url;
    setSettings((prev) => ({ ...prev, favicon: urlString, logo_icon: urlString }));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pf:app-settings-updated", {
          detail: { favicon: urlString, logo_icon: urlString },
        }),
      );
    }
  };

  const brandIcon = settings.favicon || settings.logo_icon;
  const logoWidth = settings.logo_dark_width;
  const logoHeight = settings.logo_dark_height;
  const logoPosition = resolveBrandLogoPosition(settings);

  const handleLogoSizeChange = (field: "width" | "height", value: string) => {
    setSettings((prev) => {
      const nextWidth = field === "width" ? value : prev.logo_dark_width;
      const nextHeight = field === "height" ? value : prev.logo_dark_height;
      return { ...prev, ...syncBrandLogoDimensions(nextWidth, nextHeight) };
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("brand", settings);
      onFlash({ type: "success", message: "Brand settings saved." });
      toast.success("Brand settings saved.");
      window.dispatchEvent(new Event("pf:app-settings-updated"));
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save brand settings." });
      toast.error(e?.message || "Failed to save brand settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="Brand Settings"
      description="Each company can set its own logo and favicon. Until you save custom assets here, the platform (superadmin) logo and favicon are used across the app."
      icon={Palette}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <Button
              variant={activeSection === "logos" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("logos")}
              className="w-full sm:flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Logos
            </Button>
            <Button
              variant={activeSection === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("text")}
              className="w-full sm:flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Text
            </Button>
            <Button
              variant={activeSection === "theme" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("theme")}
              className="w-full sm:flex-1"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Theme
            </Button>
          </div>

          {activeSection === "logos" && (
            <div className="space-y-6">
              {usesPlatformBrandDefaults ? (
                <div className="rounded-md border border-blue-500/30 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
                  Using platform logo and favicon. Save your own logo and favicon here to complete Launchpad brand setup.
                </div>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Logo (Light Mode)</Label>
                  <div className="flex flex-col gap-3">
                    <div
                      className={`${BRAND_LOGO_PREVIEW_BOX} bg-muted/30`}
                      style={BRAND_LOGO_UPLOAD_PREVIEW_BOX_STYLE}
                    >
                      {settings.logo_dark ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getImagePath(settings.logo_dark)}
                          alt="Dark Logo"
                          className={BRAND_LOGO_PREVIEW_IMG}
                          style={BRAND_LOGO_UPLOAD_PREVIEW_IMG_STYLE}
                        />
                      ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                          <div className="h-12 w-24 bg-muted flex items-center justify-center rounded border border-dashed">
                            <span className="font-semibold text-muted-foreground">Logo</span>
                          </div>
                          <span className="text-xs">No logo selected</span>
                        </div>
                      )}
                    </div>
                    <MediaPicker
                      value={settings.logo_dark}
                      onChange={(url) => handleMediaSelect("logo_dark", url)}
                      placeholder="Select dark mode logo..."
                      showPreview={false}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Logo (Dark Mode)</Label>
                  <div className="flex flex-col gap-3">
                    <div
                      className={`${BRAND_LOGO_PREVIEW_BOX} bg-gray-800`}
                      style={BRAND_LOGO_UPLOAD_PREVIEW_BOX_STYLE}
                    >
                      {settings.logo_light ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getImagePath(settings.logo_light)}
                          alt="Light Logo"
                          className={BRAND_LOGO_PREVIEW_IMG}
                          style={BRAND_LOGO_UPLOAD_PREVIEW_IMG_STYLE}
                        />
                      ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                          <div className="h-12 w-24 bg-muted flex items-center justify-center rounded border border-dashed">
                            <span className="font-semibold text-muted-foreground">Logo</span>
                          </div>
                          <span className="text-xs">No logo selected</span>
                        </div>
                      )}
                    </div>
                    <MediaPicker
                      value={settings.logo_light}
                      onChange={(url) => handleMediaSelect("logo_light", url)}
                      placeholder="Select light mode logo..."
                      showPreview={false}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:max-w-3xl">
                    <div className="space-y-3">
                      <Label>Logo Size</Label>
                      <p className="text-xs text-muted-foreground">Applies to the sidebar logo area only.</p>
                      <div className="flex flex-wrap gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="logo_width" className="text-xs text-muted-foreground">
                            Width (px)
                          </Label>
                          <Input
                            id="logo_width"
                            type="number"
                            min={1}
                            value={logoWidth}
                            onChange={(e) => handleLogoSizeChange("width", e.target.value)}
                            disabled={!canEdit}
                            className="w-28"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="logo_height" className="text-xs text-muted-foreground">
                            Height (px)
                          </Label>
                          <Input
                            id="logo_height"
                            type="number"
                            min={1}
                            value={logoHeight}
                            onChange={(e) => handleLogoSizeChange("height", e.target.value)}
                            disabled={!canEdit}
                            className="w-28"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Logo Position</Label>
                      <p className="text-xs text-muted-foreground">
                        Horizontal alignment in the sidebar header.
                      </p>
                      <div className="inline-flex overflow-hidden rounded-md border">
                        {(
                          [
                            { value: "left", label: "Left", Icon: AlignLeft },
                            { value: "center", label: "Center", Icon: AlignCenter },
                            { value: "right", label: "Right", Icon: AlignRight },
                          ] as const
                        ).map(({ value, label, Icon }) => {
                          const active = logoPosition === value;
                          return (
                            <Button
                              key={value}
                              type="button"
                              variant={active ? "default" : "ghost"}
                              size="sm"
                              className={cn(
                                "h-9 rounded-none border-0 px-3",
                                !active && "text-muted-foreground",
                              )}
                              aria-label={`Align logo ${label.toLowerCase()}`}
                              aria-pressed={active}
                              disabled={!canEdit}
                              onClick={() => handleSelectChange("logo_position", value)}
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label>Favicon &amp; Icon</Label>
                  <p className="text-xs text-muted-foreground">
                    Used in the browser tab and when the sidebar is collapsed. Recommended: 32px × 32px
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Browser tab</p>
                      <div className="flex h-20 items-center justify-center rounded-md border bg-muted/30 p-4">
                        {brandIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getImagePath(brandIcon)} alt="Favicon" className="h-16 w-16 object-contain" />
                        ) : (
                          <div className="text-muted-foreground flex flex-col items-center gap-1">
                            <div className="h-10 w-10 bg-muted flex items-center justify-center rounded border border-dashed">
                              <span className="font-semibold text-xs text-muted-foreground">Icon</span>
                            </div>
                            <span className="text-xs">No icon selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Collapsed sidebar</p>
                      <div className="flex h-20 items-center justify-center rounded-md border bg-muted/30 p-4">
                        {brandIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getImagePath(brandIcon)} alt="Sidebar icon" className="h-12 w-12 object-contain" />
                        ) : (
                          <div className="text-muted-foreground flex flex-col items-center gap-1">
                            <div className="h-10 w-10 bg-muted flex items-center justify-center rounded border border-dashed">
                              <span className="font-semibold text-xs text-muted-foreground">Icon</span>
                            </div>
                            <span className="text-xs">No icon selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <MediaPicker
                    value={brandIcon}
                    onChange={handleBrandIconSelect}
                    placeholder="Select favicon & icon..."
                    showPreview={false}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {isSuperAdmin ? (
                <>
                  <Separator className="my-4" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label>Powered By Logo (Light Mode)</Label>
                      <p className="text-xs text-muted-foreground">Displayed at bottom of sidebar in light mode</p>
                      <div className="flex flex-col gap-3">
                        <div className="border rounded-md p-4 flex items-center justify-center bg-muted/30 h-24">
                          {settings.powered_by_light ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImagePath(settings.powered_by_light)}
                              alt="Powered By Logo (Light)"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                              <div className="h-8 w-24 bg-muted flex items-center justify-center rounded border border-dashed">
                                <span className="font-semibold text-xs text-muted-foreground">Powered By</span>
                              </div>
                              <span className="text-xs">No logo selected</span>
                            </div>
                          )}
                        </div>
                        <MediaPicker
                          value={settings.powered_by_light}
                          onChange={(url) => handleMediaSelect("powered_by_light", url)}
                          placeholder="Select powered by logo (light)..."
                          showPreview={false}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Powered By Logo (Dark Mode)</Label>
                      <p className="text-xs text-muted-foreground">Displayed at bottom of sidebar in dark mode</p>
                      <div className="flex flex-col gap-3">
                        <div className="border rounded-md p-4 flex items-center justify-center bg-gray-800 h-24">
                          {settings.powered_by_dark ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImagePath(settings.powered_by_dark)}
                              alt="Powered By Logo (Dark)"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                              <div className="h-8 w-24 bg-muted flex items-center justify-center rounded border border-dashed">
                                <span className="font-semibold text-xs text-muted-foreground">Powered By</span>
                              </div>
                              <span className="text-xs">No logo selected</span>
                            </div>
                          )}
                        </div>
                        <MediaPicker
                          value={settings.powered_by_dark}
                          onChange={(url) => handleMediaSelect("powered_by_dark", url)}
                          placeholder="Select powered by logo (dark)..."
                          showPreview={false}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label>Login Page Image</Label>
                      <p className="text-xs text-muted-foreground">
                        Background image displayed on the left panel of the login, register, and forgot-password pages.
                        Recommended: landscape image (1200px × 800px or wider).
                      </p>
                      <div className="flex flex-col gap-3">
                        <div className="border rounded-md overflow-hidden bg-muted/30 h-40 flex items-center justify-center">
                          {settings.loginImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImagePath(settings.loginImage)}
                              alt="Login Page Image"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                              <Layout className="h-8 w-8 opacity-40" />
                              <span className="text-xs">No login image selected</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <MediaPicker
                              value={settings.loginImage}
                              onChange={(url) => handleMediaSelect("loginImage", url)}
                              placeholder="Select login page image..."
                              showPreview={false}
                              disabled={!canEdit}
                            />
                          </div>
                          {settings.loginImage && canEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleMediaSelect("loginImage", "")}
                              className="shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="loginBgColor">Login Left Background</Label>
                        <Input
                          id="loginBgColor"
                          name="loginBgColor"
                          type="text"
                          value={settings.loginBgColor}
                          onChange={handleInputChange}
                          placeholder={NAVY_LEFT}
                          disabled={!canEdit}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Hex or CSS color for the left illustration panel. Leave empty for default.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loginFormBgColor">Login Right Background</Label>
                        <Input
                          id="loginFormBgColor"
                          name="loginFormBgColor"
                          type="text"
                          value={settings.loginFormBgColor}
                          onChange={handleInputChange}
                          placeholder={NAVY_FORM}
                          disabled={!canEdit}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Hex or CSS color for the right login form panel. Leave empty for default.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeSection === "text" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="titleText">Title Text</Label>
                  <Input
                    id="titleText"
                    name="titleText"
                    value={settings.titleText}
                    onChange={handleInputChange}
                    placeholder={brandTextDefaults.titleText}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    {companyName
                      ? t("Application title in the browser tab. Defaults to your company name.")
                      : t("Application title displayed in the browser tab")}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Input
                    id="footerText"
                    name="footerText"
                    value={settings.footerText}
                    onChange={handleInputChange}
                    placeholder={brandTextDefaults.footerText}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    {companyName
                      ? t("Footer text across the app. Defaults to your company name and copyright year.")
                      : t("Text displayed in the footer")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "theme" && (
            <div className="space-y-6">
              <div className={`flex flex-col space-y-8 ${!canEdit ? "pointer-events-none opacity-60" : ""}`}>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Palette className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">Theme Color</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries({
                      blue: "#3b82f6",
                      green: "#10b981",
                      purple: "#8b5cf6",
                      orange: "#f97316",
                      red: "#ef4444",
                    }).map(([color, hex]) => (
                      <Button
                        key={color}
                        type="button"
                        variant={settings.themeColor === color ? "default" : "outline"}
                        className="h-8 w-full p-0 relative"
                        style={{ backgroundColor: settings.themeColor === color ? hex : "transparent" }}
                        onClick={() => handleSelectChange("themeColor", color)}
                      >
                        <span className="absolute inset-1 rounded-sm" style={{ backgroundColor: hex }} />
                      </Button>
                    ))}

                    <Button
                      type="button"
                      variant={settings.themeColor === "custom" ? "default" : "outline"}
                      className="h-8 w-full p-0 relative"
                      style={{ backgroundColor: settings.themeColor === "custom" ? settings.customColor : "transparent" }}
                      onClick={() => handleSelectChange("themeColor", "custom")}
                    >
                      <span className="absolute inset-1 rounded-sm" style={{ backgroundColor: settings.customColor }} />
                    </Button>
                  </div>

                  {settings.themeColor === "custom" && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="customColor">Custom Color</Label>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Input
                            id="colorPicker"
                            type="color"
                            value={settings.customColor}
                            onChange={(e) => handleSelectChange("customColor", e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: settings.customColor }} />
                        </div>
                        <Input
                          id="customColor"
                          name="customColor"
                          type="text"
                          value={settings.customColor}
                          onChange={(e) => handleSelectChange("customColor", e.target.value)}
                          placeholder="#10b981"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <SidebarIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">Sidebar</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="space-y-6">
                    <div>
                      <Label className="mb-2 block">Sidebar Variant</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {["inset", "floating", "minimal"].map((variant) => (
                          <Button
                            key={variant}
                            type="button"
                            variant={settings.sidebarVariant === variant ? "default" : "outline"}
                            className="h-10 justify-start"
                            onClick={() => handleSelectChange("sidebarVariant", variant)}
                          >
                            {variant.charAt(0).toUpperCase() + variant.slice(1)}
                            {settings.sidebarVariant === variant && <Check className="h-4 w-4 ml-2" />}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Sidebar Style</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: "plain", name: "Plain" },
                          { id: "colored", name: "Colored" },
                          { id: "gradient", name: "Gradient" },
                        ].map((style) => (
                          <Button
                            key={style.id}
                            type="button"
                            variant={settings.sidebarStyle === style.id ? "default" : "outline"}
                            className="h-10 justify-start"
                            onClick={() => handleSelectChange("sidebarStyle", style.id)}
                          >
                            {style.name}
                            {settings.sidebarStyle === style.id && <Check className="h-4 w-4 ml-2" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Layout className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">Layout</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="space-y-2">
                    <Label className="mb-2 block">Layout Direction</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={settings.layoutDirection === "ltr" ? "default" : "outline"}
                        className="h-10 justify-start"
                        onClick={() => handleSelectChange("layoutDirection", "ltr")}
                      >
                        Left-to-Right
                        {settings.layoutDirection === "ltr" && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                      <Button
                        type="button"
                        variant={settings.layoutDirection === "rtl" ? "default" : "outline"}
                        className="h-10 justify-start"
                        onClick={() => handleSelectChange("layoutDirection", "rtl")}
                      >
                        Right-to-Left
                        {settings.layoutDirection === "rtl" && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Moon className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-base font-medium">Theme Mode</h3>
                  </div>
                  <Separator className="my-2" />

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={settings.themeMode === "light" ? "default" : "outline"}
                        className="h-10 justify-start"
                        onClick={() => handleSelectChange("themeMode", "light")}
                      >
                        Light
                        {settings.themeMode === "light" && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                      <Button
                        type="button"
                        variant={settings.themeMode === "dark" ? "default" : "outline"}
                        className="h-10 justify-start"
                        onClick={() => handleSelectChange("themeMode", "dark")}
                      >
                        Dark
                        {settings.themeMode === "dark" && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                      <Button
                        type="button"
                        variant={settings.themeMode === "system" ? "default" : "outline"}
                        className="h-10 justify-start"
                        onClick={() => handleSelectChange("themeMode", "system")}
                      >
                        System
                        {settings.themeMode === "system" && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {isSuperAdmin ? (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Palette className="h-5 w-5 mr-2 text-muted-foreground" />
                      <h3 className="text-base font-medium">Login Page Backgrounds</h3>
                    </div>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground">
                      Colors for the split auth layout (login, register, forgot password). The left color is used behind the branding column and as the page backdrop on small screens; the right color fills the form column. The left color is also used when no login image is set, or under a login image with a light overlay.
                    </p>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="loginBgColorTheme">Left panel (branding)</Label>
                        <div className="flex gap-2">
                          <div className="relative">
                            <Input
                              id="loginBgColorPickerTheme"
                              type="color"
                              value={settings.loginBgColor || "#0a1628"}
                              onChange={(e) => handleSelectChange("loginBgColor", e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div
                              className="w-10 h-10 rounded border cursor-pointer"
                              style={{ backgroundColor: settings.loginBgColor || "#0a1628" }}
                            />
                          </div>
                          <Input
                            id="loginBgColorTheme"
                            name="loginBgColor"
                            type="text"
                            value={settings.loginBgColor}
                            onChange={handleInputChange}
                            placeholder="#0a1628"
                          />
                          {settings.loginBgColor && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectChange("loginBgColor", "")}
                              className="shrink-0"
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loginFormBgColorTheme">Right panel (sign-in form)</Label>
                        <div className="flex gap-2">
                          <div className="relative">
                            <Input
                              id="loginFormBgColorPickerTheme"
                              type="color"
                              value={settings.loginFormBgColor || "#0d1a30"}
                              onChange={(e) => handleSelectChange("loginFormBgColor", e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div
                              className="w-10 h-10 rounded border cursor-pointer"
                              style={{ backgroundColor: settings.loginFormBgColor || "#0d1a30" }}
                            />
                          </div>
                          <Input
                            id="loginFormBgColorTheme"
                            name="loginFormBgColor"
                            type="text"
                            value={settings.loginFormBgColor}
                            onChange={handleInputChange}
                            placeholder="#0d1a30"
                          />
                          {settings.loginFormBgColor && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectChange("loginFormBgColor", "")}
                              className="shrink-0"
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-6">
            <div className="border rounded-md p-4">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-4 w-4" />
                <h3 className="font-medium">Dashboard Preview</h3>
              </div>

              <ThemePreview
                logoDark={settings.logo_dark}
                logoLight={settings.logo_light}
                logoWidth={logoWidth}
                logoHeight={logoHeight}
                logoPosition={logoPosition}
                themeColor={settings.themeColor}
                customColor={settings.customColor}
                sidebarVariant={settings.sidebarVariant}
                sidebarStyle={settings.sidebarStyle}
                layoutDirection={settings.layoutDirection}
                themeMode={settings.themeMode}
              />

              <div className="mt-4 pt-4 border-t">
                <div className="text-xs mb-2 text-muted-foreground">
                  Title: <span className="font-medium text-foreground">{settings.titleText}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Footer: <span className="font-medium text-foreground">{settings.footerText}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layout className="h-4 w-4" />
                <h3 className="font-medium">Login Preview</h3>
              </div>
              <div className="overflow-hidden rounded-md border bg-muted/40">
                <div className="flex h-40">
                  <div
                    className="relative hidden w-1/2 items-center justify-center border-r bg-slate-900/90 text-white sm:flex"
                    style={{ backgroundColor: settings.loginBgColor || NAVY_LEFT }}
                  >
                    {settings.loginImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImagePath(settings.loginImage)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-2 text-center">
                        <div className="h-8 w-8 rounded-full border border-white/30" />
                        <div className="h-2 w-16 rounded-full bg-white/40" />
                        <div className="h-2 w-10 rounded-full bg-white/25" />
                      </div>
                    )}
                  </div>
                  <div
                    className="flex flex-1 flex-col justify-between bg-slate-900 px-3 py-3 text-[10px]"
                    style={{ backgroundColor: settings.loginFormBgColor || NAVY_FORM }}
                  >
                    <div>
                      <div className="h-2 w-2/3 rounded bg-white/80" />
                      <div className="mt-1 h-1.5 w-3/4 rounded bg-white/25" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded bg-slate-700" />
                      <div className="h-1.5 w-full rounded bg-slate-700" />
                      <div className="h-1.5 w-1/2 rounded bg-primary/80" />
                    </div>
                    <div className="text-center text-[9px] text-slate-400">&copy; Paper Flight</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function SystemSection({
  isSuperAdmin,
  user,
  canEdit,
  initial,
  availableLanguages,
  onFlash,
}: {
  isSuperAdmin: boolean;
  user: User;
  canEdit: boolean;
  initial: Record<string, string>;
  availableLanguages: LanguageRow[];
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const [settings, setSettings] = React.useState({
    defaultLanguage: initial.defaultLanguage || "en",
    dateFormat: initial.dateFormat || "Y-m-d",
    timeFormat: initial.timeFormat || "H:i",
    calendarStartDay: initial.calendarStartDay || "0",
    enableRegistration: initial.enableRegistration === "on" || initial.enableRegistration === "1" ? "on" : "off",
    enableEmailVerification: initial.enableEmailVerification === "on" || initial.enableEmailVerification === "1" ? "on" : "off",
    landingPageEnabled: initial.landingPageEnabled === "on" || initial.landingPageEnabled === "1" ? "on" : "off",
    termsConditionsUrl: initial.termsConditionsUrl || "",
    googleMapsApiKey: initial.googleMapsApiKey || "",
  });

  const [langDrawerOpen, setLangDrawerOpen] = React.useState(false);
  const [draftLanguages, setDraftLanguages] = React.useState<LanguageRow[]>([]);
  const [savingLanguages, setSavingLanguages] = React.useState(false);

  const openLanguageDrawer = () => {
    const base =
      (availableLanguages || []).length > 0
        ? (availableLanguages || []).map((l) => ({ ...l }))
        : [{ code: "en", name: "English", countryCode: "GB", enabled: true as const }];
    setDraftLanguages(JSON.parse(JSON.stringify(base)) as LanguageRow[]);
    setLangDrawerOpen(true);
  };

  const patchDraftLanguage = (index: number, patch: Partial<LanguageRow>) => {
    setDraftLanguages((rows) =>
      rows.map((r, j) => {
        if (j !== index) return r;
        const next = { ...r, ...patch };
        if (isDefaultEnabledLanguage(next.code)) next.enabled = true;
        return next;
      }),
    );
  };

  const removeDraftLanguage = (index: number) => {
    setDraftLanguages((rows) => {
      if (isDefaultEnabledLanguage(rows[index]?.code ?? "")) return rows;
      return rows.filter((_, j) => j !== index);
    });
  };

  const addDraftLanguage = () => {
    setDraftLanguages((rows) => [...rows, { code: "", name: "", countryCode: "US", enabled: false }]);
  };

  const saveLanguageCatalog = async () => {
    setSavingLanguages(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings/languages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ languages: draftLanguages }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; defaultLanguage?: string };
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Failed to save languages.");
      }
      if (data.defaultLanguage) {
        setSettings((p) => ({ ...p, defaultLanguage: data.defaultLanguage! }));
      }
      onFlash({ type: "success", message: "Language list saved." });
      toast.success("Language list saved.");
      setLangDrawerOpen(false);
      router.refresh();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("pf:app-settings-updated"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save languages.";
      onFlash({ type: "error", message: msg });
      toast.error(msg);
    } finally {
      setSavingLanguages(false);
    }
  };

  const languages = (availableLanguages || [])
    .filter((l) => (l as any)?.enabled !== false)
    .map((l) => ({ ...l, flag: getCountryFlag(l.countryCode) }));

  const dateFormats = [
    { value: "Y-m-d", label: "YYYY-MM-DD (2024-01-15)" },
    { value: "m-d-Y", label: "MM-DD-YYYY (01-15-2024)" },
    { value: "d-m-Y", label: "DD-MM-YYYY (15-01-2024)" },
    { value: "Y/m/d", label: "YYYY/MM/DD (2024/01/15)" },
    { value: "m/d/Y", label: "MM/DD/YYYY (01/15/2024)" },
    { value: "d/m/Y", label: "DD/MM/YYYY (15/01/2024)" },
  ];

  const timeFormats = [
    { value: "H:i", label: "24 Hour (13:30)" },
    { value: "g:i A", label: "12 Hour (1:30 PM)" },
  ];

  const days = [
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
  ];

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      const payload: Record<string, string> = { ...settings };
      if (!isSuperAdmin) {
        delete payload.googleMapsApiKey;
        delete payload.termsConditionsUrl;
        delete payload.enableRegistration;
        delete payload.enableEmailVerification;
        delete payload.landingPageEnabled;
      }
      await postSettings("system", payload);
      onFlash({ type: "success", message: "System settings saved." });
      toast.success("System settings saved.");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("pf:app-settings-updated"));
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save system settings." });
      toast.error(e?.message || "Failed to save system settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="System Settings"
      description="Configure system-wide settings for your application"
      icon={SettingsIcon}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 items-start gap-x-6 gap-y-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="leading-none">Default Language</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  value={settings.defaultLanguage}
                  onValueChange={(v) => setSettings((p) => ({ ...p, defaultLanguage: v }))}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{(lang as any).flag}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canEdit ? (
                <Button type="button" variant="outline" className="h-10 shrink-0 gap-1.5 px-3" onClick={openLanguageDrawer}>
                  <Languages className="h-3.5 w-3.5" />
                  Manage languages
                </Button>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Use Manage languages to add, remove, or disable options. ISO country codes drive flag icons (e.g. US, GB).
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="leading-none">Date Format</Label>
            <Select value={settings.dateFormat} onValueChange={(v) => setSettings((p) => ({ ...p, dateFormat: v }))} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                {dateFormats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="leading-none">Time Format</Label>
            <Select value={settings.timeFormat} onValueChange={(v) => setSettings((p) => ({ ...p, timeFormat: v }))} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Select time format" />
              </SelectTrigger>
              <SelectContent>
                {timeFormats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="leading-none">Calendar Start Day</Label>
            <Select value={settings.calendarStartDay} onValueChange={(v) => setSettings((p) => ({ ...p, calendarStartDay: v }))} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Select start day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isSuperAdmin ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="googleMapsApiKey" className="leading-none">
              Google Maps API Key
            </Label>
            <Input
              id="googleMapsApiKey"
              type="text"
              value={settings.googleMapsApiKey}
              onChange={(e) => setSettings((p) => ({ ...p, googleMapsApiKey: e.target.value }))}
              placeholder="AIzaSy..."
              disabled={!canEdit}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Used for address autocomplete, Marketplace delivery maps, and other location features. Enable Places API and
              Maps JavaScript API in Google Cloud Console.
            </p>
          </div>
        ) : null}

        {isSuperAdmin ? (
          <>
            <div className="flex flex-col gap-2">
              <Label className="leading-none">Terms & Conditions URL</Label>
              <Input
                type="url"
                value={settings.termsConditionsUrl}
                onChange={(e) => setSettings((p) => ({ ...p, termsConditionsUrl: e.target.value }))}
                placeholder="https://example.com/terms"
                disabled={!canEdit}
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-x-6 gap-y-6 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label className="leading-none">Enable Registration</Label>
                <Switch
                  checked={settings.enableRegistration === "on"}
                  onCheckedChange={(checked) => setSettings((p) => ({ ...p, enableRegistration: checked ? "on" : "off" }))}
                  disabled={!canEdit}
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {settings.enableRegistration === "on" ? "New users can register accounts" : "Registration is disabled"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="leading-none">Enable Email Verification</Label>
                <Switch
                  checked={settings.enableEmailVerification === "on"}
                  onCheckedChange={(checked) => setSettings((p) => ({ ...p, enableEmailVerification: checked ? "on" : "off" }))}
                  disabled={!canEdit}
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {settings.enableEmailVerification === "on" ? "Users must verify their email" : "Email verification not required"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="leading-none">Enable Landing Page</Label>
                <Switch
                  checked={settings.landingPageEnabled === "on"}
                  onCheckedChange={(checked) => setSettings((p) => ({ ...p, landingPageEnabled: checked ? "on" : "off" }))}
                  disabled={!canEdit}
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {settings.landingPageEnabled === "on" ? "Landing page is accessible" : "Landing page is disabled"}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <ProjectDrawer
        open={langDrawerOpen}
        onOpenChange={setLangDrawerOpen}
        title="Languages"
        description="Locale codes (e.g. en, pt-br) and display names. Country is a two-letter ISO code for flags. English (en) stays enabled."
        footerClassName="sm:justify-between"
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={addDraftLanguage} disabled={!canEdit}>
              <Plus className="mr-1 h-4 w-4" />
              Add language
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setLangDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={saveLanguageCatalog} disabled={!canEdit || savingLanguages}>
                {savingLanguages ? "Saving..." : "Save list"}
              </Button>
            </div>
          </>
        }
      >
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
            <span className="col-span-3">Code</span>
            <span className="col-span-4">Name</span>
            <span className="col-span-2">Country</span>
            <span className="col-span-2 text-center">Enabled</span>
            <span className="col-span-1" />
          </div>
          {draftLanguages.map((row, i) => {
            const isEnglish = isDefaultEnabledLanguage(row.code);
            return (
              <div key={`lang-row-${i}`} className="grid grid-cols-12 items-center gap-2">
                <Input
                  className="col-span-3 h-8 text-sm"
                  value={row.code}
                  onChange={(e) =>
                    patchDraftLanguage(i, { code: e.target.value.toLowerCase().replace(/\s+/g, "") })
                  }
                  placeholder="en"
                  spellCheck={false}
                  disabled={!canEdit || isEnglish}
                />
                <Input
                  className="col-span-4 h-8 text-sm"
                  value={row.name}
                  onChange={(e) => patchDraftLanguage(i, { name: e.target.value })}
                  placeholder="English"
                  disabled={!canEdit}
                />
                <Input
                  className="col-span-2 h-8 text-sm uppercase"
                  value={row.countryCode}
                  maxLength={2}
                  onChange={(e) =>
                    patchDraftLanguage(i, {
                      countryCode: e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase(),
                    })
                  }
                  placeholder="GB"
                  disabled={!canEdit}
                />
                <div className="col-span-2 flex justify-center">
                  <Switch
                    checked={row.enabled !== false}
                    onCheckedChange={(checked) => patchDraftLanguage(i, { enabled: checked })}
                    disabled={!canEdit || isEnglish}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeDraftLanguage(i)}
                    disabled={!canEdit || draftLanguages.length <= 1 || isEnglish}
                    aria-label="Remove language"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ProjectDrawer>
    </SectionShell>
  );
}

function MediaLibrarySection() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageLibraryIcon className="h-5 w-5" />
          Media Library
        </CardTitle>
        <CardDescription>Upload files, organize folders, and copy URLs for forms, landing pages, and branding.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <MediaLibraryPageLazy />
      </CardContent>
    </Card>
  );
}

function UserManagementSettingsSection() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Invite users, assign roles, and configure permissions for your organization. Use Roles &amp;
          permissions to view system portal roles (customer, employee, vendor, LMS student/instructor,
          support staff) and custom company roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Roles & permissions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4 focus-visible:outline-none">
            <UserManagementUsersLazy />
          </TabsContent>
          <TabsContent value="roles" className="mt-4 focus-visible:outline-none">
            <UserManagementRolesLazy />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function FormBuilderSettingsSection({ perms }: { perms: string[] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FormInput className="h-5 w-5" />
          Form Builder
        </CardTitle>
        <CardDescription>
          Create forms in this panel, share public links, and review responses. Edit, responses, and conversion still open on their own pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <FormBuilderAdminLazy permissions={perms} />
      </CardContent>
    </Card>
  );
}

function ProjectRoadmapSettingsSection({ perms }: { perms: string[] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Map className="h-5 w-5" />
          Project Roadmap
        </CardTitle>
        <CardDescription>
          View current, upcoming, and past projects in a roadmap layout. Open a project card for full details and operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ProjectsBoardLazy permissions={perms} />
      </CardContent>
    </Card>
  );
}

function planRoleFromUser(roles: string[]): string {
  if ((roles ?? []).some((r) => r === "superadmin" || r === "super_admin")) return "superadmin";
  return roles?.[0] ?? "company";
}

function SubscriptionPlansSection({
  isSuperAdmin,
  user,
  userSubscriptionInfo,
  companyBilling,
  perms,
}: {
  isSuperAdmin: boolean;
  user: User;
  userSubscriptionInfo: UserSubscriptionInfo | null;
  companyBilling: TenantBillingPanelPageData | null;
  perms: string[];
}) {
  const catalog = (
    <SubscriptionSettingLazy
      role={planRoleFromUser(user.roles)}
      canCreate={can(perms, "create-plans")}
      canEdit={can(perms, "edit-plans")}
      canDelete={can(perms, "delete-plans")}
      userSubscriptionInfo={userSubscriptionInfo}
      companyPlanAssignment={
        !isSuperAdmin && companyBilling
          ? { companyId: companyBilling.companyId, hideTopSummary: true }
          : undefined
      }
    />
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Subscription plans
        </CardTitle>
        <CardDescription>
          Compare available plans, included modules, and pricing. Subscribe or change plans from here when your account allows it.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {!isSuperAdmin && companyBilling ? (
          <div className="space-y-10">
            <CompanyBillingPlanPanel
              companyId={companyBilling.companyId}
              companyName={companyBilling.companyName ?? user.name}
              subscriptionInfo={companyBilling.subscriptionInfo ?? userSubscriptionInfo}
              planDetails={companyBilling.planDetails}
              defaultCurrency={companyBilling.defaultCurrency}
            />
            <CompanyBillingPaymentMethodsCard companyId={companyBilling.companyId} />
            <div id="company-plan-comparison" className="scroll-mt-6 space-y-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Plans &amp; add-ons</h3>
                <p className="text-sm text-muted-foreground">
                  Compare packages, modules, and change your subscription when your account allows it.
                </p>
              </div>
              {catalog}
            </div>
          </div>
        ) : (
          catalog
        )}
      </CardContent>
    </Card>
  );
}

function PaymentTermsSettingsSection({
  canEdit,
  initial,
  onFlash,
}: {
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [terms, setTerms] = React.useState<string[]>(() =>
    parseAccountPaymentTermsOptions(initial.account_payment_terms_options),
  );

  React.useEffect(() => {
    setTerms(parseAccountPaymentTermsOptions(initial.account_payment_terms_options));
  }, [initial.account_payment_terms_options]);

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("payment-terms", {
        account_payment_terms_options: serializeAccountPaymentTermsOptions(terms),
      });
      onFlash({ type: "success", message: "Payment terms saved." });
      toast.success("Payment terms saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save payment terms." });
      toast.error(e?.message || "Failed to save payment terms.");
    } finally {
      setSaving(false);
    }
  };

  const updateTerm = (index: number, value: string) => {
    setTerms((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeTerm = (index: number) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <SectionShell
      title="Payment terms"
      description="Terms appear in the dropdown when creating or editing customers and vendors (Accounting)."
      icon={Receipt}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Add one row per option (e.g. Net 30, Due on receipt). Empty rows are ignored when saving.
          </p>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setTerms((t) => [...t, ""])}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add term
            </Button>
          ) : null}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70%]">Term</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-8">
                    No terms yet. Click &quot;Add term&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                terms.map((term, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={term}
                        onChange={(e) => updateTerm(index, e.target.value)}
                        placeholder="e.g. Net 30"
                        disabled={!canEdit}
                        className="max-w-lg"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeTerm(index)}
                          aria-label="Remove term"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </SectionShell>
  );
}

function CompanySection({
  canEdit,
  initial,
  onFlash,
}: {
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const appSettings = useAppSettingsOptional();
  const mapsApiKey =
    (appSettings?.settings?.googleMapsApiKey ?? initial.googleMapsApiKey ?? "").trim() || undefined;
  const [form, setForm] = React.useState({
    company_name: initial.company_name ?? "",
    company_address: initial.company_address ?? "",
    company_address_2: initial.company_address_2 ?? "",
    company_city: initial.company_city ?? "",
    company_state: initial.company_state ?? "",
    company_county: initial.company_county ?? "",
    company_country: initial.company_country ?? "United States",
    company_zipcode: initial.company_zipcode ?? "",
    company_telephone: formatPhone(initial.company_telephone ?? ""),
    company_email: initial.company_email ?? "",
    companyWebsite: initial.companyWebsite ?? "",
  });

  React.useEffect(() => {
    setForm({
      company_name: initial.company_name ?? "",
      company_address: initial.company_address ?? "",
      company_address_2: initial.company_address_2 ?? "",
      company_city: initial.company_city ?? "",
      company_state: initial.company_state ?? "",
      company_county: initial.company_county ?? "",
      company_country: initial.company_country ?? "United States",
      company_zipcode: initial.company_zipcode ?? "",
      company_telephone: formatPhone(initial.company_telephone ?? ""),
      company_email: initial.company_email ?? "",
      companyWebsite: initial.companyWebsite ?? "",
    });
  }, [initial]);

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("company", {
        ...form,
        company_telephone: normalizeMobileForStorage(form.company_telephone) ?? "",
        companyWebsite: normalizeWebsiteUrl(form.companyWebsite),
      });
      onFlash({ type: "success", message: "Company settings saved." });
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save company settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell title="Company Settings" description="Company profile fields used on documents/emails." icon={SettingsIcon} canEdit={canEdit} onSave={save} saving={saving}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Company Name" value={form.company_name} onChange={(v) => setForm((p) => ({ ...p, company_name: v }))} />
        <Field label="Company Email" value={form.company_email} onChange={(v) => setForm((p) => ({ ...p, company_email: v }))} />
        <div className="space-y-2 md:col-span-2">
          <Field
            label="Website / domain"
            value={form.companyWebsite}
            onChange={(v) => setForm((p) => ({ ...p, companyWebsite: v }))}
            placeholder="firstaidresponders.net"
          />
          <p className="text-xs text-muted-foreground">
            Public site URL for your company (used by Visit Site and on invoices). https:// is added automatically when you save.
          </p>
          {form.companyWebsite.trim() ? (
            <p className="text-xs text-muted-foreground">
              For production, point your domain DNS to{" "}
              <code className="rounded bg-muted px-1 py-0.5">{companyWebsiteDnsTargetForDisplay()}</code>{" "}
              (A record for apex, or CNAME for www). After DNS propagates, visitors opening{" "}
              <span className="font-medium text-foreground">{normalizeWebsiteUrl(form.companyWebsite)}</span> will see
              your Company Website theme. Choose a theme under Company Website Theme first.
            </p>
          ) : null}
        </div>
        <Field
          label="Telephone"
          type="tel"
          placeholder="(000) 000-0000"
          value={form.company_telephone}
          onChange={(v) => setForm((p) => ({ ...p, company_telephone: formatPhone(v) }))}
        />
        <div className="space-y-2">
          <Label htmlFor="company_country">{t("Country")}</Label>
          <Select
            value={form.company_country || "United States"}
            onValueChange={(v) => setForm((p) => ({ ...p, company_country: v }))}
            disabled={!canEdit}
          >
            <SelectTrigger id="company_country">
              <SelectValue placeholder={t("Select country")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="United States">{t("United States")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_address">{t("Address 1")}</Label>
            <AddressAutocomplete
              id="company_address"
              apiKey={mapsApiKey}
              value={form.company_address}
              onChange={(v) => setForm((p) => ({ ...p, company_address: v }))}
              onPlaceSelect={(addr) =>
                setForm((p) => ({
                  ...p,
                  company_city: addr.city || p.company_city,
                  company_state: addr.state || p.company_state,
                  company_zipcode: addr.zip || p.company_zipcode,
                  company_country: addr.country || p.company_country,
                  ...(addr.county ? { company_county: addr.county } : {}),
                }))
              }
              placeholder="Start typing an address..."
              disabled={!canEdit}
            />
          </div>
          <Field
            label="Address 2"
            value={form.company_address_2}
            onChange={(v) => setForm((p) => ({ ...p, company_address_2: v }))}
            placeholder="Suite, unit, building, floor, etc."
          />
        </div>
        <Field label="City" value={form.company_city} onChange={(v) => setForm((p) => ({ ...p, company_city: v }))} />
        <Field label="State" value={form.company_state} onChange={(v) => setForm((p) => ({ ...p, company_state: v }))} />
        <Field label="County" value={form.company_county} onChange={(v) => setForm((p) => ({ ...p, company_county: v }))} />
        <Field label="Zip Code" value={form.company_zipcode} onChange={(v) => setForm((p) => ({ ...p, company_zipcode: v }))} />
      </div>
    </SectionShell>
  );
}

function CurrencySection({
  canEdit,
  initial,
  currencies,
  onFlash,
}: {
  canEdit: boolean;
  initial: Record<string, string>;
  currencies: CurrencyForClient[];
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);

  const decimalFormats = [
    { value: "0", label: "0 (e.g., 1234)" },
    { value: "1", label: "1 (e.g., 1234.5)" },
    { value: "2", label: "2 (e.g., 1234.56)" },
    { value: "3", label: "3 (e.g., 1234.567)" },
    { value: "4", label: "4 (e.g., 1234.5678)" },
  ];

  const thousandsSeparators = [
    { value: ",", label: "Comma (1,234.56)" },
    { value: ".", label: "Dot (1.234,56)" },
    { value: " ", label: "Space (1 234.56)" },
    { value: "none", label: "None (123456.78)" },
  ];

  const [currencySettings, setCurrencySettings] = React.useState(() => ({
    decimalFormat: initial.decimalFormat || "2",
    defaultCurrency: initial.defaultCurrency || "USD",
    decimalSeparator: initial.decimalSeparator || ".",
    thousandsSeparator: initial.thousandsSeparator || ",",
    floatNumber: initial.floatNumber === "0" ? false : true,
    currencySymbolSpace: normalizeCurrencySymbolSpace(initial.currencySymbolSpace),
    currencySymbolPosition: normalizeCurrencySymbolPosition(initial.currencySymbolPosition),
    currencySymbol: initial.currencySymbol || "$",
    currencyName: "",
  }));

  const [previewAmount, setPreviewAmount] = React.useState(1234.56);

  React.useEffect(() => {
    setCurrencySettings((prev) => ({
      ...prev,
      decimalFormat: initial.decimalFormat || "2",
      defaultCurrency: initial.defaultCurrency || "USD",
      decimalSeparator: initial.decimalSeparator || ".",
      thousandsSeparator: initial.thousandsSeparator || ",",
      floatNumber: initial.floatNumber === "0" ? false : true,
      currencySymbolSpace: normalizeCurrencySymbolSpace(initial.currencySymbolSpace),
      currencySymbolPosition: normalizeCurrencySymbolPosition(initial.currencySymbolPosition),
      currencySymbol: initial.currencySymbol || "$",
      currencyName: "",
    }));
  }, [initial]);

  React.useEffect(() => {
    const selected = currencies.find((c) => c.code === currencySettings.defaultCurrency);
    if (selected) setCurrencySettings((p) => ({ ...p, currencyName: selected.name }));
  }, [currencies, currencySettings.defaultCurrency]);

  const handleCurrencyChange = (value: string) => {
    const selected = currencies.find((c) => c.code === value);
    setCurrencySettings((p) => ({
      ...p,
      defaultCurrency: value,
      currencySymbol: selected?.symbol || "$",
      currencyName: selected?.name || value,
    }));
  };

  const formattedPreview = () => {
    try {
      const num = Number(previewAmount) || 0;
      const decimalPlaces = parseInt(currencySettings.decimalFormat) || 0;
      const floatNumber = currencySettings.floatNumber;
      const finalAmount = floatNumber ? num : Math.floor(num);

      const parts = Number(finalAmount).toFixed(decimalPlaces).split(".");
      if (currencySettings.thousandsSeparator !== "none") {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currencySettings.thousandsSeparator);
      }
      const formattedNumber = parts.join(currencySettings.decimalSeparator);

      const selected = currencies.find((c) => c.code === currencySettings.defaultCurrency);
      const symbol = selected?.symbol || "$";
      const space = currencySettings.currencySymbolSpace ? " " : "";

      return currencySettings.currencySymbolPosition === "before"
        ? `${symbol}${space}${formattedNumber}`
        : `${formattedNumber}${space}${symbol}`;
    } catch {
      return "Invalid format";
    }
  };

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("currency", currencySettings);
      onFlash({ type: "success", message: "Currency settings saved." });
      toast.success("Currency settings saved.");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("pf:app-settings-updated"));
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save currency settings." });
      toast.error(e?.message || "Failed to save currency settings.");
    } finally {
      setSaving(false);
    }
  };

  const currentSymbol = currencies.find((c) => c.code === currencySettings.defaultCurrency)?.symbol || "$";

  return (
    <SectionShell
      title="Currency Settings"
      description="Configure how currency values are displayed throughout the application"
      icon={DollarSign}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <div className="mb-6 p-4 bg-muted/30 rounded-md border flex flex-col md:flex-row items-center justify-between">
          <div className="flex flex-col items-center md:items-start mb-3 md:mb-0">
            <div className="text-2xl font-semibold mb-1">{formattedPreview()}</div>
            <div className="text-xs text-muted-foreground">
              {currencySettings.currencyName} ({currencySettings.defaultCurrency})
            </div>
          </div>
          <div className="w-full md:w-auto md:max-w-[200px]">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="text-right h-8 text-sm"
                value={previewAmount}
                onChange={(e) => setPreviewAmount(parseFloat(e.target.value) || 0)}
                placeholder="Test amount"
                disabled={!canEdit}
              />
              <Button
                variant="outline"
                onClick={() => setPreviewAmount(1234.56)}
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={!canEdit}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Default Currency</Label>
            <Select value={currencySettings.defaultCurrency} onValueChange={handleCurrencyChange} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-[300px] overflow-y-auto">
                  {currencies && currencies.length > 0 ? (
                    currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.code}>
                        <div className="flex items-center">
                          <span className="w-8 text-center">{currency.symbol}</span>
                          <span>
                            {currency.code} - {currency.name}
                          </span>
                          {currency.code === currencySettings.defaultCurrency ? (
                            <span className="ml-2 text-xs text-primary">(Selected)</span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-muted-foreground">No currencies found</div>
                  )}
                </div>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Decimal Places</Label>
            <Select value={currencySettings.decimalFormat} onValueChange={(v) => setCurrencySettings((p) => ({ ...p, decimalFormat: v }))} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Select decimal format" />
              </SelectTrigger>
              <SelectContent>
                {decimalFormats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Symbol Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={currencySettings.currencySymbolPosition === "before" ? "default" : "outline"}
                className="justify-center"
                onClick={() => setCurrencySettings((p) => ({ ...p, currencySymbolPosition: "before" }))}
                disabled={!canEdit}
              >
                <span className="mr-2">{currentSymbol}</span>100
                {currencySettings.currencySymbolPosition === "before" ? <Check className="h-4 w-4 ml-2" /> : null}
              </Button>
              <Button
                type="button"
                variant={currencySettings.currencySymbolPosition === "after" ? "default" : "outline"}
                className="justify-center"
                onClick={() => setCurrencySettings((p) => ({ ...p, currencySymbolPosition: "after" }))}
                disabled={!canEdit}
              >
                100<span className="ml-2">{currentSymbol}</span>
                {currencySettings.currencySymbolPosition === "after" ? <Check className="h-4 w-4 ml-2" /> : null}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Decimal Separator</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={currencySettings.decimalSeparator === "." ? "default" : "outline"}
                className="justify-center"
                onClick={() => setCurrencySettings((p) => ({ ...p, decimalSeparator: "." }))}
                disabled={!canEdit}
              >
                Dot (123.45)
                {currencySettings.decimalSeparator === "." ? <Check className="h-4 w-4 ml-2" /> : null}
              </Button>
              <Button
                type="button"
                variant={currencySettings.decimalSeparator === "," ? "default" : "outline"}
                className="justify-center"
                onClick={() => setCurrencySettings((p) => ({ ...p, decimalSeparator: "," }))}
                disabled={!canEdit}
              >
                Comma (123,45)
                {currencySettings.decimalSeparator === "," ? <Check className="h-4 w-4 ml-2" /> : null}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Thousands Separator</Label>
            <Select
              value={currencySettings.thousandsSeparator}
              onValueChange={(v) => setCurrencySettings((p) => ({ ...p, thousandsSeparator: v }))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select thousands separator" />
              </SelectTrigger>
              <SelectContent>
                {thousandsSeparators.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="floatNumber">Show Decimals</Label>
                <p className="text-xs text-muted-foreground mt-1">Display decimal places in amounts</p>
              </div>
              <Switch
                id="floatNumber"
                checked={currencySettings.floatNumber}
                onCheckedChange={(checked) => setCurrencySettings((p) => ({ ...p, floatNumber: checked }))}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="space-y-3 border rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="currencySymbolSpace">Add Space</Label>
                <p className="text-xs text-muted-foreground mt-1">Space between amount and symbol</p>
              </div>
              <Switch
                id="currencySymbolSpace"
                checked={currencySettings.currencySymbolSpace}
                onCheckedChange={(checked) => setCurrencySettings((p) => ({ ...p, currencySymbolSpace: checked }))}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function CookieSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState<{
    enableCookiePopup: boolean;
    enableLogging: boolean;
    strictlyNecessaryCookies: boolean;
    cookieTitle: string;
    strictlyCookieTitle: string;
    cookieDescription: string;
    strictlyCookieDescription: string;
    contactUsDescription: string;
    contactUsUrl: string;
  }>(() => ({
    enableCookiePopup: initial.enableCookiePopup === "1" || false,
    enableLogging: initial.enableLogging === "1" || false,
    strictlyNecessaryCookies: Boolean(initial.strictlyNecessaryCookies === "1" || true),
    cookieTitle: initial.cookieTitle || "Cookie Consent",
    strictlyCookieTitle: initial.strictlyCookieTitle || "Strictly Necessary Cookies",
    cookieDescription:
      initial.cookieDescription || "We use cookies to enhance your browsing experience and provide personalized content.",
    strictlyCookieDescription:
      initial.strictlyCookieDescription || "These cookies are essential for the website to function properly.",
    contactUsDescription:
      initial.contactUsDescription || "If you have any questions about our cookie policy, please contact us.",
    contactUsUrl: initial.contactUsUrl || "https://example.com/contact",
  }));

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("cookie", settings);
      onFlash({ type: "success", message: "Cookie settings saved." });
      toast.success("Cookie settings saved.");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("pf:app-settings-updated"));
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save cookie settings." });
      toast.error(e?.message || "Failed to save cookie settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="Cookie Settings"
      description="Configure cookie consent and privacy settings for your application"
      icon={Cookie}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
      actions={
        <div className="flex gap-2">
          <Button type="button" onClick={() => (window.location.href = "/api/settings/cookie/download")} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Cookie Data
          </Button>
          {canEdit ? (
            <Button type="button" onClick={save} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enableCookiePopup">Enable Cookie Popup</Label>
              <p className="text-sm text-muted-foreground">Show cookie consent popup to visitors</p>
            </div>
            <Switch
              id="enableCookiePopup"
              checked={settings.enableCookiePopup}
              onCheckedChange={(checked) => setSettings((p) => ({ ...p, enableCookiePopup: checked }))}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enableLogging">Enable Logging</Label>
              <p className="text-sm text-muted-foreground">Enable cookie activity logging</p>
            </div>
            <Switch
              id="enableLogging"
              checked={settings.enableLogging}
              onCheckedChange={(checked) => setSettings((p) => ({ ...p, enableLogging: checked }))}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="strictlyNecessaryCookies">Strictly Necessary Cookies</Label>
              <p className="text-sm text-muted-foreground">Enable strictly necessary cookies</p>
            </div>
            <Switch
              id="strictlyNecessaryCookies"
              checked={settings.strictlyNecessaryCookies}
              onCheckedChange={(checked) => setSettings((p) => ({ ...p, strictlyNecessaryCookies: !!checked }))}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cookieTitle">Cookie Title</Label>
            <Input
              id="cookieTitle"
              type="text"
              value={settings.cookieTitle}
              onChange={(e) => setSettings((p) => ({ ...p, cookieTitle: e.target.value }))}
              disabled={!canEdit}
              placeholder="Enter the main cookie consent title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="strictlyCookieTitle">Strictly Cookie Title</Label>
            <Input
              id="strictlyCookieTitle"
              type="text"
              value={settings.strictlyCookieTitle}
              onChange={(e) => setSettings((p) => ({ ...p, strictlyCookieTitle: e.target.value }))}
              disabled={!canEdit}
              placeholder="Enter the strictly necessary cookies title"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cookieDescription">Cookie Description</Label>
            <Textarea
              id="cookieDescription"
              value={settings.cookieDescription}
              onChange={(e) => setSettings((p) => ({ ...p, cookieDescription: e.target.value }))}
              disabled={!canEdit}
              placeholder="Enter the cookie consent description"
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="strictlyCookieDescription">Strictly Cookie Description</Label>
            <Textarea
              id="strictlyCookieDescription"
              value={settings.strictlyCookieDescription}
              onChange={(e) => setSettings((p) => ({ ...p, strictlyCookieDescription: e.target.value }))}
              disabled={!canEdit}
              placeholder="Enter the strictly necessary cookies description"
              rows={4}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contactUsDescription">Contact Us Description</Label>
            <Textarea
              id="contactUsDescription"
              value={settings.contactUsDescription}
              onChange={(e) => setSettings((p) => ({ ...p, contactUsDescription: e.target.value }))}
              disabled={!canEdit}
              placeholder="Enter the contact us description for cookie inquiries"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contactUsUrl">Contact Us URL</Label>
            <Input
              id="contactUsUrl"
              type="url"
              value={settings.contactUsUrl}
              onChange={(e) => setSettings((p) => ({ ...p, contactUsUrl: e.target.value }))}
              disabled={!canEdit}
              placeholder="Enter the contact us URL for cookie inquiries"
            />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function PusherSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [settings, setSettings] = React.useState({
    pusher_app_id: initial.pusher_app_id || "",
    pusher_app_key: initial.pusher_app_key || "",
    pusher_app_secret: initial.pusher_app_secret || "",
    pusher_app_cluster: initial.pusher_app_cluster || "mt1",
    // Keep parity with Laravel and avoid overwriting existing value with "".
    pusher_enabled: initial.pusher_enabled === "1" || false,
  });

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("pusher", settings);
      onFlash({ type: "success", message: "Pusher settings saved." });
      toast.success("Pusher settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save pusher settings." });
      toast.error(e?.message || "Failed to save pusher settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="Pusher Settings"
      description="Configure Pusher for real-time messaging and notifications"
      icon={Radio}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="pusher_app_id" className="font-medium">
                  App ID
                </Label>
                <Input
                  id="pusher_app_id"
                  value={settings.pusher_app_id}
                  onChange={(e) => setSettings((p) => ({ ...p, pusher_app_id: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="123456"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pusher_app_key" className="font-medium">
                  App Key
                </Label>
                <Input
                  id="pusher_app_key"
                  value={settings.pusher_app_key}
                  onChange={(e) => setSettings((p) => ({ ...p, pusher_app_key: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="your-app-key"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pusher_app_secret" className="font-medium">
                  App Secret
                </Label>
                <div className="relative">
                  <Input
                    id="pusher_app_secret"
                    type={showSecret ? "text" : "password"}
                    value={settings.pusher_app_secret}
                    onChange={(e) => setSettings((p) => ({ ...p, pusher_app_secret: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="••••••••••••"
                    className="pr-10"
                  />
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSecret((v) => !v)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pusher_app_cluster" className="font-medium">
                  App Cluster
                </Label>
                <Input
                  id="pusher_app_cluster"
                  value={settings.pusher_app_cluster}
                  onChange={(e) => setSettings((p) => ({ ...p, pusher_app_cluster: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="mt1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Radio className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-medium">Real-time Features</h3>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Pusher enables real-time messaging and notifications in your application.</p>

                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Features enabled:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• Instant messaging</li>
                      <li>• Real-time notifications</li>
                      <li>• Live updates</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-blue-700 text-xs">
                      Get your Pusher credentials from{" "}
                      <a href="https://pusher.com" target="_blank" rel="noopener noreferrer" className="underline">
                        pusher.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SectionShell>
  );
}

function SeoSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState({
    metaTitle: initial.metaTitle || "",
    metaKeywords: initial.metaKeywords || "",
    metaDescription: initial.metaDescription || "",
    metaImage: initial.metaImage || "",
  });

  const getDescriptionStatus = () => {
    const length = settings.metaDescription.length;
    if (length === 0) return { color: "text-muted-foreground", icon: AlertCircle };
    if (length < 120) return { color: "text-orange-500", icon: AlertCircle };
    if (length <= 160) return { color: "text-green-500", icon: CheckCircle2 };
    return { color: "text-red-500", icon: AlertCircle };
  };

  const keywordsCount = () => settings.metaKeywords.split(",").filter((k) => k.trim()).length;

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      if (!settings.metaTitle.trim()) throw new Error("Meta Title is required");
      if (!settings.metaDescription.trim()) throw new Error("Meta Description is required");
      await postSettings("seo", settings);
      onFlash({ type: "success", message: "SEO settings saved." });
      toast.success("SEO settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save SEO settings." });
      toast.error(e?.message || "Failed to save SEO settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="SEO Settings"
      description="Configure SEO settings to improve your website's search engine visibility"
      icon={Search}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <span
                className={cn(
                  "text-sm",
                  settings.metaTitle.length > 60 ? "text-red-500" : settings.metaTitle.length > 50 ? "text-orange-500" : "text-green-500",
                )}
              >
                {settings.metaTitle.length}/60
              </span>
            </div>
            <Input
              id="metaTitle"
              value={settings.metaTitle}
              onChange={(e) => setSettings((p) => ({ ...p, metaTitle: e.target.value }))}
              placeholder="Enter page title for search engines"
              maxLength={60}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">Appears as the clickable headline in search results</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <div className="flex items-center gap-1">
                {(() => {
                  const { color, icon: Icon } = getDescriptionStatus();
                  return (
                    <>
                      <Icon className={cn("h-4 w-4", color)} />
                      <span className={cn("text-sm", color)}>{settings.metaDescription.length}/160</span>
                    </>
                  );
                })()}
              </div>
            </div>
            <Textarea
              id="metaDescription"
              value={settings.metaDescription}
              onChange={(e) => setSettings((p) => ({ ...p, metaDescription: e.target.value }))}
              placeholder="Write a compelling description that summarizes your page content..."
              maxLength={160}
              rows={3}
              disabled={!canEdit}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Appears below the title in search results. Optimal length: 120-160 characters</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaKeywords">Meta Keywords</Label>
              <Badge variant="outline">{keywordsCount()} keywords</Badge>
            </div>
            <Input
              id="metaKeywords"
              value={settings.metaKeywords}
              onChange={(e) => setSettings((p) => ({ ...p, metaKeywords: e.target.value }))}
              placeholder="workdo, dashboard, admin, panel, management"
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">Comma-separated keywords relevant to your content</p>
          </div>

          <div className="space-y-2">
            <Label>Meta Image</Label>
            <MediaPicker
              value={settings.metaImage}
              onChange={(url) => setSettings((p) => ({ ...p, metaImage: Array.isArray(url) ? url[0] || "" : url }))}
              placeholder="Select image for social media sharing..."
              showPreview={false}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">Image displayed when sharing on social media. Recommended: 1200x630px</p>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-medium">SEO Preview</h3>
                </div>

                <div className="space-y-4">
                  <div className="border rounded-md p-3 bg-white">
                    <div className="text-xs text-green-600 mb-1">example.com</div>
                    <div className="text-sm font-medium text-blue-600 hover:underline cursor-pointer line-clamp-1">
                      {settings.metaTitle || "Your page title will appear here"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {settings.metaDescription || "Your meta description will appear here in search results..."}
                    </div>
                  </div>

                  {settings.metaImage ? (
                    <div className="border rounded-md bg-white p-3">
                      <div className="text-xs text-muted-foreground mb-2">Social Media Preview</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImagePath(settings.metaImage)}
                        alt="Social preview"
                        className="w-full h-24 object-contain rounded mb-2 bg-gray-100"
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 line-clamp-1">{settings.metaTitle || "Your page title"}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{settings.metaDescription || "Your description..."}</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="border rounded-md p-3 bg-blue-50">
                    <div className="text-xs font-medium text-blue-900 mb-2">SEO Tips</div>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Title: 50-60 characters optimal</li>
                      <li>• Description: 150-160 characters</li>
                      <li>• Include target keywords early</li>
                      <li>• Image: 590x300px works well</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function CacheSection({
  canEdit,
  cacheSize,
  onFlash,
}: {
  canEdit: boolean;
  cacheSize: string;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [isClearing, setIsClearing] = React.useState(false);
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const [size, setSize] = React.useState(cacheSize);

  const handleClearCache = async () => {
    setIsClearing(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings/cache/clear", { method: "POST", credentials: "include" });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to clear cache");
      if (typeof data?.cacheSize === "string") setSize(data.cacheSize);
      toast.success(data?.message || "Cache cleared");
      onFlash({ type: "success", message: data?.message || "Cache cleared." });
    } catch (e: any) {
      toast.error(e?.message || "Failed to clear cache");
      onFlash({ type: "error", message: e?.message || "Failed to clear cache." });
    } finally {
      setIsClearing(false);
    }
  };

  const handleOptimizeSite = async () => {
    setIsOptimizing(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings/cache/optimize", { method: "POST", credentials: "include" });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to optimize site");
      if (typeof data?.cacheSize === "string") setSize(data.cacheSize);
      toast.success(data?.message || "Site optimized");
      onFlash({ type: "success", message: data?.message || "Site optimized." });
    } catch (e: any) {
      toast.error(e?.message || "Failed to optimize site");
      onFlash({ type: "error", message: e?.message || "Failed to optimize site." });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <SectionShell
      title="Cache Settings"
      description="Manage application cache to improve performance"
      icon={HardDrive}
      canEdit={false}
      onSave={() => {}}
      saving={false}
      actions={
        canEdit ? (
          <div className="flex gap-2">
            <Button onClick={handleClearCache} disabled={isClearing} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? "Clearing..." : "Clear Cache"}
            </Button>
            <Button onClick={handleOptimizeSite} disabled={isOptimizing} variant="default" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              {isOptimizing ? "Optimizing..." : "Optimize Site"}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            This is a page meant for more advanced users, simply ignore it if you don't understand what cache is.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            <div>
              <h4 className="font-medium">Current Cache Size</h4>
              <p className="text-sm text-muted-foreground">{size} MB of cached data</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Clearing cache will remove:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Application cache</li>
            <li>Route cache</li>
            <li>View cache</li>
            <li>Configuration cache</li>
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}

function StorageSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const FILE_EXTENSIONS = React.useMemo(
    () => [
      "3dmf",
      "3dm",
      "avi",
      "ai",
      "bin",
      "bmp",
      "cab",
      "c",
      "c++",
      "class",
      "css",
      "csv",
      "cdr",
      "doc",
      "dot",
      "docx",
      "dwg",
      "eps",
      "exe",
      "gif",
      "gz",
      "gtar",
      "flv",
      "fh4",
      "fh5",
      "fhc",
      "help",
      "hlp",
      "html",
      "htm",
      "ico",
      "imap",
      "inf",
      "jpe",
      "jpeg",
      "jpg",
      "js",
      "java",
      "latex",
      "log",
      "m3u",
      "midi",
      "mid",
      "mov",
      "mp4",
      "mp3",
      "mpeg",
      "mpg",
      "mp2",
      "ogg",
      "phtml",
      "php",
      "pdf",
      "pgp",
      "png",
      "pps",
      "ppt",
      "ppz",
      "pot",
      "ps",
      "qt",
      "qd3d",
      "qd3",
      "qxd",
      "rar",
      "ra",
      "ram",
      "rm",
      "rtf",
      "spr",
      "sprite",
      "stream",
      "swf",
      "svg",
      "sgml",
      "sgm",
      "tar",
      "tiff",
      "tif",
      "tgz",
      "tex",
      "txt",
      "vob",
      "wav",
      "wrl",
      "xla",
      "xls",
      "xlc",
      "xml",
      "zip",
      "json",
      "webp",
    ],
    [],
  );

  const [saving, setSaving] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [settings, setSettings] = React.useState({
    storageType: (initial.storageType as "local" | "aws_s3" | "wasabi" | "cloudinary") || "local",
    allowedFileTypes: initial.allowedFileTypes || "jpg,png,webp,gif,jpeg,pdf",
    maxUploadSize: initial.maxUploadSize || "5120",
    awsAccessKeyId: initial.awsAccessKeyId || "",
    awsSecretAccessKey: initial.awsSecretAccessKey || "",
    awsDefaultRegion: initial.awsDefaultRegion || "us-east-1",
    awsBucket: initial.awsBucket || "",
    awsUrl: initial.awsUrl || "",
    awsEndpoint: initial.awsEndpoint || "",
    wasabiAccessKey: initial.wasabiAccessKey || "",
    wasabiSecretKey: initial.wasabiSecretKey || "",
    wasabiRegion: initial.wasabiRegion || "us-east-1",
    wasabiBucket: initial.wasabiBucket || "",
    wasabiUrl: initial.wasabiUrl || "",
    wasabiRoot: initial.wasabiRoot || "",
    cloudinaryCloudName: initial.cloudinaryCloudName || "",
    cloudinaryApiKey: initial.cloudinaryApiKey || "",
    cloudinaryApiSecret: initial.cloudinaryApiSecret || "",
    cloudinaryFolder: initial.cloudinaryFolder || "media",
  });

  const selectedTypes = React.useMemo(
    () => new Set(settings.allowedFileTypes.split(",").map((t) => t.trim()).filter(Boolean)),
    [settings.allowedFileTypes],
  );

  const filteredExtensions = React.useMemo(
    () => FILE_EXTENSIONS.filter((ext) => ext.toLowerCase().includes(searchTerm.toLowerCase())),
    [FILE_EXTENSIONS, searchTerm],
  );

  const handleFileTypeChange = (extension: string, checked: boolean) => {
    const current = new Set(selectedTypes);
    if (checked) current.add(extension);
    else current.delete(extension);
    setSettings((p) => ({ ...p, allowedFileTypes: Array.from(current).join(",") }));
  };

  const handleSelectAll = () => setSettings((p) => ({ ...p, allowedFileTypes: FILE_EXTENSIONS.join(",") }));
  const handleUnselectAll = () => setSettings((p) => ({ ...p, allowedFileTypes: "" }));

  const save = async () => {
    if (!settings.allowedFileTypes.trim()) {
      toast.error("At least one file type must be selected");
      return;
    }
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("storage", settings);
      onFlash({ type: "success", message: "Storage settings saved." });
      toast.success("Storage settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save storage settings." });
      toast.error(e?.message || "Failed to save storage settings.");
    } finally {
      setSaving(false);
    }
  };

  const renderFileTypeSelector = () => (
    <div className="space-y-2">
      <Label>Allowed File Types</Label>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search file types..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleUnselectAll}>
            Unselect All
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto">
          {filteredExtensions.map((ext) => (
            <div key={ext} className="flex gap-2 items-center">
              <Checkbox
                id={`ft-${ext}`}
                checked={selectedTypes.has(ext)}
                onCheckedChange={(checked) => handleFileTypeChange(ext, checked as boolean)}
                disabled={!canEdit}
              />
              <Label htmlFor={`ft-${ext}`} className="text-sm font-normal">
                {ext}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMaxUpload = (id: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>Max Upload Size (KB)</Label>
      <Input
        id={id}
        type="number"
        value={settings.maxUploadSize}
        onChange={(e) => setSettings((p) => ({ ...p, maxUploadSize: e.target.value }))}
        placeholder="5120"
        disabled={!canEdit}
      />
    </div>
  );

  const renderLocal = () => (
    <div className="space-y-6">
      {renderFileTypeSelector()}
      {renderMaxUpload("maxUploadSize")}
    </div>
  );

  const renderAws = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="awsAccessKeyId">AWS Access Key ID</Label>
          <Input id="awsAccessKeyId" value={settings.awsAccessKeyId} onChange={(e) => setSettings((p) => ({ ...p, awsAccessKeyId: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awsSecretAccessKey">AWS Secret Access Key</Label>
          <Input
            id="awsSecretAccessKey"
            type="password"
            value={settings.awsSecretAccessKey}
            onChange={(e) => setSettings((p) => ({ ...p, awsSecretAccessKey: e.target.value }))}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awsDefaultRegion">AWS Default Region</Label>
          <Input id="awsDefaultRegion" value={settings.awsDefaultRegion} onChange={(e) => setSettings((p) => ({ ...p, awsDefaultRegion: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awsBucket">AWS Bucket</Label>
          <Input id="awsBucket" value={settings.awsBucket} onChange={(e) => setSettings((p) => ({ ...p, awsBucket: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awsUrl">AWS URL</Label>
          <Input id="awsUrl" value={settings.awsUrl} onChange={(e) => setSettings((p) => ({ ...p, awsUrl: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="awsEndpoint">AWS Endpoint</Label>
          <Input id="awsEndpoint" value={settings.awsEndpoint} onChange={(e) => setSettings((p) => ({ ...p, awsEndpoint: e.target.value }))} disabled={!canEdit} />
        </div>
      </div>
      <div className="space-y-6">
        {renderFileTypeSelector()}
        {renderMaxUpload("awsMaxUploadSize")}
      </div>
    </div>
  );

  const renderWasabi = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="wasabiAccessKey">Wasabi Access Key</Label>
          <Input id="wasabiAccessKey" value={settings.wasabiAccessKey} onChange={(e) => setSettings((p) => ({ ...p, wasabiAccessKey: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wasabiSecretKey">Wasabi Secret Key</Label>
          <Input id="wasabiSecretKey" type="password" autoComplete="new-password" value={settings.wasabiSecretKey} onChange={(e) => setSettings((p) => ({ ...p, wasabiSecretKey: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wasabiRegion">Wasabi Region</Label>
          <Input id="wasabiRegion" value={settings.wasabiRegion} onChange={(e) => setSettings((p) => ({ ...p, wasabiRegion: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wasabiBucket">Wasabi Bucket</Label>
          <Input id="wasabiBucket" value={settings.wasabiBucket} onChange={(e) => setSettings((p) => ({ ...p, wasabiBucket: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wasabiUrl">Wasabi URL</Label>
          <Input id="wasabiUrl" value={settings.wasabiUrl} onChange={(e) => setSettings((p) => ({ ...p, wasabiUrl: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wasabiRoot">Wasabi Root</Label>
          <Input id="wasabiRoot" value={settings.wasabiRoot} onChange={(e) => setSettings((p) => ({ ...p, wasabiRoot: e.target.value }))} disabled={!canEdit} />
        </div>
      </div>
      <div className="space-y-6">
        {renderFileTypeSelector()}
        {renderMaxUpload("wasabiMaxUploadSize")}
      </div>
    </div>
  );

  const renderCloudinary = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="cloudinaryCloudName">Cloud Name</Label>
          <Input
            id="cloudinaryCloudName"
            value={settings.cloudinaryCloudName}
            onChange={(e) => setSettings((p) => ({ ...p, cloudinaryCloudName: e.target.value }))}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloudinaryApiKey">API Key</Label>
          <Input id="cloudinaryApiKey" value={settings.cloudinaryApiKey} onChange={(e) => setSettings((p) => ({ ...p, cloudinaryApiKey: e.target.value }))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloudinaryApiSecret">API Secret</Label>
          <Input
            id="cloudinaryApiSecret"
            type="password"
            value={settings.cloudinaryApiSecret}
            onChange={(e) => setSettings((p) => ({ ...p, cloudinaryApiSecret: e.target.value }))}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloudinaryFolder">Upload Folder</Label>
          <Input id="cloudinaryFolder" value={settings.cloudinaryFolder} onChange={(e) => setSettings((p) => ({ ...p, cloudinaryFolder: e.target.value }))} disabled={!canEdit} />
        </div>
      </div>
      <div className="space-y-6">
        {renderFileTypeSelector()}
        {renderMaxUpload("cloudinaryMaxUploadSize")}
      </div>
    </div>
  );

  return (
    <SectionShell
      title="Storage Settings"
      description="Configure file storage settings for your application"
      icon={HardDrive}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <Tabs value={settings.storageType} className="w-full" onValueChange={(value) => setSettings((p) => ({ ...p, storageType: value as any }))}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="local" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Local
          </TabsTrigger>
          <TabsTrigger value="aws_s3" className="flex items-center gap-2">
            <span>☁️</span>
            AWS S3
          </TabsTrigger>
          <TabsTrigger value="wasabi" className="flex items-center gap-2">
            <span>🗄️</span>
            Wasabi
          </TabsTrigger>
          <TabsTrigger value="cloudinary" className="flex items-center gap-2">
            <span>☁️</span>
            Cloudinary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="mt-6">
          <h3 className="text-base font-medium mb-4">Local Storage Settings</h3>
          {renderLocal()}
        </TabsContent>

        <TabsContent value="aws_s3" className="mt-6">
          <h3 className="text-base font-medium mb-4">AWS S3 Storage Settings</h3>
          {renderAws()}
        </TabsContent>

        <TabsContent value="wasabi" className="mt-6">
          <h3 className="text-base font-medium mb-4">Wasabi Storage Settings</h3>
          {renderWasabi()}
        </TabsContent>

        <TabsContent value="cloudinary" className="mt-6">
          <h3 className="text-base font-medium mb-4">Cloudinary Storage Settings</h3>
          {renderCloudinary()}
        </TabsContent>
      </Tabs>
    </SectionShell>
  );
}

function EmailSection({
  canEdit,
  initial,
  emailProviders,
  usesPlatformMailDefaults = false,
  onFlash,
  userEmail = "",
  userPhone = "",
}: {
  canEdit: boolean;
  initial: Record<string, string>;
  emailProviders: EmailProvidersMap;
  usesPlatformMailDefaults?: boolean;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
  userEmail?: string;
  userPhone?: string;
}) {
  const [saving, setSaving] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const [settings, setSettings] = React.useState({
    provider: initial.email_provider?.trim() || "smtp",
    driver: initial.email_driver?.trim() || "smtp",
    host: initial.email_host?.trim() || "",
    port: initial.email_port?.trim() || "587",
    username: initial.email_username?.trim() || "",
    password: initial.email_password?.trim() || "",
    encryption: initial.email_encryption?.trim() || "tls",
    fromAddress: initial.email_fromAddress?.trim() || "",
  });

  React.useEffect(() => {
    setSettings({
      provider: initial.email_provider?.trim() || "smtp",
      driver: initial.email_driver?.trim() || "smtp",
      host: initial.email_host?.trim() || "",
      port: initial.email_port?.trim() || "587",
      username: initial.email_username?.trim() || "",
      password: initial.email_password?.trim() || "",
      encryption: initial.email_encryption?.trim() || "tls",
      fromAddress: initial.email_fromAddress?.trim() || "",
    });
  }, [initial]);

  const handleChange = (name: keyof typeof settings, value: string) => {
    if (name === "provider" && emailProviders[value]) {
      const providerConfig = emailProviders[value];
      setSettings((p) => ({
        ...p,
        provider: value,
        driver: providerConfig.driver,
        host: providerConfig.host,
        port: providerConfig.port,
        encryption: providerConfig.encryption,
      }));
      return;
    }
    setSettings((p) => ({ ...p, [name]: value }));
  };

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("email", {
        email_provider: settings.provider,
        email_driver: settings.driver,
        email_host: settings.host,
        email_port: settings.port,
        email_username: settings.username,
        email_password: settings.password,
        email_encryption: settings.encryption,
        email_fromAddress: settings.fromAddress,
      });
      onFlash({ type: "success", message: "Email settings saved." });
      toast.success("Email settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save email settings." });
      toast.error(e?.message || "Failed to save email settings.");
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !canEdit) return;

    setIsSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to send test email");
      toast.success(data?.message || "Test email sent");
      setTestResult({ success: true, message: data?.message || "Test email sent" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send test email");
      setTestResult({ success: false, message: err?.message || "Failed to send test email" });
    } finally {
      setIsSending(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  return (
    <SectionShell
      title="Email Settings"
      description="Each company can configure its own SMTP. Until you save custom values here, outgoing mail uses the platform (superadmin) SMTP defaults."
      icon={Mail}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {usesPlatformMailDefaults ? (
              <div className="rounded-md border border-blue-500/30 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
                Using platform SMTP defaults. Emails will send with these settings. Save changes here to use company-specific SMTP.
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="provider" className="font-medium">
                  Email Provider
                </Label>
                <Select value={settings.provider} onValueChange={(v) => handleChange("provider", v)} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent searchable>
                    {Object.entries(emailProviders).map(([key, provider]) => (
                      <SelectItem key={key} value={key}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="driver" className="font-medium">
                  Mail Driver
                </Label>
                <Input id="driver" value={settings.driver} onChange={(e) => handleChange("driver", e.target.value)} disabled={!canEdit} placeholder="smtp" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="host" className="font-medium">
                  SMTP Host
                </Label>
                <Input id="host" value={settings.host} onChange={(e) => handleChange("host", e.target.value)} disabled={!canEdit} placeholder="smtp.example.com" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="port" className="font-medium">
                  SMTP Port
                </Label>
                <Input id="port" value={settings.port} onChange={(e) => handleChange("port", e.target.value)} disabled={!canEdit} placeholder="587" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="font-medium">
                  SMTP Username
                </Label>
                <Input
                  id="username"
                  value={settings.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  disabled={!canEdit}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-medium">
                  SMTP Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={settings.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    disabled={!canEdit}
                    placeholder={usesPlatformMailDefaults ? "Using platform password" : "••••••••••••"}
                    className="pr-10"
                  />
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="encryption" className="font-medium">
                  Mail Encryption
                </Label>
                <Select value={settings.encryption} onValueChange={(v) => handleChange("encryption", v)} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select encryption" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fromAddress" className="font-medium">
                  From Address
                </Label>
                <Input
                  id="fromAddress"
                  value={settings.fromAddress}
                  onChange={(e) => handleChange("fromAddress", e.target.value)}
                  disabled={!canEdit}
                  placeholder="noreply@example.com"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={sendTestEmail} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Send className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-medium">Test Email Configuration</h3>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="testEmail" className="font-medium">
                    Send Test To
                  </Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Enter an email address to send a test message</p>
                </div>

                {testResult ? (
                  <div
                    className={cn(
                      "p-3 rounded-md text-sm",
                      testResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200",
                    )}
                  >
                    {testResult.message}
                  </div>
                ) : null}

                <Button type="submit" className="w-full" disabled={isSending || !testEmail || !canEdit}>
                  {isSending ? (
                    <>
                      <span className="animate-spin mr-2">◌</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <EmailOtpVerifiedSection
        canEdit={canEdit}
        defaultEmail={userEmail}
        defaultPhone={userPhone}
      />
    </SectionShell>
  );
}

function EmailNotificationsSection({
  user,
  canEdit,
  initial,
  notifications,
  onFlash,
}: {
  user: User;
  canEdit: boolean;
  initial: Record<string, string>;
  notifications: Record<string, NotificationForClient[]>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const perms = user.permissions ?? [];
  const activatedPackages = user.activatedPackages ?? [];
  const [saving, setSaving] = React.useState(false);

  const canEditNotifications = canEdit || perms.includes("*");

  const [settings, setSettings] = React.useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    Object.values(notifications || {}).forEach((moduleNotifications) => {
      moduleNotifications.forEach((n) => {
        out[n.action] = initial[n.action] || "off";
      });
    });
    return out;
  });

  const handleToggle = (action: string, checked: boolean) => {
    setSettings((p) => ({ ...p, [action]: checked ? "on" : "off" }));
  };

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      const payload: Record<string, string> = {};
      Object.values(notifications || {}).forEach((moduleNotifications) => {
        moduleNotifications.forEach((n) => {
          if (!n.action) return;
          if (n.permissions && !perms.includes(n.permissions) && !perms.includes("*")) return;
          payload[n.action] = settings[n.action] || "off";
        });
      });

      await postSettings("email-notifications", payload);
      onFlash({ type: "success", message: "Email notification settings saved." });
      toast.success("Mail Notification Setting saved successfully.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save settings." });
      toast.error(e?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const activatedLower = new Set((activatedPackages ?? []).map((p) => String(p).trim().toLowerCase()).filter(Boolean));
  const filteredModules = Object.keys(notifications || {}).filter(
    (module) => module.toLowerCase() === "general" || activatedLower.has(module.toLowerCase()),
  );

  return (
    <SectionShell
      title="Email Notification Settings"
      description={undefined}
      icon={Mail}
      canEdit={canEditNotifications}
      onSave={save}
      saving={saving}
    >
      {filteredModules.length > 0 ? (
        <Tabs defaultValue={filteredModules[0]}>
          <TabsList className="flex-wrap h-auto">
            {filteredModules.map((module) => (
              <TabsTrigger key={module} value={module} className="capitalize">
                {titleCase(module)}
              </TabsTrigger>
            ))}
          </TabsList>

          {filteredModules.map((module) => (
            <TabsContent key={module} value={module}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(notifications[module] || [])
                  .filter((n) => (n.permissions ? perms.includes(n.permissions) || perms.includes("*") : true))
                  .map((n) => (
                    <div key={n.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{n.action}</span>
                      <Switch
                        checked={(settings[n.action] || "off") === "on"}
                        onCheckedChange={(checked) => handleToggle(n.action, checked)}
                        disabled={!canEditNotifications}
                      />
                    </div>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <p className="text-muted-foreground">No email notifications configured.</p>
      )}
    </SectionShell>
  );
}

function PaymentSettingsSection({
  perms,
  canEdit,
  paymentSubTab,
  onPaymentSubTabClick,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  paymentSubTab: PaymentGatewayTab;
  onPaymentSubTabClick: (sub: PaymentGatewayTab) => void;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Payment Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect Stripe, PayPal, or bank transfer for subscriptions and customer billing.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={paymentSubTab === "stripe" ? "default" : "outline"}
          size="sm"
          onClick={() => onPaymentSubTabClick("stripe")}
        >
          Stripe
        </Button>
        <Button
          type="button"
          variant={paymentSubTab === "paypal" ? "default" : "outline"}
          size="sm"
          onClick={() => onPaymentSubTabClick("paypal")}
        >
          PayPal
        </Button>
        <Button
          type="button"
          variant={paymentSubTab === "bank-transfer" ? "default" : "outline"}
          size="sm"
          onClick={() => onPaymentSubTabClick("bank-transfer")}
        >
          Bank transfer
        </Button>
      </div>
      {paymentSubTab === "stripe" ? (
        <StripeSection perms={perms} canEdit={canEdit} initial={initial} onFlash={onFlash} />
      ) : null}
      {paymentSubTab === "paypal" ? (
        <PaypalSection perms={perms} canEdit={canEdit} initial={initial} onFlash={onFlash} />
      ) : null}
      {paymentSubTab === "bank-transfer" ? (
        <BankTransferSection perms={perms} canEdit={canEdit} initial={initial} onFlash={onFlash} />
      ) : null}
    </div>
  );
}

function BankTransferSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [bankSettings, setBankSettings] = React.useState({
    bankTransferEnabled: initial.bankTransferEnabled === "on",
    instructions: initial.instructions || "",
  });

  const previewHtml = React.useMemo(() => bankSettings.instructions.replace(/<br\s*\/?>/g, "<br/>"), [bankSettings.instructions]);

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("bank-transfer", {
        bankTransferEnabled: bankSettings.bankTransferEnabled ? "on" : "off",
        instructions: bankSettings.instructions,
      });
      onFlash({ type: "success", message: "Bank transfer settings saved." });
      toast.success("Bank transfer settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save bank transfer settings." });
      toast.error(e?.message || "Failed to save bank transfer settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="Bank Transfer Settings"
      description="Configure bank transfer payment method for your customers"
      icon={CreditCard}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="bankTransferEnabled" className="text-base font-medium">
              Enable Bank Transfer
            </Label>
            <p className="text-sm text-muted-foreground mt-1">Allow customers to pay via bank transfer</p>
          </div>
          <Switch
            id="bankTransferEnabled"
            checked={bankSettings.bankTransferEnabled}
            onCheckedChange={(checked) => setBankSettings((p) => ({ ...p, bankTransferEnabled: checked }))}
            disabled={!canEdit}
          />
        </div>

        {bankSettings.bankTransferEnabled ? (
          <>
            <div className="space-y-3">
              <Label htmlFor="instructions">Bank Transfer Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                value={bankSettings.instructions}
                onChange={(e) => setBankSettings((p) => ({ ...p, instructions: e.target.value }))}
                placeholder="Enter bank transfer instructions. Use <br/> for line breaks."
                rows={8}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">These instructions will be shown to customers. You can use &lt;br/&gt; tags for line breaks.</p>
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
              <h4 className="font-medium mb-3">Customer Preview</h4>
              <div className="text-sm">
                {bankSettings.instructions ? (
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">No instructions provided</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </SectionShell>
  );
}

function StripeSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [settings, setSettings] = React.useState({
    stripe_key: initial.stripe_key || "",
    stripe_secret: initial.stripe_secret || "",
    stripe_enabled: initial.stripe_enabled || "off",
  });

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("stripe", {
        ...settings,
        stripe_enabled: settings.stripe_enabled === "on" ? "on" : "off",
      });
      onFlash({ type: "success", message: "Stripe settings saved." });
      toast.success("Stripe settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save stripe settings." });
      toast.error(e?.message || "Failed to save stripe settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="Stripe Settings"
      description="Configure Stripe payment gateway settings"
      icon={CreditCard}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="stripe_enabled" className="text-base font-medium">
              Enable Stripe
            </Label>
            <p className="text-sm text-muted-foreground mt-1">Enable or disable Stripe payment gateway</p>
          </div>
          <Switch
            id="stripe_enabled"
            checked={settings.stripe_enabled === "on"}
            onCheckedChange={(checked) => setSettings((p) => ({ ...p, stripe_enabled: checked ? "on" : "off" }))}
            disabled={!canEdit}
          />
        </div>

        {settings.stripe_enabled === "on" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="stripe_key">Stripe Key</Label>
                <Input
                  id="stripe_key"
                  name="stripe_key"
                  value={settings.stripe_key}
                  onChange={(e) => setSettings((p) => ({ ...p, stripe_key: e.target.value }))}
                  placeholder="Enter Stripe key"
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">Stripe key for client-side integration</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="stripe_secret">Stripe Secret Key</Label>
                <div className="relative">
                  <Input
                    id="stripe_secret"
                    name="stripe_secret"
                    type={showSecret ? "text" : "password"}
                    value={settings.stripe_secret}
                    onChange={(e) => setSettings((p) => ({ ...p, stripe_secret: e.target.value }))}
                    placeholder="Enter Stripe secret key"
                    disabled={!canEdit}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecret((v) => !v)}
                    disabled={!canEdit}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Stripe secret key for server-side integration</p>
              </div>
            </div>

            <div className="lg:col-span-1 border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
              <h4 className="font-medium mb-3 text-blue-900 dark:text-blue-100">How to get Stripe API keys</h4>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">1.</span>
                  <span>
                    Go to{" "}
                    <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                      Stripe Dashboard
                    </a>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">2.</span>
                  <span>Sign in to your Stripe account or create a new one</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">3.</span>
                  <span>Navigate to Developers → API keys</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">4.</span>
                  <span>Copy the "Publishable key" to the first field above</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">5.</span>
                  <span>Reveal and copy the "Secret key" to the second field above</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">6.</span>
                  <span>Use test keys for development and live keys for production</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

function PaypalSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [settings, setSettings] = React.useState({
    paypal_client_id: initial.paypal_client_id || "",
    paypal_secret_key: initial.paypal_secret_key || "",
    paypal_enabled: initial.paypal_enabled || "off",
    paypal_mode: initial.paypal_mode || "sandbox",
  });

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("paypal", {
        ...settings,
        paypal_enabled: settings.paypal_enabled === "on" ? "on" : "off",
      });
      onFlash({ type: "success", message: "PayPal settings saved." });
      toast.success("PayPal settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save PayPal settings." });
      toast.error(e?.message || "Failed to save PayPal settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="PayPal Settings"
      description="Configure PayPal payment gateway settings"
      icon={CreditCard}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="paypal_enabled" className="text-base font-medium">
              Enable PayPal
            </Label>
            <p className="text-sm text-muted-foreground mt-1">Enable or disable PayPal payment gateway</p>
          </div>
          <Switch
            id="paypal_enabled"
            checked={settings.paypal_enabled === "on"}
            onCheckedChange={(checked) => setSettings((p) => ({ ...p, paypal_enabled: checked ? "on" : "off" }))}
            disabled={!canEdit}
          />
        </div>

        {settings.paypal_enabled === "on" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                <Label>PayPal Mode</Label>
                <RadioGroup
                  value={settings.paypal_mode}
                  onValueChange={(value) => setSettings((p) => ({ ...p, paypal_mode: value }))}
                  disabled={!canEdit}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sandbox" id="paypal-sandbox" />
                    <Label htmlFor="paypal-sandbox">Sandbox</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="live" id="paypal-live" />
                    <Label htmlFor="paypal-live">Live</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {settings.paypal_mode === "sandbox"
                    ? "Use sandbox credentials for development and testing"
                    : "Use live credentials for production transactions"}
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="paypal_client_id">PayPal Client ID</Label>
                <Input
                  id="paypal_client_id"
                  name="paypal_client_id"
                  value={settings.paypal_client_id}
                  onChange={(e) => setSettings((p) => ({ ...p, paypal_client_id: e.target.value }))}
                  placeholder="Enter PayPal client ID"
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">PayPal client ID for API integration</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="paypal_secret_key">PayPal Secret Key</Label>
                <div className="relative">
                  <Input
                    id="paypal_secret_key"
                    name="paypal_secret_key"
                    type={showSecret ? "text" : "password"}
                    value={settings.paypal_secret_key}
                    onChange={(e) => setSettings((p) => ({ ...p, paypal_secret_key: e.target.value }))}
                    placeholder="Enter PayPal secret key"
                    disabled={!canEdit}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecret((v) => !v)}
                    disabled={!canEdit}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">PayPal secret key for secure API communication</p>
              </div>
            </div>

            <div className="lg:col-span-1 border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
              <h4 className="font-medium mb-3 text-blue-900 dark:text-blue-100">How to get PayPal API credentials</h4>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">1.</span>
                  <span>
                    Go to{" "}
                    <a href="https://developer.paypal.com/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                      PayPal Developer
                    </a>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">2.</span>
                  <span>Sign in to your PayPal account or create a new one</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">3.</span>
                  <span>Navigate to My Apps & Credentials</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">4.</span>
                  <span>Create a new app or select existing one</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">5.</span>
                  <span>Copy the Client ID and Secret from your app</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[20px]">6.</span>
                  <span>Select "Sandbox" mode for testing or "Live" mode for production</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

function RecurringInvoiceSection({
  canEdit,
  initial,
  onFlash,
}: {
  perms: string[];
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState({
    recurring_sales_purchase_invoices: initial.recurring_sales_purchase_invoices === "on",
  });

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      await postSettings("recurring-invoice", { recurring_sales_purchase_invoices: settings.recurring_sales_purchase_invoices ? "on" : "off" });
      onFlash({ type: "success", message: "Recurring invoice settings saved." });
      toast.success("Recurring invoice settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save recurring invoice settings." });
      toast.error(e?.message || "Failed to save recurring invoice settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      title="Recurring Sales & Purchase Invoice Settings"
      description="Configure global settings for recurring sales and purchase invoices"
      icon={RefreshCw}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label htmlFor="recurring_sales_purchase_invoices" className="text-base font-medium">
              Enable Recurring Sales & Purchase Invoices
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Allow automatic generation of recurring sales and purchase invoices globally
            </p>
          </div>
          <Switch
            id="recurring_sales_purchase_invoices"
            checked={settings.recurring_sales_purchase_invoices}
            onCheckedChange={(checked) => setSettings((p) => ({ ...p, recurring_sales_purchase_invoices: checked }))}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Note</Label>
            <p className="text-sm text-muted-foreground mt-1">
              With the recurring sales invoices & purchase invoices button enabled in settings, easily customize the duplication
              frequency using the custom button. Choose the desired interval for sales invoice & purchase invoice duplication or set
              it to infinity for seamless management of recurring sales invoice & purchase invoice cycles.
            </p>
          </div>

          <div>
            <Label className="text-base font-medium">Recurring Sales Invoice & Purchase Invoice Cronjob Instruction</Label>
            <div className="space-y-2 text-sm text-muted-foreground mt-2">
              <p>1. If you would like to create automatically Recurring Sales Invoice and Purchase Invoice you need set a cron job for that which one run like every day.</p>
              <div className="bg-muted p-3 rounded text-xs font-mono">
                {`0 0 * * * domain && php artisan recurring:sales-purchase-invoices >/dev/null 2>&1`}
              </div>
              <p>2. Example url as</p>
              <div className="bg-muted p-3 rounded text-xs font-mono">
                /usr/local/bin/ea-php82 /home/project/public_html/dash-demo.workdo.io/artisan recurring:sales-purchase-invoices
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <div className="space-y-2">
      <Label>{t(label)}</Label>
      <Input
        type={type}
        inputMode={type === "tel" ? "tel" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ? t(placeholder) : undefined}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{t(label)}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label>{t(label)}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="text-sm font-medium">{t(label)}</div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

const WA_NOTIFICATION_TABS = [
  {
    id: "general",
    label: "General",
    events: [
      { key: "wa_notify_general_new_user", label: "New User" },
      { key: "wa_notify_general_new_sales_invoice", label: "New Sales Invoice" },
      { key: "wa_notify_general_sales_invoice_status_updated", label: "Sales Invoice Status Updated" },
      { key: "wa_notify_general_new_proposal", label: "New Proposal" },
      { key: "wa_notify_general_proposal_status_updated", label: "Proposal Status Updated" },
      { key: "wa_notify_general_new_purchase", label: "New Purchase" },
    ],
  },
  {
    id: "accounting",
    label: "Accounting",
    events: [
      { key: "wa_notify_accounting_new_bill", label: "New Bill" },
      { key: "wa_notify_accounting_bill_paid", label: "Bill Paid" },
      { key: "wa_notify_accounting_new_expense", label: "New Expense" },
      { key: "wa_notify_accounting_expense_approved", label: "Expense Approved" },
      { key: "wa_notify_accounting_expense_rejected", label: "Expense Rejected" },
      { key: "wa_notify_accounting_new_payment", label: "New Payment Received" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    events: [
      { key: "wa_notify_crm_new_lead", label: "New Lead" },
      { key: "wa_notify_crm_lead_status_updated", label: "Lead Status Updated" },
      { key: "wa_notify_crm_new_deal", label: "New Deal" },
      { key: "wa_notify_crm_deal_won", label: "Deal Won" },
      { key: "wa_notify_crm_deal_lost", label: "Deal Lost" },
      { key: "wa_notify_crm_new_contact", label: "New Contact Added" },
    ],
  },
  {
    id: "hrm",
    label: "HRM",
    events: [
      { key: "wa_notify_hrm_new_employee", label: "New Employee" },
      { key: "wa_notify_hrm_leave_requested", label: "Leave Requested" },
      { key: "wa_notify_hrm_leave_approved", label: "Leave Approved" },
      { key: "wa_notify_hrm_leave_rejected", label: "Leave Rejected" },
      { key: "wa_notify_hrm_payroll_processed", label: "Payroll Processed" },
      { key: "wa_notify_hrm_attendance_marked", label: "Attendance Marked" },
    ],
  },
  {
    id: "cmss",
    label: "CMS",
    events: [
      { key: "wa_notify_cmss_new_task", label: "New Task" },
      { key: "wa_notify_cmss_task_assigned", label: "Task Assigned" },
      { key: "wa_notify_cmss_task_completed", label: "Task Completed" },
      { key: "wa_notify_cmss_new_bug", label: "New Bug" },
      { key: "wa_notify_cmss_bug_resolved", label: "Bug Resolved" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    events: [
      { key: "wa_notify_sales_new_order", label: "New Order" },
      { key: "wa_notify_sales_order_completed", label: "Order Completed" },
      { key: "wa_notify_sales_order_cancelled", label: "Order Cancelled" },
      { key: "wa_notify_sales_new_contract", label: "New Contract" },
      { key: "wa_notify_sales_contract_signed", label: "Contract Signed" },
    ],
  },
  {
    id: "project",
    label: "Project",
    events: [
      { key: "wa_notify_project_new_project", label: "New Project" },
      { key: "wa_notify_project_task_assigned", label: "Task Assigned" },
      { key: "wa_notify_project_milestone_reached", label: "Milestone Reached" },
      { key: "wa_notify_project_completed", label: "Project Completed" },
      { key: "wa_notify_project_deadline_approaching", label: "Deadline Approaching" },
    ],
  },
  {
    id: "feedback",
    label: "Feedback",
    events: [
      { key: "wa_notify_feedback_new_ticket", label: "New Ticket" },
      { key: "wa_notify_feedback_ticket_replied", label: "Ticket Replied" },
      { key: "wa_notify_feedback_ticket_resolved", label: "Ticket Resolved" },
      { key: "wa_notify_feedback_ticket_closed", label: "Ticket Closed" },
      { key: "wa_notify_feedback_new_review", label: "New Review" },
    ],
  },
  {
    id: "lms",
    label: "LMS",
    events: [
      { key: "wa_notify_lms_enrollment_confirmation", label: "Enrollment Confirmation" },
      { key: "wa_notify_lms_lesson_completed", label: "Lesson Completed" },
      { key: "wa_notify_lms_class_reminder", label: "Live Class Reminder" },
    ],
  },
];

function WhatsAppApiSection({
  canEdit,
  initial,
  onFlash,
}: {
  canEdit: boolean;
  initial: Record<string, string>;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");
  const [showToken, setShowToken] = React.useState(false);
  const [showPhoneId, setShowPhoneId] = React.useState(false);

  const [settings, setSettings] = React.useState<Record<string, string>>(() => {
    const base: Record<string, string> = {
      wa_enabled: initial.wa_enabled ?? "0",
      wa_phone_number_id: initial.wa_phone_number_id ?? "",
      wa_access_token: initial.wa_access_token ?? "",
    };
    for (const tab of WA_NOTIFICATION_TABS) {
      for (const ev of tab.events) {
        base[ev.key] = initial[ev.key] ?? "0";
      }
    }
    return base;
  });

  const set = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ section: "whatsapp-api", settings }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to save.");
      onFlash({ type: "success", message: "WhatsApp API settings saved." });
      toast.success("WhatsApp API settings saved.");
    } catch (e: any) {
      onFlash({ type: "error", message: e?.message || "Failed to save WhatsApp API settings." });
      toast.error(e?.message || "Failed to save WhatsApp API settings.");
    } finally {
      setSaving(false);
    }
  };

  const currentTab = WA_NOTIFICATION_TABS.find((t) => t.id === activeTab);

  return (
    <SectionShell
      title="WhatsApp API Settings"
      description="Configure WhatsApp API integration settings."
      icon={MessageCircle}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium text-sm">Enable WhatsApp API Integration</p>
            <p className="text-xs text-muted-foreground mt-0.5">Allow notifications to be sent to WhatsApp API</p>
          </div>
          <Switch
            checked={settings.wa_enabled === "1"}
            onCheckedChange={(v) => set("wa_enabled", v ? "1" : "0")}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>WhatsApp Phone Number ID</Label>
            <div className="relative">
              <Input
                type={showPhoneId ? "text" : "password"}
                value={settings.wa_phone_number_id}
                onChange={(e) => set("wa_phone_number_id", e.target.value)}
                placeholder="Enter Phone Number ID"
                disabled={!canEdit}
                autoComplete="new-password"
                name="wa-phone-number-id"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPhoneId((v) => !v)}
              >
                {showPhoneId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>WhatsApp Access Token</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={settings.wa_access_token}
                onChange={(e) => set("wa_access_token", e.target.value)}
                placeholder="Enter Access Token"
                disabled={!canEdit}
                autoComplete="new-password"
                name="wa-access-token"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken((v) => !v)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
            <h4 className="font-medium mb-3 text-blue-900 dark:text-blue-100">
              How to get Phone Number ID &amp; Access Token
            </h4>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[20px]">1.</span>
                <span>
                  Open{" "}
                  <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Meta for Developers
                  </a>{" "}
                  and create a Business app (or open your existing app).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[20px]">2.</span>
                <span>Add the <strong>WhatsApp</strong> product to the app, then connect your Meta Business account.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[20px]">3.</span>
                <span>
                  In the app sidebar go to <strong>WhatsApp → API Setup</strong>. Under the test (or production) phone
                  number, copy the <strong>Phone number ID</strong> into the field above.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[20px]">4.</span>
                <span>
                  For testing: on the same page click <strong>Generate access token</strong> and copy the temporary
                  token. For production: in{" "}
                  <a
                    href="https://business.facebook.com/settings/system-users"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Business Settings → System users
                  </a>
                  , create a system user, assign your WhatsApp Business account, then generate a token with{" "}
                  <strong>whatsapp_business_messaging</strong> (and <strong>whatsapp_business_management</strong> if
                  needed).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[20px]">5.</span>
                <span>Paste the token into <strong>WhatsApp Access Token</strong>, enable integration, and save.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[20px]">6.</span>
                <span>
                  See Meta&apos;s guide:{" "}
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    WhatsApp Cloud API — Get started
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-sm">Notification Settings</p>

          <div className="flex flex-wrap gap-1 border-b pb-2">
            {WA_NOTIFICATION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {currentTab && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {currentTab.events.map((ev) => (
                <div key={ev.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{ev.label}</span>
                  <Switch
                    checked={settings[ev.key] === "1"}
                    onCheckedChange={(v) => set(ev.key, v ? "1" : "0")}
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

