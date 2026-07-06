"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  MapPin,
  Plus,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
type BoardProject = {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  venue: string | null;
  location: string | null;
  agents_count: number;
  medics_count: number;
  security_count: number;
  pre_progress: number;
  project_progress: number;
  post_progress: number;
};

type TimeFilter = "current" | "upcoming" | "past";

function normalizeStatus(raw: string | null | undefined) {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "ongoing") return "ongoing";
  if (s === "finished" || s === "completed") return "finished";
  if (s === "onhold" || s === "on hold") return "onhold";
  return "not_started";
}

function matchesTimeFilter(project: BoardProject, filter: TimeFilter, today: Date) {
  const status = normalizeStatus(project.status);
  const start = project.start_date ? new Date(`${project.start_date}T12:00:00`) : null;
  const end = project.end_date ? new Date(`${project.end_date}T12:00:00`) : null;

  if (filter === "past") {
    return status === "finished" || (end && end < today);
  }
  if (filter === "upcoming") {
    return status === "not_started" || (start && start > today);
  }
  if (status === "ongoing" || status === "onhold") return true;
  if (start && end && start <= today && end >= today) return true;
  if (start && !end && start <= today) return true;
  return false;
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function ProjectCard({
  project,
  formatDate,
}: {
  project: BoardProject;
  formatDate: (d: string | null) => string;
}) {
  const venue = project.venue?.trim() || "—";
  const location = project.location?.trim() || "—";

  return (
    <Link
      href={`/project/${project.id}`}
      aria-label={`Open ${project.name}`}
      className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
            {project.name}
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{venue}</span>
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatDate(project.start_date)} – {formatDate(project.end_date)}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{location}</span>
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          <ProgressRow label="Pre project" value={project.pre_progress} />
          <ProgressRow label="Project" value={project.project_progress} />
          <ProgressRow label="Post project" value={project.post_progress} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {project.agents_count} Agents
          </span>
          <span className="flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5" />
            {project.medics_count} Medics
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {project.security_count} Security
          </span>
        </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProjectsBoard({ permissions }: { permissions: string[] }) {
  const { t: tLang } = useTranslation();
  const tr = (s: string) => tLang(s) || s;
  const { settings } = useAppSettings();
  const formatDate = (d: string | null) => (d ? fmtDateLib(d, settings) : "—");

  const canCreate =
    permissions.includes("*") ||
    permissions.includes("create-project") ||
    permissions.includes("manage-project");
  const canReport =
    permissions.includes("*") ||
    permissions.includes("manage-project-report") ||
    permissions.includes("manage-project");

  const [projects, setProjects] = React.useState<BoardProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("current");

  async function loadBoard() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ board: "1", per_page: "500", page: "1" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/project/list?${params}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.data)) {
        setProjects([]);
        return;
      }
      setProjects(data.data as BoardProject[]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadBoard();
  }, [search]);

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const filtered = React.useMemo(() => {
    return projects.filter((p) => matchesTimeFilter(p, timeFilter, today));
  }, [projects, timeFilter, today]);

  const timeTabs: { id: TimeFilter; label: string }[] = [
    { id: "current", label: tr("Current") },
    { id: "upcoming", label: tr("Up Coming") },
    { id: "past", label: tr("Past") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {tr("Manage all active and upcoming security operations")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReport ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/project/report">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {tr("Export Report")}
              </Link>
            </Button>
          ) : null}
          {canCreate ? (
            <Button size="sm" asChild>
              <Link href="/project/new">
                <Plus className="mr-2 h-4 w-4" />
                {tr("New Project")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full max-w-md">
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchDraft)}
            placeholder={tr("Search projects...")}
          />
        </div>
        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
          {timeTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={timeFilter === tab.id ? "default" : "ghost"}
              className="h-8 px-4"
              onClick={() => setTimeFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          {tr("Loading...")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          {tr("No projects in this view.")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} formatDate={formatDate} />
          ))}
        </div>
      )}
    </div>
  );
}
