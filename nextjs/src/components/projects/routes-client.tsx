"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Eye,
  MapPin,
  RefreshCw,
  Route as RouteIcon,
  Search,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { TableActionButton } from "@/components/ui/table-action-button";
import {
  EMPLOYEE_ROUTES,
  ROUTE_STATUS_LABELS,
  type EmployeeRoute,
  type EmployeeRouteStatus,
} from "@/lib/project-routes-data";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<EmployeeRouteStatus, string> = {
  scheduled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  delayed: "bg-orange-100 text-orange-800 border-orange-200",
};

function formatRouteDate(iso: string) {
  try {
    return format(parseISO(iso), "EEE, MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function RoutesClient() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EMPLOYEE_ROUTES.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        String(r.routeNumber).includes(q)
      );
    });
  }, [statusFilter, searchQuery]);

  const counts = React.useMemo(() => {
    const c: Record<EmployeeRouteStatus, number> = {
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
    };
    for (const r of EMPLOYEE_ROUTES) c[r.status] += 1;
    return c;
  }, []);

  const rowActions = (route: EmployeeRoute) => [
    {
      label: t("View route"),
      href: `/projects/routes/${route.id}`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("Routes")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Employee field routes, stops, and live progress for project deployments.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px] bg-background">
              <SelectValue placeholder={t("Filter status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All statuses")}</SelectItem>
              {(Object.keys(ROUTE_STATUS_LABELS) as EmployeeRouteStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {t(ROUTE_STATUS_LABELS[key])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-[180px] flex-1 sm:max-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search employee or route…")}
              className="h-9 pl-8"
            />
          </div>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={t("Refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ROUTE_STATUS_LABELS) as EmployeeRouteStatus[]).map((key) => (
          <Card key={key}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{t(ROUTE_STATUS_LABELS[key])}</p>
                <p className="text-2xl font-semibold tabular-nums">{counts[key]}</p>
              </div>
              <RouteIcon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {t("All Employee Routes")} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Employee")}</TableHead>
                <TableHead>{t("Route")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Date")}</TableHead>
                <TableHead>{t("Shift")}</TableHead>
                <TableHead className="text-right">{t("Stops")}</TableHead>
                <TableHead className="text-right">{t("Distance")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {t("No routes match your filters.")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((route) => (
                  <TableRow key={route.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell>
                      <Link href={`/projects/routes/${route.id}`} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{route.avatarInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{route.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{route.role}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/projects/routes/${route.id}`} className="font-medium text-primary">
                        #{route.routeNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal", STATUS_BADGE[route.status])}>
                        {t(ROUTE_STATUS_LABELS[route.status])}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatRouteDate(route.routeDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {route.shiftStart} – {route.shiftEnd}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{route.stops.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{route.totalDistanceKm.toFixed(1)} km</TableCell>
                    <TableCell>
                      <TableActionButton
                        label={t("View")}
                        primaryHref={`/projects/routes/${route.id}`}
                        primaryIcon={<Eye className="h-4 w-4" />}
                        items={rowActions(route)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
