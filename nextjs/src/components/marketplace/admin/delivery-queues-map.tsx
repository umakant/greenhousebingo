"use client";

import * as React from "react";
import { Loader2, MapPin, Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { loadGoogleMapsApi, resolveGoogleMapsApiKey } from "@/lib/google-maps-loader";
import { coordsForCity, cityCoordKey } from "@/lib/marketplace/city-coords";
import { t } from "@/lib/admin-t";


const US_CENTER = { lat: 39.8283, lng: -98.5795 };
const US_ZOOM = 4;
const CITY_ZOOM = 9;

const STATUS_PIN: Record<string, string> = {
  ready_to_schedule: "#16a34a",
  waiting: "#f97316",
  scheduled: "#2563eb",
};

const STATUS_LABEL: Record<string, string> = {
  ready_to_schedule: "Ready to Deliver",
  waiting: "Waiting for Minimum",
  scheduled: "Scheduled",
};

export type DeliveryQueueMapMarker = {
  param: string;
  city: string;
  state: string;
  vendorName: string | null;
  queueStatus: string;
  bucketsOrdered: number;
  requiredBucketMinimum: number;
  companyCount: number;
};

type CityMapPoint = {
  key: string;
  param: string;
  city: string;
  state: string;
  position: google.maps.LatLngLiteral;
  queueStatus: string;
  color: string;
  bucketsOrdered: number;
  requiredBucketMinimum: number;
  companyCount: number;
  vendorCount: number;
};

function pinColor(status: string) {
  return STATUS_PIN[status] ?? STATUS_PIN.waiting;
}

function pickPrimaryQueue(
  list: DeliveryQueueMapMarker[],
  selectedParam: string | null,
): DeliveryQueueMapMarker {
  if (selectedParam) {
    const hit = list.find((l) => l.param === selectedParam);
    if (hit) return hit;
  }
  for (const status of ["ready_to_schedule", "scheduled", "waiting"] as const) {
    const hit = list.find((l) => l.queueStatus === status);
    if (hit) return hit;
  }
  return [...list].sort((a, b) => b.bucketsOrdered - a.bucketsOrdered)[0];
}

function aggregateCityPoints(
  markers: DeliveryQueueMapMarker[],
  selectedParam: string | null,
): CityMapPoint[] {
  const grouped = new Map<string, DeliveryQueueMapMarker[]>();
  for (const m of markers) {
    const key = cityCoordKey(m.city, m.state);
    const list = grouped.get(key) ?? [];
    list.push(m);
    grouped.set(key, list);
  }

  const points: CityMapPoint[] = [];
  for (const [key, list] of grouped) {
    const coords = coordsForCity(list[0].city, list[0].state);
    if (!coords) continue;
    const primary = pickPrimaryQueue(list, selectedParam);
    points.push({
      key,
      param: primary.param,
      city: primary.city,
      state: primary.state,
      position: coords,
      queueStatus: primary.queueStatus,
      color: pinColor(primary.queueStatus),
      bucketsOrdered: primary.bucketsOrdered,
      requiredBucketMinimum: primary.requiredBucketMinimum,
      companyCount: primary.companyCount,
      vendorCount: list.length,
    });
  }
  return points;
}

function buildCityCardHtml(point: CityMapPoint, selected: boolean): string {
  const statusLabel = STATUS_LABEL[point.queueStatus] ?? point.queueStatus;
  const border = selected ? `2px solid ${point.color}` : "1px solid #e2e8f0";
  const shadow = selected ? "0 4px 14px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.1)";
  const vendorLine =
    point.vendorCount > 1
      ? `<div style="font-size:8px;color:#94a3b8;margin-top:1px;">${point.vendorCount} vendors</div>`
      : "";

  return `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="
        background:#fff;
        border-radius:8px;
        padding:5px 8px;
        box-shadow:${shadow};
        border:${border};
        min-width:96px;
        max-width:110px;
        text-align:center;
        font-family:system-ui,-apple-system,sans-serif;
      ">
        <div style="font-weight:600;font-size:10px;color:#0f172a;line-height:1.2;">
          ${point.city}, ${point.state}
        </div>
        <div style="font-weight:700;font-size:10px;color:${point.color};margin-top:2px;">
          ${point.bucketsOrdered} / ${point.requiredBucketMinimum}
        </div>
        <div style="font-size:9px;color:#64748b;margin-top:1px;">
          ${point.companyCount} ${point.companyCount === 1 ? "company" : "companies"}
        </div>
        ${
          point.queueStatus === "scheduled"
            ? `<div style="font-size:9px;font-weight:600;color:${point.color};margin-top:2px;">${statusLabel}</div>`
            : ""
        }
        ${vendorLine}
      </div>
      <div style="
        width:12px;
        height:12px;
        border-radius:50%;
        background:${point.color};
        border:2px solid #fff;
        box-shadow:0 1px 4px rgba(0,0,0,0.22);
        margin-top:4px;
      "></div>
    </div>
  `;
}

function createCityOverlay(
  map: google.maps.Map,
  point: CityMapPoint,
  selected: boolean,
  onClick: () => void,
): google.maps.OverlayView {
  class CityQueueOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private isSelected = selected;

    onAdd() {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";
      this.div.style.cursor = "pointer";
      this.div.style.transform = "translate(-50%, -100%)";
      this.div.style.zIndex = this.isSelected ? "1200" : "100";
      this.div.innerHTML = buildCityCardHtml(point, this.isSelected);
      this.div.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
      this.getPanes()?.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection || !this.div) return;
      const pixel = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(point.position.lat, point.position.lng),
      );
      if (!pixel) return;
      this.div.style.left = `${pixel.x}px`;
      this.div.style.top = `${pixel.y}px`;
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }
  }

  const overlay = new CityQueueOverlay();
  overlay.setMap(map);
  return overlay;
}

/** Smooth pan + stepped zoom toward a city. */
function flyToLocation(map: google.maps.Map, target: google.maps.LatLngLiteral, targetZoom = CITY_ZOOM) {
  map.panTo(target);

  const startZoom = map.getZoom() ?? US_ZOOM;
  if (startZoom === targetZoom) return;

  const direction = targetZoom > startZoom ? 1 : -1;
  let current = startZoom;
  let step = 0;
  const maxSteps = Math.abs(targetZoom - startZoom);

  const tick = () => {
    if (step >= maxSteps) {
      map.setZoom(targetZoom);
      return;
    }
    step += 1;
    current += direction;
    map.setZoom(current);
    window.setTimeout(tick, 70);
  };

  window.setTimeout(tick, 220);
}

function fitAllMarkers(map: google.maps.Map, positions: google.maps.LatLngLiteral[]) {
  if (!positions.length) {
    map.setCenter(US_CENTER);
    map.setZoom(US_ZOOM);
    return;
  }
  if (positions.length === 1) {
    flyToLocation(map, positions[0], CITY_ZOOM);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  for (const p of positions) bounds.extend(p);
  map.fitBounds(bounds, 72);
}

type Props = {
  markers: DeliveryQueueMapMarker[];
  selectedParam: string | null;
  onSelect: (param: string) => void;
  stats: { ready: number; waiting: number; scheduled: number };
  className?: string;
};

export default function DeliveryQueuesMap({
  markers,
  selectedParam,
  onSelect,
  stats,
  className,
}: Props) {
  const { settings } = useAppSettings();
  const mapsApiKey = resolveGoogleMapsApiKey(settings.googleMapsApiKey);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const overlaysRef = React.useRef<google.maps.OverlayView[]>([]);
  const cityPointsRef = React.useRef<CityMapPoint[]>([]);
  const lastCityPointsKeyRef = React.useRef("");
  const zoomTimerRef = React.useRef<number | null>(null);
  const suppressFlyRef = React.useRef(false);
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  const [mapReady, setMapReady] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const cityPoints = React.useMemo(
    () => aggregateCityPoints(markers, selectedParam),
    [markers, selectedParam],
  );

  const cityPointsKey = React.useMemo(
    () => cityPoints.map((p) => `${p.key}:${p.param}:${p.queueStatus}`).join("|"),
    [cityPoints],
  );

  const clearZoomTimer = React.useCallback(() => {
    if (zoomTimerRef.current != null) {
      window.clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = null;
    }
  }, []);

  const clearOverlays = React.useCallback(() => {
    for (const o of overlaysRef.current) o.setMap(null);
    overlaysRef.current = [];
  }, []);

  // Initialize Google Map once the API key is available.
  React.useEffect(() => {
    let cancelled = false;

    if (!mapsApiKey) {
      if (Object.keys(settings).length === 0) {
        setLoading(true);
        return;
      }
      setError(
        "Google Maps API key is missing. Add it under Settings → System Settings → Google Maps API Key.",
      );
      setLoading(false);
      setMapReady(false);
      return;
    }

    setError(null);
    setLoading(true);
    setMapReady(false);

    loadGoogleMapsApi(settings.googleMapsApiKey, ["places"])
      .then(() => {
        if (cancelled || !containerRef.current) return;

        if (mapRef.current) {
          setMapReady(true);
          setLoading(false);
          return;
        }

        const map = new google.maps.Map(containerRef.current, {
          center: US_CENTER,
          zoom: US_ZOOM,
          mapTypeId: "roadmap",
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.LEFT_BOTTOM,
          },
          gestureHandling: "greedy",
          minZoom: 3,
          maxZoom: 14,
        });

        mapRef.current = map;
        setMapReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Google Maps could not be loaded. Check the API key in Settings → System Settings and ensure Maps JavaScript API is enabled.",
          );
          setLoading(false);
          setMapReady(false);
        }
      });

    return () => {
      cancelled = true;
      clearZoomTimer();
      clearOverlays();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [clearZoomTimer, clearOverlays, mapsApiKey, settings.googleMapsApiKey, settings]);

  // Build city card overlays once map + data are ready.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    cityPointsRef.current = cityPoints;
    clearOverlays();

    for (const point of cityPoints) {
      const selected = markers.some(
        (m) => m.param === selectedParam && cityCoordKey(m.city, m.state) === point.key,
      );

      const overlay = createCityOverlay(map, point, selected, () => {
        onSelectRef.current(point.param);
      });
      overlaysRef.current.push(overlay);
    }

    const dataChanged = lastCityPointsKeyRef.current !== cityPointsKey;
    lastCityPointsKeyRef.current = cityPointsKey;

    if (dataChanged) {
      suppressFlyRef.current = true;
      fitAllMarkers(
        map,
        cityPoints.map((p) => p.position),
      );
      window.setTimeout(() => {
        suppressFlyRef.current = false;
      }, 450);
    }
  }, [mapReady, cityPointsKey, cityPoints, selectedParam, markers, clearOverlays]);

  // Fly to selected city when selection changes.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || suppressFlyRef.current || !selectedParam) return;

    const selectedCity = cityPointsRef.current.find((p) => p.param === selectedParam);
    const selected =
      selectedCity ??
      cityPointsRef.current.find((p) =>
        markers.some((m) => m.param === selectedParam && cityCoordKey(m.city, m.state) === p.key),
      );
    if (!selected) return;

    clearZoomTimer();
    flyToLocation(map, selected.position, CITY_ZOOM);
  }, [selectedParam, mapReady, markers, clearZoomTimer, cityPointsKey]);

  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    clearZoomTimer();
    suppressFlyRef.current = true;
    fitAllMarkers(
      map,
      cityPointsRef.current.map((p) => p.position),
    );
    window.setTimeout(() => {
      suppressFlyRef.current = false;
    }, 450);
  };

  if (error) {
    return (
      <div
        className={`flex h-[420px] flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground ${className ?? ""}`}
      >
        <MapPin className="h-8 w-8 opacity-40" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border ${className ?? ""}`}>
      <div ref={containerRef} className="h-[420px] w-full bg-muted" />

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border bg-card/95 p-3 text-xs shadow-sm backdrop-blur">
        <p className="mb-1.5 font-semibold">{t("Queue Status")}</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> {t("Ready to Deliver")}
            <span className="ml-auto font-semibold">{stats.ready}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> {t("Waiting for Minimum")}
            <span className="ml-auto font-semibold">{stats.waiting}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> {t("Scheduled")}
            <span className="ml-auto font-semibold">{stats.scheduled}</span>
          </li>
        </ul>
      </div>

      <div className="absolute right-3 top-3 z-10">
        <Button type="button" size="sm" variant="secondary" className="h-8 shadow-sm" onClick={resetView}>
          <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
          {t("View all")}
        </Button>
      </div>
    </div>
  );
}
