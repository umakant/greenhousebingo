"use client";

import * as React from "react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Link2,
  Loader2,
  Lock,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import {
  TrustProfileStatusBadge,
  trustVisibilityDisplay,
} from "@/components/compliance/compliance-status-badge";
import {
  COMPLIANCE_DONUT_COLORS,
  DonutWithLegend,
  type DonutSlice,
} from "@/components/compliance/compliance-donut-chart";
import {
  ComplianceRowActions,
  ComplianceSectionShell,
  complianceCardClass,
  complianceTableHeadClass,
  complianceTableRowClass,
} from "@/components/compliance/compliance-ui";
import {
  ComplianceDate,
  complianceRelativeTime,
  useComplianceFormat,
} from "@/components/compliance/compliance-shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/admin-t";
import { COMPLIANCE_DOC_ACCESS_LEVELS, COMPLIANCE_TRUST_SECTIONS } from "@/lib/compliance/compliance-day2";
import { cn } from "@/lib/utils";

type TrustProfileRow = {
  id: string;
  name: string;
  description?: string;
  status: string;
  visibility: string;
  frameworks: string[];
  ownerName: string;
  isDefault?: boolean;
  profileLink: string | null;
  lastUpdatedAt: string;
};

type SharedLinkRow = {
  id: string;
  name: string;
  profileId: string;
  profileName?: string;
  views: number;
  createdAt?: string;
  lastViewedAt?: string;
};

type QuestionnaireRow = {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  recipient?: string;
};

type ActivityRow = {
  id: string;
  message: string;
  actorName: string;
  createdAt: string;
  type: string;
};

type TrustStats = {
  activeProfiles: number;
  sharedLinks: number;
  questionnaires: number;
  questionnairesDueSoon: number;
  downloads: number;
  activeProfilesHint: string;
  sharedLinksHint: string;
  questionnairesHint: string;
  downloadsHint: string;
};

type TrustConfig = {
  published: boolean;
  publicSlug: string | null;
  publicUrl: string | null;
  auditorPortalEnabled: boolean;
  activeAuditors: number;
  organizationName: string | null;
  sections: Record<string, { enabled?: boolean; headline?: string; body?: string }>;
};

type ProfileDetail = {
  item: TrustProfileRow & {
    coverage: {
      overallPct: number;
      implemented: { count: number; pct: number };
      partial: { count: number; pct: number };
      notImplemented: { count: number; pct: number };
    };
    createdAt: string;
    published: boolean;
  };
  sharedLinks: SharedLinkRow[];
  history: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
};

const MAIN_TABS = [
  { id: "profiles", label: "Profiles" },
  { id: "shared-links", label: "Shared Links" },
  { id: "questionnaires", label: "Questionnaires" },
  { id: "activity", label: "Activity Log" },
] as const;

function ownerInitials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function VisibilityCell({ visibility }: { visibility: string }) {
  const { label } = trustVisibilityDisplay(visibility);
  const Icon = visibility === "public" ? Globe : visibility === "unlisted" ? Link2 : Lock;
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function coverageDonut(coverage: ProfileDetail["item"]["coverage"]): DonutSlice[] {
  return [
    { name: t("Implemented"), value: coverage.implemented.count, color: COMPLIANCE_DONUT_COLORS.green },
    { name: t("Partial"), value: coverage.partial.count, color: COMPLIANCE_DONUT_COLORS.amber },
    { name: t("Not Implemented"), value: coverage.notImplemented.count, color: COMPLIANCE_DONUT_COLORS.gray },
  ].filter((s) => s.value > 0);
}

export function ComplianceTrustCenterClient() {
  const { fmtDate } = useComplianceFormat();
  const [loading, setLoading] = React.useState(true);
  const [config, setConfig] = React.useState<TrustConfig | null>(null);
  const [profiles, setProfiles] = React.useState<TrustProfileRow[]>([]);
  const [sharedLinks, setSharedLinks] = React.useState<SharedLinkRow[]>([]);
  const [questionnaires, setQuestionnaires] = React.useState<QuestionnaireRow[]>([]);
  const [stats, setStats] = React.useState<TrustStats | null>(null);
  const [recentActivity, setRecentActivity] = React.useState<ActivityRow[]>([]);
  const [frameworkOptions, setFrameworkOptions] = React.useState<string[]>([]);
  const [ownerOptions, setOwnerOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [frameworkFilter, setFrameworkFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState("profiles");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ProfileDetail | null>(null);
  const [detailTab, setDetailTab] = React.useState("overview");
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (frameworkFilter !== "all") params.set("framework", frameworkFilter);
      if (ownerFilter !== "all") params.set("owner", ownerFilter);
      const res = await fetch(`/api/compliance/trust-center?${params}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        item?: TrustConfig;
        profiles?: TrustProfileRow[];
        sharedLinks?: SharedLinkRow[];
        questionnaires?: QuestionnaireRow[];
        stats?: TrustStats;
        recentActivity?: ActivityRow[];
        frameworks?: string[];
        owners?: string[];
        pageSections?: TrustConfig["sections"];
      };
      if (res.ok && data?.ok && data.item) {
        setConfig({
          ...data.item,
          sections: data.pageSections ?? data.item.sections ?? {},
        });
        setProfiles(data.profiles ?? []);
        setSharedLinks(data.sharedLinks ?? []);
        setQuestionnaires(data.questionnaires ?? []);
        setStats(data.stats ?? null);
        setRecentActivity(data.recentActivity ?? []);
        setFrameworkOptions(data.frameworks ?? []);
        setOwnerOptions(data.owners ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, frameworkFilter, ownerFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, frameworkFilter, ownerFilter, activeTab, perPage]);

  const tabItems =
    activeTab === "shared-links"
      ? sharedLinks
      : activeTab === "questionnaires"
        ? questionnaires
        : activeTab === "activity"
          ? recentActivity
          : profiles;

  const total = activeTab === "profiles" ? profiles.length : tabItems.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);
  const profileSlice = profiles.slice((safePage - 1) * perPage, safePage * perPage);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailTab("overview");
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/compliance/trust-center/profiles/${id}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as ProfileDetail & { ok?: boolean; item?: ProfileDetail["item"] };
      if (res.ok && data?.ok && data.item) {
        setDetail({ item: data.item, sharedLinks: data.sharedLinks ?? [], history: data.history ?? [] });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const patchTrust = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/trust-center", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(t("Trust center updated"));
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const createProfile = async () => {
    if (!newProfileName.trim()) return toast.error(t("Profile name required"));
    setSaving(true);
    try {
      await patchTrust({ addProfile: { name: newProfileName.trim(), visibility: "private" } });
      setCreateOpen(false);
      setNewProfileName("");
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (id: string, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      await patchTrust({ updateProfile: { id, ...payload } });
      if (detailId === id) void openDetail(id);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (url: string | null) => {
    if (!url) return toast.error(t("No link available"));
    void navigator.clipboard.writeText(`${window.location.origin}${url}`);
    toast.success(t("Link copied"));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === profileSlice.length) setSelected(new Set());
    else setSelected(new Set(profileSlice.map((r) => r.id)));
  };

  const exportCsv = () => {
    const header = ["Profile", "Frameworks", "Status", "Last Updated", "Owner", "Visibility"];
    const rows = profiles.map((r) => [
      r.name,
      r.frameworks.join("; "),
      r.status,
      fmtDate(r.lastUpdatedAt),
      r.ownerName,
      r.visibility,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trust-center-profiles.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !config) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = stats
    ? [
        {
          label: t("Active Profiles"),
          value: stats.activeProfiles,
          hint: stats.activeProfilesHint,
          icon: Building2,
          tone: "text-violet-600",
          bg: "bg-violet-100 text-violet-600",
        },
        {
          label: t("Shared Links"),
          value: stats.sharedLinks,
          hint: stats.sharedLinksHint,
          icon: Share2,
          tone: "text-blue-600",
          bg: "bg-blue-100 text-blue-600",
        },
        {
          label: t("Questionnaires"),
          value: stats.questionnaires,
          hint: stats.questionnairesHint,
          icon: ClipboardList,
          tone: stats.questionnairesDueSoon ? "text-amber-600" : "text-emerald-600",
          bg: stats.questionnairesDueSoon ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600",
        },
        {
          label: t("Downloads"),
          value: stats.downloads,
          hint: stats.downloadsHint,
          icon: Download,
          tone: "text-slate-600",
          bg: "bg-slate-100 text-slate-600",
        },
      ]
    : [];

  return (
    <>
      <ComplianceSectionShell
        title={t("Trust Center")}
        description={t("Centralize and share your security posture with customers and partners.")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-1.5 h-4 w-4" />
              {t("Manage Profiles")}
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("Create Profile")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((s) => (
              <Card key={s.label} className={complianceCardClass}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", s.tone)}>{s.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
                      <button type="button" className="mt-2 text-xs text-violet-600 hover:underline">
                        {t("View all")} →
                      </button>
                    </div>
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", s.bg)}>
                      <s.icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className={cn(complianceCardClass, "overflow-hidden")}>
            <div className="flex gap-1 overflow-x-auto border-b px-4 pt-2">
              {MAIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 border-b-2 px-3 pb-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "border-[#E31B23] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(tab.label)}
                </button>
              ))}
            </div>

            {activeTab === "profiles" ? (
              <>
                <Card className="m-4 border-0 shadow-none">
                  <CardContent className="flex flex-col gap-3 p-0 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="h-9 bg-background pl-8"
                          placeholder={t("Search profiles...")}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
                        <SelectTrigger className="h-9 w-[150px] bg-background">
                          <SelectValue placeholder={t("All Frameworks")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("All Frameworks")}</SelectItem>
                          {frameworkOptions.map((fw) => (
                            <SelectItem key={fw} value={fw}>
                              {fw}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-[140px] bg-background">
                          <SelectValue placeholder={t("All Statuses")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("All Statuses")}</SelectItem>
                          <SelectItem value="published">{t("Published")}</SelectItem>
                          <SelectItem value="in_review">{t("In Review")}</SelectItem>
                          <SelectItem value="draft">{t("Draft")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                        <SelectTrigger className="h-9 w-[140px] bg-background">
                          <SelectValue placeholder={t("All Owners")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("All Owners")}</SelectItem>
                          {ownerOptions.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" onClick={() => toast.message(t("Advanced filters coming soon."))}>
                        <Filter className="mr-1.5 h-4 w-4" />
                        {t("Filters")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportCsv} disabled={!profiles.length}>
                        <Download className="mr-1.5 h-4 w-4" />
                        {t("Export")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <CardContent className="p-0 pt-0">
                  {loading ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : profileSlice.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Building2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                      <p className="font-medium">{t("No trust profiles")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("Create a profile to share your security posture with customers.")}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={complianceTableHeadClass}>
                            <th className="w-10 px-4 py-3">
                              <Checkbox
                                checked={profileSlice.length > 0 && selected.size === profileSlice.length}
                                onCheckedChange={toggleSelectAll}
                              />
                            </th>
                            <th className="px-4 py-3">{t("Profile Name")}</th>
                            <th className="px-4 py-3">{t("Frameworks")}</th>
                            <th className="px-4 py-3">{t("Status")}</th>
                            <th className="px-4 py-3">{t("Last Updated")}</th>
                            <th className="px-4 py-3">{t("Owner")}</th>
                            <th className="px-4 py-3">{t("Visibility")}</th>
                            <th className="w-16 px-4 py-3">{t("Actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileSlice.map((row) => (
                            <tr
                              key={row.id}
                              className={cn(
                                complianceTableRowClass,
                                "cursor-pointer",
                                detailId === row.id && "bg-[#E31B23]/5",
                              )}
                              onClick={() => void openDetail(row.id)}
                            >
                              <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                                <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-start gap-2">
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                                    <Building2 className="h-4 w-4 text-violet-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{row.name}</p>
                                    {row.description ? (
                                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.description}</p>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap gap-1">
                                  {row.frameworks.slice(0, 2).map((fw) => (
                                    <Badge key={fw} variant="outline" className="font-normal text-xs">
                                      {fw}
                                    </Badge>
                                  ))}
                                  {row.frameworks.length > 2 ? (
                                    <Badge variant="outline" className="font-normal text-xs">
                                      +{row.frameworks.length - 2}
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <TrustProfileStatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground">
                                <ComplianceDate value={row.lastUpdatedAt} />
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                      {ownerInitials(row.ownerName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-muted-foreground">{row.ownerName}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <VisibilityCell visibility={row.visibility} />
                              </td>
                              <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <ComplianceRowActions
                                  label={t("View")}
                                  onView={() => void openDetail(row.id)}
                                  items={[
                                    { label: "Copy link", onSelect: () => copyLink(row.profileLink) },
                                    { label: "Publish", onSelect: () => void updateProfile(row.id, { status: "published" }) },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>

                {!loading && profiles.length > 0 ? (
                  <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <Pagination
                      page={safePage}
                      lastPage={lastPage}
                      total={total}
                      from={from}
                      to={to}
                      onPageChange={setPage}
                      entityLabel={t("profiles")}
                    />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t("Show")}</span>
                      <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                        <SelectTrigger className="h-8 w-[72px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>{t("per page")}</span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : activeTab === "shared-links" ? (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="px-4 py-3">{t("Link Name")}</th>
                        <th className="px-4 py-3">{t("Profile")}</th>
                        <th className="px-4 py-3">{t("Views")}</th>
                        <th className="px-4 py-3">{t("Created")}</th>
                        <th className="px-4 py-3">{t("Last Viewed")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharedLinks.map((link) => (
                        <tr key={link.id} className={complianceTableRowClass}>
                          <td className="px-4 py-3.5 font-medium">{link.name}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">{link.profileName ?? "—"}</td>
                          <td className="px-4 py-3.5 tabular-nums">{link.views}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={link.createdAt} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={link.lastViewedAt} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            ) : activeTab === "questionnaires" ? (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={complianceTableHeadClass}>
                        <th className="px-4 py-3">{t("Questionnaire")}</th>
                        <th className="px-4 py-3">{t("Recipient")}</th>
                        <th className="px-4 py-3">{t("Status")}</th>
                        <th className="px-4 py-3">{t("Due Date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionnaires.map((q) => (
                        <tr key={q.id} className={complianceTableRowClass}>
                          <td className="px-4 py-3.5 font-medium">{q.title}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">{q.recipient ?? "—"}</td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-0 font-medium capitalize",
                                q.status === "due_soon" && "bg-amber-100 text-amber-800",
                                q.status === "completed" && "bg-emerald-100 text-emerald-800",
                                q.status === "open" && "bg-blue-100 text-blue-800",
                              )}
                            >
                              {q.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            <ComplianceDate value={q.dueDate} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            ) : (
              <CardContent className="divide-y p-0">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {a.type === "view" ? (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      ) : a.type === "share" ? (
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{a.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {complianceRelativeTime(a.createdAt)} · {a.actorName}
                      </p>
                    </div>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {ownerInitials(a.actorName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {activeTab === "profiles" && recentActivity.length > 0 ? (
            <Card className={complianceCardClass}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">{t("Recent Activity")}</p>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
                    onClick={() => setActiveTab("activity")}
                  >
                    {t("View all activity")} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {recentActivity.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 text-sm">
                      <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{a.message}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{complianceRelativeTime(a.createdAt)}</span>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                          {ownerInitials(a.actorName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </ComplianceSectionShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Create Profile")}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>{t("Profile name")}</Label>
            <Input
              className="mt-1"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder={t("Security Profile 2026")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => void createProfile()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Trust Center Settings")}</DialogTitle>
          </DialogHeader>
          {config ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Globe className="h-4 w-4" /> {t("Trust Center")}
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t("Published")}</Label>
                      <Switch
                        checked={config.published}
                        onCheckedChange={(v) => void patchTrust({ published: v })}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Label>{t("Public slug")}</Label>
                      <Input
                        className="mt-1"
                        defaultValue={config.publicSlug ?? ""}
                        onBlur={(e) => void patchTrust({ publicSlug: e.target.value })}
                      />
                      {config.publicUrl ? (
                        <a
                          href={config.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 flex items-center gap-1 text-xs text-primary"
                        >
                          {config.publicUrl} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Shield className="h-4 w-4" /> {t("Auditor Portal")}
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t("Portal enabled")}</Label>
                      <Switch
                        checked={config.auditorPortalEnabled}
                        onCheckedChange={(v) => void patchTrust({ auditorPortalEnabled: v })}
                        disabled={saving}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.activeAuditors} {t("active auditor invite(s)")}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">{t("Trust page sections")}</p>
                {COMPLIANCE_TRUST_SECTIONS.map((s) => {
                  const sec = config.sections[s.key] ?? {};
                  return (
                    <div key={s.key} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Label>{s.label}</Label>
                        <Switch
                          checked={sec.enabled !== false}
                          onCheckedChange={(v) => {
                            const next = {
                              ...config.sections,
                              [s.key]: { ...sec, enabled: v, headline: s.label },
                            };
                            void patchTrust({ sections: next });
                          }}
                        />
                      </div>
                      <Textarea
                        placeholder={`${s.label} content for ${config.organizationName ?? "your organization"}`}
                        defaultValue={sec.body ?? ""}
                        onBlur={(e) => {
                          const next = {
                            ...config.sections,
                            [s.key]: { ...sec, body: e.target.value, headline: s.label },
                          };
                          void patchTrust({ sections: next });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("Document access levels")}: {COMPLIANCE_DOC_ACCESS_LEVELS.map((l) => l.label).join(" · ")}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[520px]">
          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="border-b px-6 py-4 text-left">
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <Building2 className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-lg leading-tight">{detail.item.name}</SheetTitle>
                      <TrustProfileStatusBadge status={detail.item.status} />
                    </div>
                    {detail.item.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{detail.item.description}</p>
                    ) : null}
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 h-auto w-auto justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {[
                    { id: "overview", label: t("Overview") },
                    { id: "frameworks", label: t("Frameworks") },
                    { id: "shared-links", label: t("Shared Links") },
                    { id: "activity", label: t("Activity") },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="rounded-none border-b-2 border-transparent px-3 pb-2 data-[state=active]:border-[#E31B23] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  <TabsContent value="overview" className="mt-0 space-y-5">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <MetaRow label={t("Visibility")}>
                        <VisibilityCell visibility={detail.item.visibility} />
                      </MetaRow>
                      <MetaRow label={t("Frameworks")}>
                        <span>{detail.item.frameworks.join(", ") || "—"}</span>
                      </MetaRow>
                      <MetaRow label={t("Owner")}>
                        <span className="flex items-center justify-end gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {ownerInitials(detail.item.ownerName)}
                            </AvatarFallback>
                          </Avatar>
                          {detail.item.ownerName}
                        </span>
                      </MetaRow>
                      <MetaRow label={t("Last Updated")}>
                        <ComplianceDate value={detail.item.lastUpdatedAt} />
                      </MetaRow>
                      <MetaRow label={t("Profile Link")}>
                        {detail.item.profileLink ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            onClick={() => copyLink(detail.item.profileLink)}
                          >
                            {detail.item.profileLink}
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : (
                          "—"
                        )}
                      </MetaRow>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("Framework Coverage")}
                      </p>
                      <div className="flex flex-col items-center gap-4 rounded-lg border p-4 sm:flex-row">
                        <DonutWithLegend
                          data={coverageDonut(detail.item.coverage)}
                          centerLabel={`${detail.item.coverage.overallPct}%`}
                          size={140}
                        />
                        <div className="flex-1 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("Implemented")}</span>
                            <span className="font-medium">
                              {detail.item.coverage.implemented.count} ({detail.item.coverage.implemented.pct}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("Partial")}</span>
                            <span className="font-medium">
                              {detail.item.coverage.partial.count} ({detail.item.coverage.partial.pct}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("Not Implemented")}</span>
                            <span className="font-medium">
                              {detail.item.coverage.notImplemented.count} ({detail.item.coverage.notImplemented.pct}%)
                            </span>
                          </div>
                          <p className="pt-1 text-xs text-muted-foreground">
                            {detail.item.coverage.overallPct}% {t("Overall")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {detail.sharedLinks.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Shared Links")}
                        </p>
                        <div className="divide-y rounded-lg border">
                          {detail.sharedLinks.slice(0, 3).map((link) => (
                            <div key={link.id} className="flex items-center justify-between px-4 py-3 text-sm">
                              <span className="font-medium">{link.name}</span>
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <Eye className="h-3.5 w-3.5" />
                                {link.views} {t("views")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="frameworks" className="mt-0">
                    <div className="flex flex-wrap gap-2">
                      {detail.item.frameworks.map((fw) => (
                        <Badge key={fw} variant="outline" className="font-normal">
                          {fw}
                        </Badge>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="shared-links" className="mt-0 space-y-2">
                    {detail.sharedLinks.length ? (
                      detail.sharedLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                          <span>{link.name}</span>
                          <span className="text-muted-foreground">{link.views} views</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("No shared links for this profile.")}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0">
                    <ul className="space-y-2">
                      {detail.history.length ? (
                        detail.history.map((h) => (
                          <li key={h.id} className="flex justify-between gap-2 text-sm">
                            <span>
                              <span className="font-medium">{h.actorName ?? t("System")}</span>{" "}
                              <span className="text-muted-foreground">{h.action.replace(/_/g, " ")}</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {complianceRelativeTime(h.createdAt)}
                            </span>
                          </li>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("No activity yet.")}</p>
                      )}
                    </ul>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(true)}>
                  {t("Edit Profile")}
                </Button>
                <Button
                  className="flex-1 bg-violet-600 text-white hover:bg-violet-700"
                  onClick={() => copyLink(detail.item.profileLink)}
                >
                  <Share2 className="mr-1.5 h-4 w-4" />
                  {t("Share Profile")}
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
