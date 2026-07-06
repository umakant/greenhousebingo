"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ComplianceFrameworkIcon } from "@/components/compliance/compliance-framework-icon";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import {
  CompliancePrimaryButton,
  ComplianceSectionShell,
  complianceCardClass,
} from "@/components/compliance/compliance-ui";
import {
  ComplianceDate,
  complianceRelativeTime,
  useComplianceFormat,
} from "@/components/compliance/compliance-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/admin-t";
import { SETTINGS_TABS, type SettingsTabId } from "@/lib/compliance/compliance-settings-data";

type SettingsPayload = {
  organizationName: string;
  organization: {
    legalName: string;
    website: string;
    primaryEmail: string;
    industry: string;
    country: string;
    phone: string;
    timezone: string;
  };
  toggles: {
    evidenceReminders: boolean;
    autoAssignControls: boolean;
    requireEvidenceApproval: boolean;
    riskScoring: boolean;
    policyAcknowledgements: boolean;
  };
  security: {
    sso: string;
    mfa: string;
    passwordPolicy: string;
    sessionTimeout: string;
  };
  dataRetention: {
    evidenceRetentionYears: number;
    auditLogRetentionYears: number;
    dataResidency: string;
  };
  frameworks: Array<{ id: number; code: string; name: string; enabled: boolean; progressPct: number }>;
  plan: {
    planName: string;
    usersUsed: number;
    usersLimit: number;
    storageUsedGb: number;
    storageTotalGb: number;
    storagePct: number;
    nextBillingDate: string;
  };
  system: {
    instanceId: string;
    environment: string;
    version: string;
    lastUpdated: string;
  };
  roles: Array<{ role: string; description: string }>;
};

type NotificationRow = {
  id: number;
  title: string;
  body: string | null;
  severity: string;
  readAt: string | null;
  createdAt: string;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function SidebarLinkRow({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-sm hover:bg-muted/40"
      onClick={() => toast.message(t("Detailed settings coming soon."))}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 font-medium">
        {value}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </span>
    </button>
  );
}

export function ComplianceSettingsClient() {
  const { fmtDateTime } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<SettingsPayload | null>(null);
  const [activeTab, setActiveTab] = React.useState<SettingsTabId>("organization");
  const [editingOrg, setEditingOrg] = React.useState(false);
  const [orgForm, setOrgForm] = React.useState<SettingsPayload["organization"] & { organizationName: string }>({
    organizationName: "",
    legalName: "",
    website: "",
    primaryEmail: "",
    industry: "",
    country: "",
    phone: "",
    timezone: "",
  });
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);
  const [scanning, setScanning] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, nRes] = await Promise.all([
        fetch("/api/compliance/settings", { credentials: "include" }),
        fetch("/api/compliance/notifications", { credentials: "include" }),
      ]);
      const sData = (await sRes.json().catch(() => null)) as SettingsPayload & { ok?: boolean };
      const nData = (await nRes.json().catch(() => null)) as { ok?: boolean; items?: NotificationRow[] };
      if (sRes.ok && sData?.ok) {
        setData(sData);
        setOrgForm({
          organizationName: sData.organizationName,
          ...sData.organization,
        });
      }
      if (nRes.ok && nData?.ok) setNotifications(nData.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const patchSettings = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as SettingsPayload & { ok?: boolean };
      if (res.ok && json?.ok) {
        setData(json);
        setOrgForm({ organizationName: json.organizationName, ...json.organization });
        toast.success(t("Settings saved"));
      } else {
        toast.error(t("Save failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const saveOrganization = async () => {
    await patchSettings({
      organizationName: orgForm.organizationName,
      organization: {
        legalName: orgForm.legalName,
        website: orgForm.website,
        primaryEmail: orgForm.primaryEmail,
        industry: orgForm.industry,
        country: orgForm.country,
        phone: orgForm.phone,
        timezone: orgForm.timezone,
      },
    });
    setEditingOrg(false);
  };

  const toggleSetting = async (key: keyof SettingsPayload["toggles"], value: boolean) => {
    if (!data) return;
    setData({ ...data, toggles: { ...data.toggles, [key]: value } });
    await patchSettings({ toggles: { [key]: value } });
  };

  const runNotificationScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/compliance/notifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; created?: number };
      if (res.ok && json?.ok) {
        toast.success(t(`Created ${json.created ?? 0} notification(s)`));
        void load();
      }
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {t("Could not load settings.")}
      </div>
    );
  }

  const toggleItems = [
    {
      key: "evidenceReminders" as const,
      title: t("Enable automated evidence reminders"),
      description: t("Send reminders when evidence is due or expiring."),
    },
    {
      key: "autoAssignControls" as const,
      title: t("Auto-assign controls to new frameworks"),
      description: t("Automatically map controls when a framework is enabled."),
    },
    {
      key: "requireEvidenceApproval" as const,
      title: t("Require approval for evidence"),
      description: t("Evidence must be reviewed before it counts toward readiness."),
    },
    {
      key: "riskScoring" as const,
      title: t("Enable risk scoring"),
      description: t("Calculate risk scores from likelihood and impact."),
    },
    {
      key: "policyAcknowledgements" as const,
      title: t("Allow policy acknowledgements"),
      description: t("Employees can acknowledge published policies in the portal."),
    },
  ];

  return (
    <ComplianceSectionShell
      title={t("Settings")}
      description={t("Manage your organization, preferences, and system configuration.")}
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTabId)} className="space-y-5">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-1 data-[state=active]:border-[#E31B23] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t(tab.label)}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-5">
            <TabsContent value="organization" className="mt-0 space-y-5">
              <Card className={complianceCardClass}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{t("Organization Profile")}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("Update your organization's basic information.")}
                    </p>
                  </div>
                  {!editingOrg ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingOrg(true)}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      {t("Edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingOrg(false)}>
                        {t("Cancel")}
                      </Button>
                      <CompliancePrimaryButton type="button" disabled={saving} onClick={() => void saveOrganization()}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
                      </CompliancePrimaryButton>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                      <Building2 className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-semibold">{data.organizationName}</p>
                      <p className="text-sm text-muted-foreground">{data.organization.industry}</p>
                    </div>
                  </div>

                  {editingOrg ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>{t("Organization Name")}</Label>
                        <Input
                          className="mt-1"
                          value={orgForm.organizationName}
                          onChange={(e) => setOrgForm((f) => ({ ...f, organizationName: e.target.value }))}
                        />
                      </div>
                      {(
                        [
                          ["legalName", t("Legal Name")],
                          ["website", t("Website")],
                          ["primaryEmail", t("Primary Email")],
                          ["industry", t("Industry")],
                          ["country", t("Country")],
                          ["phone", t("Phone")],
                          ["timezone", t("Time Zone")],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key}>
                          <Label>{label}</Label>
                          <Input
                            className="mt-1"
                            value={orgForm[key]}
                            onChange={(e) => setOrgForm((f) => ({ ...f, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ReadOnlyField label={t("Organization Name")} value={data.organizationName} />
                      <ReadOnlyField label={t("Legal Name")} value={data.organization.legalName} />
                      <ReadOnlyField label={t("Website")} value={data.organization.website} />
                      <ReadOnlyField label={t("Primary Email")} value={data.organization.primaryEmail} />
                      <ReadOnlyField label={t("Industry")} value={data.organization.industry} />
                      <ReadOnlyField label={t("Country")} value={data.organization.country} />
                      <ReadOnlyField label={t("Phone")} value={data.organization.phone} />
                      <ReadOnlyField label={t("Time Zone")} value={data.organization.timezone} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={complianceCardClass}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{t("Default Frameworks")}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("Manage the frameworks your organization is using.")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/compliance/frameworks">{t("Manage Frameworks")}</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.frameworks.map((fw) => (
                      <div key={fw.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <ComplianceFrameworkIcon code={fw.code} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{fw.name}</p>
                          <p className="text-xs text-emerald-600">{fw.enabled ? t("Enabled") : t("Disabled")}</p>
                        </div>
                      </div>
                    ))}
                    <Link
                      href="/compliance/frameworks"
                      className="flex min-h-[72px] items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      {t("Add Framework")}
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className={complianceCardClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("Compliance Settings")}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("Configure how compliance is managed in your organization.")}
                  </p>
                </CardHeader>
                <CardContent className="divide-y">
                  {toggleItems.map((item) => (
                    <div key={item.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        checked={data.toggles[item.key]}
                        onCheckedChange={(v) => void toggleSetting(item.key, v)}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <Card className={complianceCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    {t("Users & Roles")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("Role-based access for compliance module users.")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.roles.map((r) => (
                    <div key={r.role} className="rounded-lg border p-4">
                      <p className="font-medium">{r.role}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {t("Tenant isolation enforced on all API routes via organizationId.")}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0 space-y-4">
              <Card className={complianceCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    {t("Security Settings")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {[
                    [t("Single Sign-On"), data.security.sso],
                    [t("Multi-Factor Authentication"), data.security.mfa],
                    [t("Password Policy"), data.security.passwordPolicy],
                    [t("Session Timeout"), data.security.sessionTimeout],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card className={complianceCardClass}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bell className="h-4 w-4" />
                      {t("Notifications")}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("Compliance alerts for evidence, controls, audits, and reviews.")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => void runNotificationScan()} disabled={scanning}>
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Run scan")}
                  </Button>
                </CardHeader>
                <CardContent className="max-h-96 space-y-2 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("No notifications.")}</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{n.title}</span>
                          <ComplianceStatusBadge status={n.severity} />
                        </div>
                        {n.body ? <p className="mt-1 text-muted-foreground">{n.body}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">{complianceRelativeTime(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="mt-0">
              <Card className={complianceCardClass}>
                <CardHeader>
                  <CardTitle className="text-base">{t("System Information")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">{t("Instance ID")}</span>
                    <span className="font-medium">{data.system.instanceId}</span>
                  </div>
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">{t("Environment")}</span>
                    <span className="font-medium">{data.system.environment}</span>
                  </div>
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">{t("Version")}</span>
                    <span className="font-medium">{data.system.version}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">{t("Last Updated")}</span>
                    <span className="font-medium">{fmtDateTime(data.system.lastUpdated)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="mt-0">
              <Card className={complianceCardClass}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="font-medium">{t("Integration settings")}</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {t("Manage connected systems, sync scopes, and credentials from the Integrations page.")}
                  </p>
                  <Button className="mt-4" variant="outline" asChild>
                    <Link href="/compliance/integrations">{t("Open Integrations")}</Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-0">
              <Card className={complianceCardClass}>
                <CardHeader>
                  <CardTitle className="text-base">{t("Billing & Plan")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Current Plan")}</p>
                    <p className="text-2xl font-semibold text-violet-600">{data.plan.planName}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t("Users")}</p>
                      <p className="text-lg font-semibold">
                        {data.plan.usersUsed} / {data.plan.usersLimit}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t("Storage Used")}</p>
                      <p className="text-lg font-semibold">
                        {data.plan.storageUsedGb} GB / {data.plan.storageTotalGb} GB
                      </p>
                      <Progress value={data.plan.storagePct} className="mt-2 h-1.5" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("Next Billing Date")}: <ComplianceDate value={data.plan.nextBillingDate} />
                  </p>
                  <Button variant="outline" onClick={() => toast.message(t("Billing portal coming soon."))}>
                    {t("View Billing")}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Right sidebar — visible on Organization tab primarily but useful globally */}
          <div className="space-y-4">
            <Card className={complianceCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t("Your Plan")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("Current Plan")}</p>
                  <p className="text-lg font-semibold text-violet-600">{data.plan.planName}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setActiveTab("billing")}>
                  {t("View Billing")}
                </Button>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("Users")}</span>
                    <span className="font-medium">
                      {data.plan.usersUsed}/{data.plan.usersLimit}
                    </span>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-muted-foreground">
                      <span>{t("Storage Used")}</span>
                      <span>
                        {data.plan.storageUsedGb} GB / {data.plan.storageTotalGb} GB
                      </span>
                    </div>
                    <Progress value={data.plan.storagePct} className="h-1.5" />
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">{t("Next Billing Date")}</span>
                    <span className="font-medium">
                      <ComplianceDate value={data.plan.nextBillingDate} />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={complianceCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t("Security Settings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <SidebarLinkRow label={t("Single Sign-On")} value={data.security.sso} />
                <SidebarLinkRow label={t("Multi-Factor Authentication")} value={data.security.mfa} />
                <SidebarLinkRow label={t("Password Policy")} value={data.security.passwordPolicy} />
                <SidebarLinkRow label={t("Session Timeout")} value={data.security.sessionTimeout} />
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                  onClick={() => setActiveTab("security")}
                >
                  {t("View Security Settings")} →
                </button>
              </CardContent>
            </Card>

            <Card className={complianceCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t("Data & Retention")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Evidence Retention")}</span>
                  <span className="font-medium">
                    {data.dataRetention.evidenceRetentionYears} {t("years")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Audit Log Retention")}</span>
                  <span className="font-medium">
                    {data.dataRetention.auditLogRetentionYears} {t("years")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Data Residency")}</span>
                  <span className="font-medium">{data.dataRetention.dataResidency}</span>
                </div>
                <button
                  type="button"
                  className="pt-1 text-xs font-medium text-primary hover:underline"
                  onClick={() => toast.message(t("Data settings coming soon."))}
                >
                  {t("Manage Data Settings")} →
                </button>
              </CardContent>
            </Card>

            <Card className={complianceCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t("System Information")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("Instance ID")}</span>
                  <span className="font-medium">{data.system.instanceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Environment")}</span>
                  <span className="font-medium">{data.system.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Last Updated")}</span>
                  <span className="font-medium">{fmtDateTime(data.system.lastUpdated)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Version")}</span>
                  <span className="font-medium">{data.system.version}</span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"
                  onClick={() => setActiveTab("system")}
                >
                  {t("View System Status")}
                  <ExternalLink className="h-3 w-3" />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </ComplianceSectionShell>
  );
}
