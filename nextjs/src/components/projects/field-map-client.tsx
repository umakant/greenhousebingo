"use client";

import * as React from "react";
import Link from "next/link";
import { startOfDay } from "date-fns";
import {
  Download,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Copy,
  Check,
  Eye,
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
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { t } from "@/lib/admin-t";
import { formatGanttDisplayDate, parseGanttCalendarDate } from "@/lib/gantt-dates";
import {
  fieldMapGeocodeQuery,
  fieldMapPositionKey,
  resolveFieldMapCoordinates,
  type FieldMapLocationStatus,
} from "@/lib/field-map-coordinates";
import { parseGanttCoordinate } from "@/lib/gantt-location-address";
import { createFieldMapPinOverlay, type FieldMapPinOverlay } from "@/lib/field-map-pins";
import { loadGoogleMapsApi, resolveGoogleMapsApiKey } from "@/lib/google-maps-loader";
import { offsetDuplicatePosition } from "@/lib/marketplace/city-coords";
import { cn } from "@/lib/utils";

export type { FieldMapLocationStatus };

type GanttStaff = { id: string; name: string; color: string | null };
type GanttStaffAssignment = { staff: GanttStaff | null };

type GanttLocationRow = {
  id: string;
  name: string;
  color: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  startDate?: string | null;
  endDate?: string | null;
  showLocationMap?: boolean;
  staffAssignments?: GanttStaffAssignment[];
};

type GanttProjectRow = {
  id: string;
  name: string;
  color: string | null;
  status?: string | null;
  locations: GanttLocationRow[];
};

const STATUS_META: Record<
  FieldMapLocationStatus,
  { label: string; color: string; badgeClass: string }
> = {
  active: {
    label: "Active",
    color: "#22C55E",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  upcoming: {
    label: "Upcoming",
    color: "#3B82F6",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  planning: {
    label: "Planning",
    color: "#A855F7",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  on_hold: {
    label: "On Hold",
    color: "#F97316",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
  },
  complete: {
    label: "Complete",
    color: "#94A3B8",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const US_CENTER = { lat: 39.8283, lng: -98.5795 };
const US_ZOOM = 4;
const TABLE_PREVIEW_ROWS = 8;

function formatAddress(loc: GanttLocationRow): string {
  const line = [loc.city, loc.state, loc.zipCode].filter(Boolean).join(", ");
  return [loc.addressLine1, loc.addressLine2, line].filter(Boolean).join(", ");
}

function cityLabel(loc: GanttLocationRow): string {
  const city = loc.city?.trim();
  const state = loc.state?.trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  return loc.name;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function resolveFieldMapLocationStatus(
  loc: Pick<GanttLocationRow, "startDate" | "endDate">,
  projectStatus?: string | null,
): FieldMapLocationStatus {
  const ps = (projectStatus ?? "").trim().toLowerCase();
  if (ps.includes("hold")) return "on_hold";
  if (ps.includes("complete") || ps.includes("closed") || ps === "done") return "complete";

  const today = startOfDay(new Date());
  const start = loc.startDate ? parseGanttCalendarDate(loc.startDate) : null;
  const end = loc.endDate ? parseGanttCalendarDate(loc.endDate) : null;

  if (end && startOfDay(end) < today) return "complete";
  if (start && startOfDay(start) > today) return "upcoming";
  if (start && end && startOfDay(start) <= today && startOfDay(end) >= today) return "active";
  return "planning";
}

export type FieldMapLocationRow = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: FieldMapLocationStatus;
  phase: string;
  startDate: string | null;
  endDate: string | null;
  address: string;
  city: string;
  state: string;
  cityLabel: string;
  position: google.maps.LatLngLiteral | null;
  positionSource: "coords" | "city" | "geocode" | null;
  staff: GanttStaff[];
  showLocationMap: boolean;
  mapIndex: number | null;
};

function buildLocationRows(projects: GanttProjectRow[], mapEnabledOnly: boolean): FieldMapLocationRow[] {
  const rows: FieldMapLocationRow[] = [];
  let mapIndex = 0;

  for (const project of projects) {
    for (const loc of project.locations ?? []) {
      if (mapEnabledOnly && !loc.showLocationMap) continue;

      const resolved = resolveFieldMapCoordinates(loc);
      const hasStoredCoords =
        parseGanttCoordinate(loc.latitude) != null &&
        parseGanttCoordinate(loc.longitude) != null;

      const staff = (loc.staffAssignments ?? [])
        .map((a) => a.staff)
        .filter((s): s is GanttStaff => Boolean(s));

      rows.push({
        id: loc.id,
        name: loc.name,
        projectId: project.id,
        projectName: project.name,
        status: resolveFieldMapLocationStatus(loc, project.status),
        phase: project.name,
        startDate: loc.startDate ?? null,
        endDate: loc.endDate ?? null,
        address: formatAddress(loc),
        city: loc.city?.trim() ?? "",
        state: loc.state?.trim() ?? "",
        cityLabel: cityLabel(loc),
        position: resolved,
        positionSource: resolved
          ? hasStoredCoords
            ? "coords"
            : "city"
          : null,
        staff,
        showLocationMap: loc.showLocationMap ?? false,
        mapIndex: resolved ? ++mapIndex : null,
      });
    }
  }

  return rows;
}

function StatusBadge({ status }: { status: FieldMapLocationStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", meta.badgeClass)}>
      {t(meta.label)}
    </Badge>
  );
}

function StaffAvatars({ staff, max = 4 }: { staff: GanttStaff[]; max?: number }) {
  if (staff.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const shown = staff.slice(0, max);
  const extra = staff.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((s) => (
        <Avatar key={s.id} className="h-7 w-7 border-2 border-background">
          <AvatarFallback
            className="text-[10px] font-semibold text-white"
            style={{ backgroundColor: s.color ?? "#6366F1" }}
          >
            {initials(s.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 ? (
        <span className="ml-2 text-xs text-muted-foreground">+{extra}</span>
      ) : null}
    </div>
  );
}

export function FieldMapClient({ permissions }: { permissions: string[] }) {
  const { settings } = useAppSettings();
  const mapsApiKey = resolveGoogleMapsApiKey(settings.googleMapsApiKey);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null);
  const overlaysRef = React.useRef<FieldMapPinOverlay[]>([]);
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [mapReady, setMapReady] = React.useState(false);
  const [projects, setProjects] = React.useState<GanttProjectRow[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mapEnabledOnly, setMapEnabledOnly] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showAllTableRows, setShowAllTableRows] = React.useState(false);
  const [geocodedPositions, setGeocodedPositions] = React.useState<
    Record<string, google.maps.LatLngLiteral>
  >({});
  const [copiedCoords, setCopiedCoords] = React.useState(false);

  const loadProjects = React.useCallback(() => {
    setLoading(true);
    return fetch("/api/gantt-projects", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    void loadProjects();
  }, [loadProjects, refreshKey]);

  const allRows = React.useMemo(
    () => buildLocationRows(projects, mapEnabledOnly),
    [projects, mapEnabledOnly],
  );

  const rowsWithPositions = React.useMemo(() => {
    let index = 0;
    return allRows.map((row) => {
      const geocoded = geocodedPositions[row.id];
      const position = geocoded ?? row.position;
      if (!position) return row;
      return {
        ...row,
        position,
        positionSource: geocoded ? ("geocode" as const) : row.positionSource,
        mapIndex: ++index,
      };
    });
  }, [allRows, geocodedPositions]);

  const mappableCount = React.useMemo(
    () => rowsWithPositions.filter((row) => row.position != null).length,
    [rowsWithPositions],
  );

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rowsWithPositions.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.cityLabel.toLowerCase().includes(q) ||
        row.projectName.toLowerCase().includes(q) ||
        row.address.toLowerCase().includes(q)
      );
    });
  }, [rowsWithPositions, statusFilter, searchQuery]);

  const mapPins = React.useMemo(() => {
    const withPosition = filteredRows.filter(
      (r): r is FieldMapLocationRow & { position: google.maps.LatLngLiteral; mapIndex: number } =>
        r.position != null && r.mapIndex != null,
    );

    const grouped = new Map<string, (FieldMapLocationRow & { position: google.maps.LatLngLiteral; mapIndex: number })[]>();
    for (const pin of withPosition) {
      const key =
        fieldMapPositionKey(pin) ||
        `${pin.position.lat.toFixed(3)}|${pin.position.lng.toFixed(3)}`;
      const list = grouped.get(key) ?? [];
      list.push(pin);
      grouped.set(key, list);
    }

    const spread: (FieldMapLocationRow & { position: google.maps.LatLngLiteral; mapIndex: number })[] = [];
    for (const group of grouped.values()) {
      group.forEach((pin, index) => {
        spread.push({
          ...pin,
          position: offsetDuplicatePosition(
            group[0].position.lat,
            group[0].position.lng,
            index,
            group.length,
          ),
        });
      });
    }

    return spread.sort((a, b) => a.mapIndex - b.mapIndex);
  }, [filteredRows]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<FieldMapLocationStatus, number> = {
      active: 0,
      upcoming: 0,
      planning: 0,
      on_hold: 0,
      complete: 0,
    };
    for (const row of rowsWithPositions) counts[row.status] += 1;
    return counts;
  }, [rowsWithPositions]);

  const selected = filteredRows.find((r) => r.id === selectedId) ?? null;
  const tableRows = showAllTableRows ? filteredRows : filteredRows.slice(0, TABLE_PREVIEW_ROWS);
  const canManage =
    permissions.includes("manage-routing") ||
    permissions.includes("manage-routing-fieldmap") ||
    permissions.includes("manage-project") ||
    permissions.includes("*");

  const locationRowTableActions = React.useCallback(
    (row: FieldMapLocationRow) => {
      const items: TableActionItem[] = [
        { label: t("View"), onSelect: () => setSelectedId(row.id), icon: <Eye className="h-4 w-4" /> },
        ...(canManage
          ? [{ label: t("Edit"), href: "/projects?view=gantt", icon: <Pencil className="h-4 w-4" /> }]
          : []),
      ];
      return {
        label: canManage ? t("Edit") : t("View"),
        primaryIcon: canManage ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
        primaryHref: canManage ? "/projects?view=gantt" : undefined,
        onPrimaryClick: canManage ? undefined : () => setSelectedId(row.id),
        items,
      };
    },
    [canManage],
  );

  React.useEffect(() => {
    if (!mapsApiKey || !mapRef.current) return;
    let cancelled = false;
    loadGoogleMapsApi(settings.googleMapsApiKey)
      .then(() => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: US_CENTER,
          zoom: US_ZOOM,
          mapTypeId: "roadmap",
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: false,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mapsApiKey, settings.googleMapsApiKey]);

  React.useEffect(() => {
    if (!mapReady || !window.google?.maps) return;
    const pending = allRows.filter((row) => !row.position && row.address.trim());
    if (!pending.length) return;

    let cancelled = false;
    const geocoder = new google.maps.Geocoder();

    void (async () => {
      const next: Record<string, google.maps.LatLngLiteral> = {};
      for (const row of pending.slice(0, 20)) {
        if (cancelled) break;
        const query =
          row.address.trim() !== ""
            ? /\b(USA|United States)\b/i.test(row.address)
              ? row.address
              : `${row.address}, USA`
            : fieldMapGeocodeQuery(row);
        if (!query) continue;

        await new Promise<void>((resolve) => {
          geocoder.geocode({ address: query }, (results, status) => {
            if (status === "OK" && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              next[row.id] = { lat: loc.lat(), lng: loc.lng() };
            }
            resolve();
          });
        });

        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }

      if (!cancelled && Object.keys(next).length > 0) {
        setGeocodedPositions((prev) => ({ ...prev, ...next }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allRows, mapReady]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    if (mapPins.length === 0) return;

    mapPins.forEach((pin) => {
      const overlay = createFieldMapPinOverlay(
        map,
        {
          id: pin.id,
          cityLabel: pin.cityLabel,
          status: pin.status,
          mapIndex: pin.mapIndex,
          position: pin.position,
          selected: selectedId === pin.id,
        },
        () => {
          setSelectedId(pin.id);
          infoWindowRef.current?.setContent(
            `<div style="font-family:system-ui,sans-serif;max-width:240px;padding:4px 2px;">
              <div style="font-size:11px;color:#64748b;margin-bottom:2px;">${pin.projectName}</div>
              <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${pin.cityLabel}</div>
              <div style="font-size:11px;color:#475569;line-height:1.4;">${pin.address || pin.name}</div>
            </div>`,
          );
          infoWindowRef.current?.setPosition(pin.position);
          infoWindowRef.current?.open({ map });
        },
      ) as FieldMapPinOverlay;
      overlaysRef.current.push(overlay);
    });
  }, [mapPins, mapReady, selectedId]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (mapPins.length === 0) {
      map.setCenter(US_CENTER);
      map.setZoom(US_ZOOM);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    mapPins.forEach((pin) => bounds.extend(pin.position));

    if (mapPins.length === 1) {
      map.setCenter(mapPins[0].position);
      map.setZoom(8);
    } else {
      map.fitBounds(bounds, 64);
    }
  }, [mapPins, mapReady]);

  React.useEffect(() => {
    if (!selectedId) return;
    const pin = mapPins.find((p) => p.id === selectedId);
    const map = mapInstanceRef.current;
    if (!pin || !map) return;
    map.panTo(pin.position);
    map.setZoom(Math.max(map.getZoom() ?? 10, 8));
  }, [selectedId, mapPins]);

  React.useEffect(() => {
    if (!selectedId && mapPins.length > 0) {
      setSelectedId(mapPins[0].id);
    }
  }, [mapPins, selectedId]);

  const copySelectedCoords = async () => {
    if (!selected?.position) return;
    const text = `${selected.position.lat.toFixed(6)}, ${selected.position.lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCoords(true);
      window.setTimeout(() => setCopiedCoords(false), 2000);
    } catch {
      // ignore
    }
  };

  const exportLocations = () => {
    const header = ["Location", "Status", "Phase", "Start", "End", "City", "Lat", "Lng", "Staff"];
    const lines = filteredRows.map((r) =>
      [
        r.name,
        STATUS_META[r.status].label,
        r.phase,
        r.startDate ?? "",
        r.endDate ?? "",
        r.cityLabel,
        r.position?.lat ?? "",
        r.position?.lng ?? "",
        r.staff.map((s) => s.name).join("; "),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fieldmap-locations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("FieldMap")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Project locations with map coordinates from the Gantt schedule.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px] bg-background">
              <SelectValue placeholder={t("Filter by location")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All statuses")}</SelectItem>
              {(Object.keys(STATUS_META) as FieldMapLocationStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {t(STATUS_META[key].label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-[180px] flex-1 sm:max-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search location…")}
              className="h-9 pl-8"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label={t("Refresh")}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {canManage ? (
            <Button asChild size="sm" className="h-9 gap-1.5">
              <Link href="/projects?view=gantt">
                <Plus className="h-4 w-4" />
                {t("Add Location")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Map + table (left) and sidebar (right) */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-0">
              {!mapsApiKey ? (
                <div className="flex min-h-[520px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  {t("Add a Google Maps API key in Settings to use FieldMap.")}
                </div>
              ) : (
                <div className="relative min-h-[520px] bg-muted/20">
                  <div ref={mapRef} className="absolute inset-0" />
                  {!mapReady || loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : null}

                  {mapReady && !loading && mappableCount === 0 && allRows.length > 0 ? (
                    <div className="absolute left-1/2 top-4 z-10 max-w-md -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 shadow-sm">
                      {t("Locations need a city/state or coordinates to appear on the map.")}
                    </div>
                  ) : null}

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-border/80 bg-background/95 px-3 py-2 shadow-md backdrop-blur-sm">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("Status")}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {(Object.entries(STATUS_META) as [FieldMapLocationStatus, (typeof STATUS_META)[FieldMapLocationStatus]][]).map(
                        ([key, meta]) => (
                          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-foreground">
                            <span
                              className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: meta.color }}
                            />
                            {t(meta.label)}
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                    <span className="rounded-md border border-border/80 bg-background/95 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
                      {mappableCount}/{allRows.length} {t("on map")}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={mapEnabledOnly ? "default" : "secondary"}
                      className="h-8 shadow-sm"
                      onClick={() => setMapEnabledOnly((v) => !v)}
                    >
                      {mapEnabledOnly ? t("Map-enabled only") : t("All locations")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locations table */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold">
                {t("All Project Locations")} ({filteredRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("Location")}</TableHead>
                      <TableHead>{t("Status")}</TableHead>
                      <TableHead>{t("Phase")}</TableHead>
                      <TableHead>{t("Start Date")}</TableHead>
                      <TableHead>{t("End Date")}</TableHead>
                      <TableHead>{t("Assigned Staff")}</TableHead>
                      <TableHead className="text-right">{t("Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "cursor-pointer",
                          selectedId === row.id && "bg-primary/5",
                        )}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {row.mapIndex != null ? (
                              <span
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: STATUS_META[row.status].color }}
                              >
                                {row.mapIndex}
                              </span>
                            ) : (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                                —
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{row.cityLabel}</p>
                              <p className="truncate text-xs text-muted-foreground">{row.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">{row.phase}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {formatGanttDisplayDate(row.startDate, "MMM d, yyyy") || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {formatGanttDisplayDate(row.endDate, "MMM d, yyyy") || "—"}
                        </TableCell>
                        <TableCell>
                          <StaffAvatars staff={row.staff} />
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <TableActionButton {...locationRowTableActions(row)} className="ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                          {t("No locations match your filters. Add locations in the Gantt chart with latitude and longitude.")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              {filteredRows.length > TABLE_PREVIEW_ROWS ? (
                <div className="border-t border-border/60 px-4 py-3 text-center">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-primary"
                    onClick={() => setShowAllTableRows((v) => !v)}
                  >
                    {showAllTableRows
                      ? t("Show fewer locations")
                      : t("View all locations") + ` (${filteredRows.length})`}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          {/* Location overview */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("Location Overview")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pt-0">
              <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("Total")}</p>
                <p className="text-xl font-bold tabular-nums">{rowsWithPositions.length}</p>
              </div>
              {(Object.keys(STATUS_META) as FieldMapLocationStatus[]).map((key) => (
                <div
                  key={key}
                  className="rounded-lg border border-border/70 px-3 py-2"
                  style={{ backgroundColor: `${STATUS_META[key].color}14` }}
                >
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t(STATUS_META[key].label)}
                  </p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: STATUS_META[key].color }}>
                    {statusCounts[key]}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected location */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("Selected Location")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {selected ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-foreground">{selected.cityLabel}</p>
                      <p className="text-xs text-muted-foreground">{selected.name}</p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                  {selected.position ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {selected.position.lat.toFixed(4)}, {selected.position.lng.toFixed(4)}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => void copySelectedCoords()}
                        aria-label={t("Copy coordinates")}
                      >
                        {copiedCoords ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : null}
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="text-muted-foreground">{t("Phase")}: </span>
                      {selected.phase}
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t("Start")}: </span>
                      {formatGanttDisplayDate(selected.startDate, "MMM d, yyyy") || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t("End")}: </span>
                      {formatGanttDisplayDate(selected.endDate, "MMM d, yyyy") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("Assigned Staff")}
                    </p>
                    <StaffAvatars staff={selected.staff} />
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/projects?view=gantt">{t("View Location Details")}</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Select a location on the map or in the table to view details.")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("Quick Actions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {canManage ? (
                <Button asChild variant="ghost" size="sm" className="h-9 w-full justify-start gap-2">
                  <Link href="/projects?view=gantt">
                    <Plus className="h-4 w-4" />
                    {t("Add New Location")}
                  </Link>
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" className="h-9 w-full justify-start gap-2" disabled>
                <Upload className="h-4 w-4" />
                {t("Import Locations")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full justify-start gap-2"
                onClick={exportLocations}
                disabled={filteredRows.length === 0}
              >
                <Download className="h-4 w-4" />
                {t("Export Locations")}
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-full justify-start gap-2" disabled>
                <FileText className="h-4 w-4" />
                {t("Generate Report")}
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-9 w-full justify-start gap-2">
                <Link href="/projects?view=gantt">
                  <MapPin className="h-4 w-4" />
                  {t("View Gantt Timeline")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
