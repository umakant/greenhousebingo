"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  LayoutGrid,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  TrendingUp,
  Users,
  UserCheck,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import { cn } from "@/lib/utils";

type WorkshopRow = {
  id: string;
  slug: string;
  catalogSlug: string;
  title: string;
  instructorName: string;
  categoryName: string;
  imageUrl: string | null;
  price: number | null;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  attendanceRate: number;
  fillRate: number;
  sessionStatus: "upcoming" | "completed" | "sold_out" | "cancelled";
  status: string;
  adminUrl: string;
  attendeesUrl: string;
  checkInUrl: string;
};

type OverviewResponse = {
  ok?: boolean;
  message?: string;
  summary?: {
    workshopCount: number;
    reservationCount: number;
    registrationCount: number;
    checkedInCount: number;
    attendanceRate: number;
    totalCapacity: number;
    totalRegistered: number;
    fillRate: number;
    upcomingCount: number;
    upcomingIn7Days: number;
    completedThisMonth: number;
  };
  insights?: {
    upcomingIn7Days: WorkshopRow[];
    mostRegistered: WorkshopRow | null;
    highestAttendance: WorkshopRow | null;
    lowRegistration: WorkshopRow | null;
  };
  workshops?: WorkshopRow[];
  reservations?: Array<{
    reference: string;
    name: string | null;
    email: string | null;
    amount: number;
    mode: string;
    status: string | null;
    paymentStatus: string | null;
    createdAt: string;
    workshops: string[];
    ticketCount: number;
  }>;
  registrations?: Array<{
    id: string;
    eventTitle: string;
    attendeeName: string;
    attendeeEmail: string;
    bookingStatus: string;
    paymentStatus: string;
    checkedInAt: string | null;
    qrToken: string;
    registeredAt: string;
    checkInUrl: string;
  }>;
};

const PAGE_SIZE = 10;

function formatDateTime(value: string): string {
  return format(new Date(value), "MMM d, yyyy, h:mm a");
}

function formatShortDate(value: string): string {
  return format(new Date(value), "MMM d, yyyy");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function sessionStatusBadge(status: WorkshopRow["sessionStatus"]) {
  switch (status) {
    case "upcoming":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "sold_out":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "cancelled":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function sessionStatusLabel(status: WorkshopRow["sessionStatus"]) {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "completed":
      return "Completed";
    case "sold_out":
      return "Sold out";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function KpiCard(props: {
  label: string;
  value: string;
  sub: string;
  subClass?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className="text-2xl font-bold tracking-tight">{props.value}</p>
          <p className={cn("text-xs", props.subClass ?? "text-muted-foreground")}>{props.sub}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconBg)}>
          {props.icon}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkshopThumbnail({ workshop }: { workshop: WorkshopRow }) {
  if (workshop.imageUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image src={workshop.imageUrl} alt="" fill className="object-cover" sizes="40px" unoptimized />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-semibold text-indigo-600">
      {initials(workshop.title)}
    </div>
  );
}

export function EventPlatformWorkshopsAdminClient() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<OverviewResponse | null>(null);
  const [viewMode, setViewMode] = React.useState<"table" | "calendar">("table");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [instructorFilter, setInstructorFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const dateRangeLabel = React.useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/event-platform/workshops/overview", {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as OverviewResponse | null;
    if (!res.ok || !json?.ok) {
      setError(json?.message ?? "Could not load workshops.");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const workshops = data?.workshops ?? [];
  const categories = React.useMemo(
    () => [...new Set(workshops.map((w) => w.categoryName))].sort(),
    [workshops],
  );
  const instructors = React.useMemo(
    () => [...new Set(workshops.map((w) => w.instructorName))].sort(),
    [workshops],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return workshops.filter((w) => {
      if (q && !`${w.title} ${w.instructorName} ${w.location}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && w.sessionStatus !== statusFilter) return false;
      if (categoryFilter !== "all" && w.categoryName !== categoryFilter) return false;
      if (instructorFilter !== "all" && w.instructorName !== instructorFilter) return false;
      return true;
    });
  }, [workshops, search, statusFilter, categoryFilter, instructorFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, instructorFilter]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setInstructorFilter("all");
    setPage(1);
  }

  function exportWorkshops() {
    const rows = [
      ["Workshop", "Instructor", "Category", "Date", "Location", "Capacity", "Registered", "Checked In", "Status"],
      ...filtered.map((w) => [
        w.title,
        w.instructorName,
        w.categoryName,
        formatDateTime(w.startsAt),
        w.location,
        String(w.capacity),
        String(w.registeredCount),
        String(w.checkedInCount),
        sessionStatusLabel(w.sessionStatus),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workshops-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading workshops…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const summary = data?.summary;
  const insights = data?.insights;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workshops</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage workshop sessions, registrations, and attendance in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportWorkshops}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode((v) => (v === "table" ? "calendar" : "table"))}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {viewMode === "table" ? "Calendar View" : "Table View"}
          </Button>
          <Button asChild size="sm">
            <Link href={EVENT_PLATFORM_PATHS.events}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workshop
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Total Workshops"
          value={String(summary?.workshopCount ?? 0)}
          sub={`${summary?.upcomingCount ?? 0} in next 30 days`}
          subClass="text-emerald-600 dark:text-emerald-400"
          icon={<CalendarDays className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-500/10"
        />
        <KpiCard
          label="Total Registrations"
          value={String(summary?.registrationCount ?? 0)}
          sub={`${summary?.totalRegistered ?? 0} seats filled on sessions`}
          icon={<Users className="h-5 w-5 text-violet-600" />}
          iconBg="bg-violet-500/10"
        />
        <KpiCard
          label="Total Capacity"
          value={String(summary?.totalCapacity ?? 0)}
          sub={`${summary?.fillRate ?? 0}% filled`}
          icon={<LayoutGrid className="h-5 w-5 text-sky-600" />}
          iconBg="bg-sky-500/10"
        />
        <KpiCard
          label="Checked In"
          value={String(summary?.checkedInCount ?? 0)}
          sub={`${summary?.attendanceRate ?? 0}% of registered`}
          subClass="text-emerald-600 dark:text-emerald-400"
          icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-500/10"
        />
        <KpiCard
          label="Upcoming Workshops"
          value={String(summary?.upcomingCount ?? 0)}
          sub="Next 30 days"
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-500/10"
        />
        <KpiCard
          label="Completed Workshops"
          value={String(summary?.completedThisMonth ?? 0)}
          sub="This month"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-500/10"
        />
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="sessions" className="px-4">
            Workshop Sessions
          </TabsTrigger>
          <TabsTrigger value="reservations" className="px-4">
            Reservations
          </TabsTrigger>
          <TabsTrigger value="attendance" className="px-4">
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
              <div className="relative min-w-0 flex-1 lg:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workshops…"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="sold_out">Sold out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                <SelectTrigger className="w-full lg:w-[170px]">
                  <SelectValue placeholder="All Instructors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Instructors</SelectItem>
                  {instructors.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                {dateRangeLabel}
              </div>
              <Button variant="outline" size="sm" className="shrink-0">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <button
                type="button"
                className="shrink-0 text-sm text-primary hover:underline"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>
          </div>

          {viewMode === "calendar" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No workshops match your filters.
                  </CardContent>
                </Card>
              ) : (
                filtered.map((workshop) => (
                  <Card key={workshop.id} className="overflow-hidden shadow-sm">
                    <div className="relative h-32 bg-gradient-to-br from-indigo-500/20 to-violet-500/10">
                      {workshop.imageUrl ? (
                        <Image src={workshop.imageUrl} alt="" fill className="object-cover" unoptimized />
                      ) : null}
                      <div className="absolute left-3 top-3">
                        <Badge className={cn("border-0 capitalize", sessionStatusBadge(workshop.sessionStatus))}>
                          {sessionStatusLabel(workshop.sessionStatus)}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-2 text-base">{workshop.title}</CardTitle>
                      <CardDescription>{workshop.instructorName}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        {formatDateTime(workshop.startsAt)}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {workshop.location}
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>Capacity</span>
                          <span>
                            {workshop.registeredCount}/{workshop.capacity || "—"}
                          </span>
                        </div>
                        <Progress value={workshop.fillRate} className="h-1.5 [&>div]:bg-indigo-500" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link href={workshop.attendeesUrl}>Attendees</Link>
                        </Button>
                        <Button asChild size="sm" className="flex-1">
                          <Link href={workshop.checkInUrl}>Check-in</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Workshop</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="min-w-[120px]">Capacity</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Checked In</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                          No workshops yet. They are created when someone reserves from your company site, or you can
                          create one from Events.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageItems.map((workshop) => (
                        <TableRow key={workshop.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <WorkshopThumbnail workshop={workshop} />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{workshop.title}</p>
                                <p className="truncate text-xs text-muted-foreground">{workshop.instructorName}</p>
                                <p className="truncate text-xs text-muted-foreground">{workshop.categoryName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDateTime(workshop.startsAt)}</TableCell>
                          <TableCell className="max-w-[140px] truncate text-sm">{workshop.location}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {workshop.registeredCount}/{workshop.capacity || "—"}
                              </p>
                              <Progress value={workshop.fillRate} className="h-1.5 w-20 [&>div]:bg-indigo-500" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{workshop.registeredCount}</TableCell>
                          <TableCell>
                            <span className="font-medium">{workshop.checkedInCount}</span>
                            <span className="text-muted-foreground"> ({workshop.attendanceRate}%)</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border-0 capitalize", sessionStatusBadge(workshop.sessionStatus))}>
                              {sessionStatusLabel(workshop.sessionStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild size="sm" variant="outline">
                                <Link href={workshop.adminUrl}>View</Link>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={workshop.attendeesUrl}>Attendees</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={workshop.checkInUrl}>Check-in</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={workshop.adminUrl}>Edit event</Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {filtered.length > 0 ? (
                <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm tabular-nums">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select
                      value={String(PAGE_SIZE)}
                      onValueChange={() => {
                        /* fixed page size for now */
                      }}
                    >
                      <SelectTrigger className="h-8 w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Insight widgets */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Upcoming in next 7 days</CardTitle>
                <CardDescription>{insights?.upcomingIn7Days?.length ?? 0} workshops</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex -space-x-2">
                  {(insights?.upcomingIn7Days ?? []).slice(0, 4).map((w) => (
                    <Avatar key={w.id} className="h-8 w-8 border-2 border-background">
                      {w.imageUrl ? <AvatarImage src={w.imageUrl} alt="" /> : null}
                      <AvatarFallback className="text-xs">{initials(w.instructorName)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {(insights?.upcomingIn7Days ?? []).slice(0, 2).map((w) => (
                    <li key={w.id} className="truncate">
                      {w.title} · {formatShortDate(w.startsAt)}
                    </li>
                  ))}
                </ul>
                <Link href={EVENT_PLATFORM_PATHS.workshops} className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most registered</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights?.mostRegistered ? (
                  <>
                    <p className="line-clamp-2 text-sm font-medium">{insights.mostRegistered.title}</p>
                    <Progress
                      value={insights.mostRegistered.fillRate}
                      className="h-2 [&>div]:bg-indigo-500"
                    />
                    <p className="text-xs text-muted-foreground">
                      {insights.mostRegistered.registeredCount} registrations
                    </p>
                    <Link
                      href={insights.mostRegistered.attendeesUrl}
                      className="text-xs text-primary hover:underline"
                    >
                      View report
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Highest attendance rate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights?.highestAttendance ? (
                  <>
                    <p className="line-clamp-2 text-sm font-medium">{insights.highestAttendance.title}</p>
                    <Progress
                      value={insights.highestAttendance.attendanceRate}
                      className="h-2 [&>div]:bg-emerald-500"
                    />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {insights.highestAttendance.attendanceRate}% attendance
                    </p>
                    <Link
                      href={insights.highestAttendance.checkInUrl}
                      className="text-xs text-primary hover:underline"
                    >
                      View report
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No check-ins yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Low registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights?.lowRegistration ? (
                  <>
                    <p className="line-clamp-2 text-sm font-medium">{insights.lowRegistration.title}</p>
                    <Progress
                      value={insights.lowRegistration.fillRate}
                      className="h-2 [&>div]:bg-amber-500"
                    />
                    <p className="text-xs text-muted-foreground">
                      {insights.lowRegistration.registeredCount}/{insights.lowRegistration.capacity} registrations (
                      {insights.lowRegistration.fillRate}%)
                    </p>
                    <Link href={EVENT_PLATFORM_PATHS.workshops} className="text-xs text-primary hover:underline">
                      View all
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">Website reservations</h3>
              <p className="text-sm text-muted-foreground">
                Orders from your company site checkout and reserve flows.
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Workshops</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.reservations ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No reservations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.reservations ?? []).map((row) => (
                      <TableRow key={row.reference}>
                        <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                        <TableCell>
                          <div>{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>{row.workshops.join(", ") || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {row.mode}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.ticketCount}</TableCell>
                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">Attendance log</h3>
              <p className="text-sm text-muted-foreground">QR registrations and check-in status.</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Workshop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>QR token</TableHead>
                    <TableHead>Checked in</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.registrations ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No registrations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.registrations ?? []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div>{row.attendeeName}</div>
                          <div className="text-xs text-muted-foreground">{row.attendeeEmail}</div>
                        </TableCell>
                        <TableCell>{row.eventTitle}</TableCell>
                        <TableCell>
                          <Badge variant={row.checkedInAt ? "default" : "outline"} className="capitalize">
                            {row.checkedInAt ? "Checked in" : row.bookingStatus.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.qrToken}</TableCell>
                        <TableCell>{row.checkedInAt ? formatDateTime(row.checkedInAt) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={row.checkInUrl}>Check-in</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
