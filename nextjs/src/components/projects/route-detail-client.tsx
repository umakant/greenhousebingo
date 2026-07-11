"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Home,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Phone,
  RefreshCw,
  Stethoscope,
  Building2,
  Trophy,
  Maximize2,
  Send,
  UserCog,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppSettings } from "@/contexts/app-settings-context";
import {
  ROUTE_STATUS_LABELS,
  STOP_STATUS_LABELS,
  type EmployeeRoute,
  type EmployeeRouteStop,
  type RouteStopStatus,
} from "@/lib/project-routes-data";
import { loadGoogleMapsApi, resolveGoogleMapsApiKey } from "@/lib/google-maps-loader";
import { t } from "@/lib/admin-t";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<EmployeeRoute["status"], string> = {
  scheduled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  delayed: "bg-orange-100 text-orange-800 border-orange-200",
};

const STOP_BADGE: Record<RouteStopStatus, string> = {
  departed: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  upcoming: "bg-orange-100 text-orange-800",
  pending: "bg-slate-100 text-slate-600",
};

const STOP_ICON = {
  home: Home,
  clinic: Stethoscope,
  stadium: Trophy,
  venue: Building2,
  office: MapPin,
};

function formatRouteDate(iso: string) {
  try {
    return format(parseISO(iso), "EEE, MMM d, yyyy");
  } catch {
    return iso;
  }
}

function trafficLabel(level: EmployeeRoute["traffic"]) {
  if (level === "light") return { text: t("Light"), className: "text-emerald-600" };
  if (level === "moderate") return { text: t("Moderate"), className: "text-orange-600" };
  return { text: t("Heavy"), className: "text-red-600" };
}

function StopRow({ stop, isLast }: { stop: EmployeeRouteStop; isLast: boolean }) {
  const Icon = STOP_ICON[stop.icon] ?? MapPin;
  return (
    <div className="relative flex gap-3 pb-6">
      {!isLast ? (
        <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />
      ) : null}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {stop.order}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium leading-tight">{stop.name}</p>
              <p className="text-xs text-muted-foreground">{stop.address}</p>
            </div>
          </div>
          <Badge className={cn("shrink-0 font-normal", STOP_BADGE[stop.status])}>
            {t(STOP_STATUS_LABELS[stop.status])}
            {stop.statusTime ? ` · ${stop.statusTime}` : ""}
          </Badge>
        </div>
        {stop.distanceFromPrevKm != null ? (
          <p className="text-xs text-muted-foreground">
            {stop.distanceFromPrevKm.toFixed(1)} km · {stop.timeFromPrev} {t("from previous stop")}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {stop.services.map((svc) => (
            <span key={svc} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {svc}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RouteDetailClient({
  route,
  backHref = "/projects/routes",
  employeeView = false,
}: {
  route: EmployeeRoute;
  backHref?: string;
  employeeView?: boolean;
}) {
  const { settings } = useAppSettings();
  const mapsApiKey = resolveGoogleMapsApiKey(settings.googleMapsApiKey);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null);
  const polylineRef = React.useRef<google.maps.Polyline | null>(null);
  const markersRef = React.useRef<google.maps.Marker[]>([]);
  const [mapReady, setMapReady] = React.useState(false);
  const [liveTracking, setLiveTracking] = React.useState(true);

  const traffic = trafficLabel(route.traffic);

  React.useEffect(() => {
    if (!mapsApiKey || !mapRef.current) return;
    let cancelled = false;
    loadGoogleMapsApi(settings.googleMapsApiKey)
      .then(() => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        const path = route.stops.map((s) => ({ lat: s.lat, lng: s.lng }));
        const center = path[0] ?? { lat: 39.8283, lng: -98.5795 };
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom: 8,
          mapTypeId: "roadmap",
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: true,
        });
        setMapReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mapsApiKey, route.id, settings.googleMapsApiKey, route.stops]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !window.google?.maps) return;

    polylineRef.current?.setMap(null);
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const path = route.stops.map((s) => ({ lat: s.lat, lng: s.lng }));
    if (path.length === 0) return;

    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#2563EB",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });

    route.stops.forEach((stop) => {
      const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        label: {
          text: String(stop.order),
          color: "#ffffff",
          fontWeight: "700",
          fontSize: "11px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: stop.status === "upcoming" ? "#F97316" : "#22C55E",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: stop.name,
      });
      markersRef.current.push(marker);
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [mapReady, route]);

  const statCards = [
    { label: t("Stops"), value: String(route.stops.length), icon: MapPin },
    { label: t("Total Distance"), value: `${route.totalDistanceKm.toFixed(2)} km`, icon: Navigation },
    { label: t("Total Time"), value: route.totalTime, icon: Clock },
    { label: t("Completed"), value: String(route.completedStops), icon: CheckCircle2, className: "text-emerald-600" },
    { label: t("Remaining"), value: String(route.remainingStops), icon: Circle, className: "text-orange-600" },
    { label: t("Issues"), value: String(route.issues), icon: AlertTriangle, className: route.issues ? "text-red-600" : undefined },
  ];

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {!employeeView ? (
            <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 px-2" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                {t("Back to Routes")}
              </Link>
            </Button>
          ) : null}
          <div className="flex flex-wrap items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg">{route.avatarInitials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{route.employeeName}</h1>
                <Badge variant="outline" className={cn("font-normal", STATUS_BADGE[route.status])}>
                  {t(ROUTE_STATUS_LABELS[route.status])}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("Route")} #{route.routeNumber} · {route.role}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhoneDisplay(route.phone)}
                </span>
                <span>{route.email}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <UserCog className="mr-1.5 h-4 w-4" />
              {t("Edit Route")}
            </Button>
            <Button variant="outline" size="sm">
              {t("Reassign Route")}
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatRouteDate(route.routeDate)}
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {route.shiftStart} – {route.shiftEnd}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <card.icon className={cn("h-5 w-5 shrink-0 text-muted-foreground", card.className)} />
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={cn("text-lg font-semibold tabular-nums", card.className)}>{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
        <Card className="xl:max-h-[560px] xl:overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("Route Stops")} ({route.stops.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {route.stops.map((stop, idx) => (
              <StopRow key={stop.id} stop={stop} isLast={idx === route.stops.length - 1} />
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">{t("Map View")}</CardTitle>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={liveTracking} onCheckedChange={setLiveTracking} />
                {t("Live Tracking")}
              </label>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-3 pt-0">
            <div className="relative h-[420px] overflow-hidden rounded-lg border bg-muted/30">
              {mapsApiKey ? (
                <div ref={mapRef} className="h-full w-full" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                  <MapPin className="h-8 w-8 opacity-40" />
                  <p>{t("Add a Google Maps API key in Settings to display the route map.")}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Send className="h-4 w-4" />
                {t("Send Update")}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`tel:${route.phone.replace(/\D/g, "")}`}>
                  <Phone className="h-4 w-4" />
                  {t("Call Driver")}
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {t("Message")}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Navigation className="h-4 w-4" />
                {t("Navigate")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-7">
          <div>
            <p className="text-xs text-muted-foreground">{t("Distance Traveled")}</p>
            <p className="font-semibold tabular-nums">{route.distanceTraveledKm.toFixed(2)} km</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Next Stop")}</p>
            <p className="font-semibold">{route.nextStopName}</p>
            {route.nextStopDistanceKm > 0 ? (
              <p className="text-xs text-muted-foreground">{route.nextStopDistanceKm.toFixed(1)} km {t("away")}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("ETA")}</p>
            <p className="font-semibold">{route.eta}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Traffic")}</p>
            <p className={cn("font-semibold", traffic.className)}>{traffic.text}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Avg. Stop Time")}</p>
            <p className="font-semibold">{route.avgStopTime}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Drive Time")}</p>
            <p className="font-semibold">{route.driveTime}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Idle Time")}</p>
            <p className="font-semibold text-orange-600">{route.idleTime}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
