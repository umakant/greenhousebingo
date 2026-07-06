"use client";

import { appConfirm } from "@/lib/app-confirm";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  Filter,
  Globe,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  StarOff,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";

import {
  StorefrontAdminErrorAlert,
  StorefrontAdminMainCard,
  StorefrontAdminPageShell,
} from "@/components/storefront/storefront-admin-page-layout";
import NoRecordsFound from "@/components/no-records-found";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { openNativeFilePicker } from "@/lib/open-native-file-picker";
import { parseJsonResponse } from "@/lib/safe-fetch-json";
import {
  STOREFRONT_EDITOR_IMAGE_MAX_BYTES,
  storefrontEditorImageTooLargeMessage,
} from "@/lib/storefront/storefront-image-upload-limit";
import type { WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import { t } from "@/lib/admin-t";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type EventRow = {
  id: string;
  websiteId: string | null;
  slug: string;
  title: string;
  location: string | null;
  venue: string | null;
  eventDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  description: string | null;
  status: string;
  sortOrder: number;
  isFeatured: boolean;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string | null;
};

type Tab = "all" | "published" | "draft" | "archived";
type EventSortField = "title" | "date" | "location" | "status";
type EventTableColumnId = "title" | "date" | "location" | "status";

const EVENTS_COLUMN_STORAGE_KEY = "pf-storefront-events-admin-columns-v1";

const DEFAULT_EVENT_TABLE_COLUMNS: Record<EventTableColumnId, boolean> = {
  title: true,
  date: true,
  location: true,
  status: true,
};

function statusSortKey(s: string): number {
  if (s === "published") return 0;
  if (s === "draft") return 1;
  if (s === "archived") return 2;
  return 3;
}

function locationSortKey(e: { city: string | null; state: string | null; location: string | null; venue: string | null }): string {
  const cityState = [e.city?.trim(), e.state?.trim()].filter(Boolean).join(", ");
  return (cityState || e.location?.trim() || e.venue?.trim() || "").toLowerCase();
}

/**
 * Form state for the editor sheet. Date and time are kept as separate strings
 * (ISO `YYYY-MM-DD` from `DatePickerInput`, `HH:MM` from a native time `<Input>`)
 * so each control owns its own piece of state — they're combined into a single
 * ISO timestamp at submit time.
 */
type EditDraft = {
  title: string;
  slug: string;
  venue: string;
  /** Street address (line 1). Filled by Places autocomplete. */
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  /** String representations so empty inputs stay empty (number coercion happens at submit). */
  latitude: string;
  longitude: string;
  eventDate: string;
  eventTime: string;
  endDate: string;
  endTime: string;
  imageUrl: string;
  linkUrl: string;
  description: string;
  status: "draft" | "published" | "archived";
  websiteId: string;
  sortOrder: number;
  isFeatured: boolean;
};

const EMPTY_DRAFT: EditDraft = {
  title: "",
  slug: "",
  venue: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  latitude: "",
  longitude: "",
  eventDate: "",
  eventTime: "",
  endDate: "",
  endTime: "",
  imageUrl: "",
  linkUrl: "",
  description: "",
  status: "draft",
  websiteId: "",
  sortOrder: 0,
  isFeatured: false,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO → `{date: "YYYY-MM-DD", time: "HH:MM"}` for the split date+time controls. */
function splitIsoForControls(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

/** Combine a `YYYY-MM-DD` date and (optional) `HH:MM` time into an ISO timestamp. */
function combineDateTimeToIso(date: string, time: string): string | null {
  if (!date.trim()) return null;
  const safeTime = time.trim() || "00:00";
  const [h, m] = safeTime.split(":").map((s) => Number.parseInt(s, 10) || 0);
  const [yy, mm, dd] = date.split("-").map((s) => Number.parseInt(s, 10) || 0);
  if (!yy || !mm || !dd) return null;
  const d = new Date(yy, mm - 1, dd, h, m, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parse24hToParts(value: string): { h12: string; min: string; period: "AM" | "PM" } {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  if (!m) return { h12: "12", min: "00", period: "AM" };
  const h24 = Math.max(0, Math.min(23, Number.parseInt(m[1], 10) || 0));
  const min = m[2];
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12: String(h12), min, period };
}

function partsTo24h(h12: string, min: string, period: "AM" | "PM"): string {
  let h = Number.parseInt(h12, 10) || 12;
  if (period === "AM") {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return `${pad2(h)}:${(min || "00").padStart(2, "0")}`;
}

function clampHour12(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 12;
  return Math.min(12, n);
}

function clampMinute(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(59, n);
}

/**
 * 12-hour time picker — typable HH:MM fields with an AM/PM dropdown. Stores its
 * value as `HH:MM` in 24h format so `combineDateTimeToIso` upstream stays
 * unchanged. Always shows AM/PM regardless of browser locale.
 *
 * Pattern: local raw text state for free typing inside the inputs, sync from
 * `value` on external changes (e.g. opening an existing event), commit clamped
 * values on every change so the parent state is always valid; pad/normalize on
 * blur for a tidy display.
 */
function TimePicker12h({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}) {
  const parts = useMemo(() => parse24hToParts(value), [value]);

  const [hourText, setHourText] = useState(parts.h12);
  const [minuteText, setMinuteText] = useState(parts.min);
  const [period, setPeriod] = useState<"AM" | "PM">(parts.period);

  /** Sync local text whenever the external `value` truly changes (e.g. opening an existing event). */
  const lastSyncedValueRef = useRef(value);
  useEffect(() => {
    if (value !== lastSyncedValueRef.current) {
      lastSyncedValueRef.current = value;
      setHourText(parts.h12);
      setMinuteText(parts.min);
      setPeriod(parts.period);
    }
  }, [value, parts.h12, parts.min, parts.period]);

  const commit = useCallback(
    (h: string, m: string, p: "AM" | "PM") => {
      const next = partsTo24h(String(clampHour12(h)), String(clampMinute(m)).padStart(2, "0"), p);
      if (next !== lastSyncedValueRef.current) {
        lastSyncedValueRef.current = next;
        onChange(next);
      }
    },
    [onChange],
  );

  const setPeriodAndCommit = useCallback(
    (next: "AM" | "PM") => {
      if (next === period) return;
      setPeriod(next);
      commit(hourText, minuteText, next);
    },
    [period, hourText, minuteText, commit],
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-1.5"
    >
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={hourText}
        aria-label={t("Hour")}
        placeholder="HH"
        className="h-9 w-12 text-center"
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
          setHourText(v);
          if (v) commit(v, minuteText || "00", period);
        }}
        onBlur={() => {
          const padded = String(clampHour12(hourText));
          setHourText(padded);
          commit(padded, minuteText, period);
        }}
      />
      <span className="text-sm font-medium text-muted-foreground" aria-hidden="true">:</span>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={minuteText}
        aria-label={t("Minute")}
        placeholder="MM"
        className="h-9 w-12 text-center"
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
          setMinuteText(v);
          if (v.length > 0) commit(hourText || "12", v, period);
        }}
        onBlur={() => {
          const padded = String(clampMinute(minuteText)).padStart(2, "0");
          setMinuteText(padded);
          commit(hourText, padded, period);
        }}
      />
      {/*
        AM/PM segmented control. We deliberately use plain buttons (not a
        Radix `<Select>`) because the dropdown lives inside a `<Sheet>` and the
        Radix Select's portal/DismissableLayer can swallow pointer events from
        the parent sheet's focus scope, leaving the dropdown unselectable. A
        two-segment button group is also a one-click toggle, which is better
        UX for a binary choice than a popup with two options.
      */}
      <div
        role="group"
        aria-label={t("AM / PM")}
        className="inline-flex h-9 overflow-hidden rounded-md border border-input bg-background"
      >
        {(["AM", "PM"] as const).map((label) => {
          const active = period === label;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => setPeriodAndCommit(label)}
              className={
                active
                  ? "px-2.5 text-xs font-semibold bg-primary text-primary-foreground"
                  : "px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              }
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function rowToDraft(r: EventRow): EditDraft {
  const validStatus = (s: string): EditDraft["status"] =>
    s === "published" || s === "archived" ? s : "draft";
  const start = splitIsoForControls(r.eventDate);
  const end = splitIsoForControls(r.endDate);
  return {
    title: r.title,
    slug: r.slug,
    venue: r.venue ?? "",
    addressLine: r.addressLine ?? "",
    city: r.city ?? "",
    state: r.state ?? "",
    postalCode: r.postalCode ?? "",
    country: r.country ?? "",
    latitude: r.latitude != null ? String(r.latitude) : "",
    longitude: r.longitude != null ? String(r.longitude) : "",
    eventDate: start.date,
    eventTime: start.time,
    endDate: end.date,
    endTime: end.time,
    imageUrl: r.imageUrl ?? "",
    linkUrl: r.linkUrl ?? "",
    description: r.description ?? "",
    status: validStatus(r.status),
    websiteId: r.websiteId ?? "",
    sortOrder: r.sortOrder,
    isFeatured: r.isFeatured,
  };
}

function formatDateLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function StorefrontEventsAdmin() {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<EventRow[]>([]);
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  /** Bulk selection + table chrome state — mirrors the products admin so the page feels consistent. */
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState<EventSortField>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<EventTableColumnId>(
    EVENTS_COLUMN_STORAGE_KEY,
    DEFAULT_EVENT_TABLE_COLUMNS,
  );

  const eventsColumnMenuDefs = useMemo(
    () => [
      { id: "title" as const, label: t("Title") },
      { id: "date" as const, label: t("Date") },
      { id: "location" as const, label: t("Location") },
      { id: "status" as const, label: t("Status") },
    ],
    [],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>(EMPTY_DRAFT);

  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageBlobPreview, setImageBlobPreview] = useState<string | null>(null);
  const imageBlobRef = useRef<string | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const replaceImageBlob = useCallback((next: string | null) => {
    if (imageBlobRef.current) URL.revokeObjectURL(imageBlobRef.current);
    imageBlobRef.current = next;
    setImageBlobPreview(next);
  }, []);

  useEffect(() => {
    return () => {
      if (imageBlobRef.current) URL.revokeObjectURL(imageBlobRef.current);
    };
  }, []);

  const buildApiUrl = useCallback(
    (pathname: string, extraSearch?: Record<string, string | undefined>) => {
      const u = new URL(pathname, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (orgCtx?.isSuperadmin && selectedOrgId) {
        u.searchParams.set("organizationId", selectedOrgId);
      }
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          if (v != null && v !== "") u.searchParams.set(k, v);
        }
      }
      return u.pathname + u.search;
    },
    [orgCtx?.isSuperadmin, selectedOrgId],
  );

  const orgReady = orgCtx != null && (!orgCtx.isSuperadmin || !!selectedOrgId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = (await res.json()) as OrgContext & { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load organization context");
        if (cancelled) return;
        const c: OrgContext = {
          isSuperadmin: json.isSuperadmin,
          organizations: json.organizations ?? [],
          defaultOrganizationId: json.defaultOrganizationId ?? null,
        };
        setOrgCtx(c);
        let orgId: string | null = null;
        if (c.isSuperadmin) {
          const stored = typeof window !== "undefined" ? window.localStorage.getItem(ORG_STORAGE_KEY) : null;
          const ids = new Set(c.organizations.map((o) => o.id));
          if (stored && ids.has(stored)) orgId = stored;
          else orgId = c.defaultOrganizationId;
          if (orgId) {
            try {
              window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
            } catch {
              /* ignore */
            }
          }
        } else {
          orgId = c.defaultOrganizationId;
        }
        setSelectedOrgId(orgId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWebsites = useCallback(async () => {
    if (!orgReady) return;
    try {
      const res = await fetch(buildApiUrl("/api/storefront/websites"), { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; data?: WebsiteRow[] };
      if (res.ok && data.ok) {
        setWebsites(data.data ?? []);
      }
    } catch {
      /* optional */
    }
  }, [buildApiUrl, orgReady]);

  const loadEvents = useCallback(async () => {
    if (!orgReady) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(buildApiUrl("/api/storefront/events"), { credentials: "same-origin" });
      const data = (await res.json()) as {
        ok?: boolean;
        events?: EventRow[];
        message?: string;
        storefrontNotice?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setRawRows(data.events ?? []);
      setSelected(new Set());
      const n = data.storefrontNotice?.trim();
      setNotice(n ? n : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, orgReady]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleSearch = () => {
    setQ(searchInput.trim());
    setPage(1);
  };

  const filteredRows = useMemo(() => {
    const qt = q.trim().toLowerCase();
    let list = rawRows;
    if (tab === "published") list = list.filter((r) => r.status === "published");
    if (tab === "draft") list = list.filter((r) => r.status === "draft");
    if (tab === "archived") list = list.filter((r) => r.status === "archived");
    if (qt) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(qt) ||
          (r.location ?? "").toLowerCase().includes(qt) ||
          (r.venue ?? "").toLowerCase().includes(qt) ||
          (r.city ?? "").toLowerCase().includes(qt) ||
          (r.state ?? "").toLowerCase().includes(qt) ||
          r.slug.toLowerCase().includes(qt),
      );
    }
    return list;
  }, [q, rawRows, tab]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    const dir = sortDirection === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      } else if (sortField === "date") {
        const ta = a.eventDate ? new Date(a.eventDate).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.eventDate ? new Date(b.eventDate).getTime() : Number.MAX_SAFE_INTEGER;
        cmp = ta - tb;
      } else if (sortField === "location") {
        cmp = locationSortKey(a).localeCompare(locationSortKey(b), undefined, { sensitivity: "base" });
      } else if (sortField === "status") {
        cmp = statusSortKey(a.status) - statusSortKey(b.status);
        if (cmp === 0) cmp = a.status.localeCompare(b.status);
      }
      return cmp * dir;
    });
    return copy;
  }, [filteredRows, sortField, sortDirection]);

  const total = sortedRows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);

  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const pageSafe = Math.min(page, lastPage);
  const paginatedRows = useMemo(() => {
    const start = (pageSafe - 1) * perPage;
    return sortedRows.slice(start, start + perPage);
  }, [sortedRows, pageSafe, perPage]);

  const from = total === 0 ? 0 : (pageSafe - 1) * perPage + 1;
  const to = Math.min(pageSafe * perPage, total);

  const allSelected = sortedRows.length > 0 && sortedRows.every((r) => selected.has(r.id));
  const toggleSelect = (id: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };
  const toggleSelectAll = (on: boolean) => {
    if (on) setSelected(new Set(sortedRows.map((r) => r.id)));
    else setSelected(new Set());
  };

  const handleSort = (field: EventSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "asc" : "asc");
    }
  };

  const sortChevron = (field: EventSortField) => (
    <ChevronDown
      className={`ml-1 inline-block h-3 w-3 transition-transform ${
        sortField === field && sortDirection === "desc" ? "rotate-180" : ""
      }`}
    />
  );

  const activeFilterCount = tab !== "all" ? 1 : 0;
  const hasFilters = !!q.trim() || tab !== "all";

  /** Bulk actions used by the selection bar. Each iterates serially so audit logs stay paired with their row. */
  const bulkPatch = async (body: Record<string, unknown>) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      for (const id of ids) {
        const res = await fetch(buildApiUrl(`/api/storefront/events/${encodeURIComponent(id)}`), {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) throw new Error(data.message ?? `Failed on ${id}`);
      }
      await loadEvents();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const bulkPublish = () => void bulkPatch({ status: "published" });
  const bulkDraft = () => void bulkPatch({ status: "draft" });
  const bulkArchive = () => void bulkPatch({ status: "archived" });
  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!(await appConfirm(t("Delete selected events permanently? This cannot be undone.")))) return;
    setLoading(true);
    setError(null);
    try {
      for (const id of ids) {
        const res = await fetch(buildApiUrl(`/api/storefront/events/${encodeURIComponent(id)}`), {
          method: "DELETE",
          credentials: "same-origin",
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) throw new Error(data.message ?? `Failed on ${id}`);
      }
      await loadEvents();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    /**
     * Default to "All websites" (empty string → NULL on save) so new events surface on every
     * site for the org. Pinning to a specific website is opt-in via the Website selector — this
     * prevents the common footgun of an event being saved against an inactive/draft site and
     * silently never appearing on the public storefront.
     */
    setDraft({ ...EMPTY_DRAFT });
    setImageUploadError(null);
    replaceImageBlob(null);
    setEditorOpen(true);
  };

  const openEdit = (row: EventRow) => {
    setEditingId(row.id);
    setDraft(rowToDraft(row));
    setImageUploadError(null);
    replaceImageBlob(null);
    setEditorOpen(true);
  };

  const triggerImagePicker = useCallback(() => {
    if (imageUploading) return;
    openNativeFilePicker(imageFileRef.current);
  }, [imageUploading]);

  const onImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > STOREFRONT_EDITOR_IMAGE_MAX_BYTES) {
      setImageUploadError(storefrontEditorImageTooLargeMessage());
      return;
    }
    setImageUploadError(null);
    replaceImageBlob(URL.createObjectURL(file));
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(buildApiUrl("/api/storefront/events/upload-image"), {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      const data = await parseJsonResponse<{ ok?: boolean; urls?: string[]; message?: string }>(res);
      if (!res.ok || !data.ok || !data.urls?.[0]) {
        throw new Error(data.message ?? t("Upload failed"));
      }
      replaceImageBlob(null);
      setDraft((d) => ({ ...d, imageUrl: data.urls![0]! }));
    } catch (err: unknown) {
      replaceImageBlob(null);
      setImageUploadError(err instanceof Error ? err.message : t("Upload failed"));
    } finally {
      setImageUploading(false);
    }
  };

  const submit = async () => {
    if (!draft.title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const latNum = draft.latitude.trim() === "" ? null : Number(draft.latitude);
      const lngNum = draft.longitude.trim() === "" ? null : Number(draft.longitude);
      const payload = {
        title: draft.title.trim(),
        slug: draft.slug.trim() || undefined,
        venue: draft.venue.trim() || null,
        addressLine: draft.addressLine.trim() || null,
        city: draft.city.trim() || null,
        state: draft.state.trim() || null,
        postalCode: draft.postalCode.trim() || null,
        country: draft.country.trim() || null,
        latitude: latNum != null && Number.isFinite(latNum) ? latNum : null,
        longitude: lngNum != null && Number.isFinite(lngNum) ? lngNum : null,
        eventDate: combineDateTimeToIso(draft.eventDate, draft.eventTime),
        endDate: combineDateTimeToIso(draft.endDate, draft.endTime),
        imageUrl: draft.imageUrl.trim() || null,
        linkUrl: draft.linkUrl.trim() || null,
        description: draft.description.trim() || null,
        status: draft.status,
        websiteId: draft.websiteId || null,
        sortOrder: Math.max(0, Number(draft.sortOrder) || 0),
        isFeatured: draft.isFeatured,
      };
      const url = editingId
        ? buildApiUrl(`/api/storefront/events/${encodeURIComponent(editingId)}`)
        : buildApiUrl("/api/storefront/events");
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setEditorOpen(false);
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      replaceImageBlob(null);
      await loadEvents();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const patchEvent = async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/events/${encodeURIComponent(id)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadEvents();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const removeEvent = async (id: string) => {
    if (!(await appConfirm(t("Delete this event?")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/events/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadEvents();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Items shown inside the row's overflow menu. The primary "Edit" pencil button is rendered
   * separately (see the table cell below), matching the products admin's "View + ▼" pattern,
   * so we deliberately do NOT include Edit in this list.
   */
  const buildRowActions = (e: EventRow): TableActionItem[] => {
    const iconCls = "h-4 w-4";
    const items: TableActionItem[] = [];
    if (e.status === "published") {
      items.push({
        label: t("Move to draft"),
        icon: <Undo2 className={iconCls} />,
        onSelect: () => void patchEvent(e.id, { status: "draft" }),
      });
      items.push({
        label: t("Archive"),
        icon: <Archive className={iconCls} />,
        onSelect: () => void patchEvent(e.id, { status: "archived" }),
      });
    } else {
      items.push({
        label: t("Publish"),
        icon: <Globe className={iconCls} />,
        onSelect: () => void patchEvent(e.id, { status: "published" }),
      });
    }
    items.push({
      label: e.isFeatured ? t("Unfeature") : t("Feature"),
      icon: e.isFeatured ? <StarOff className={iconCls} /> : <Star className={iconCls} />,
      onSelect: () => void patchEvent(e.id, { isFeatured: !e.isFeatured }),
    });
    items.push({
      label: t("Delete"),
      icon: <Trash2 className={iconCls} />,
      onSelect: () => void removeEvent(e.id),
      destructive: true,
    });
    return items;
  };

  const actionIconCls = "h-4 w-4";

  if (orgLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  /**
   * Hidden file input lives in a portal so it isn't unmounted/remounted by the Sheet
   * animation (matches the blog admin pattern — `openNativeFilePicker` requires the input
   * be present in the DOM at the moment we trigger the click).
   */
  const eventImageFilePortal =
    editorOpen && typeof document !== "undefined"
      ? createPortal(
          <input
            ref={imageFileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
            className="sr-only"
            tabIndex={-1}
            onChange={(ev) => void onImageFileChange(ev)}
            disabled={imageUploading}
          />,
          document.body,
        )
      : null;

  const previewSrc = imageBlobPreview ?? draft.imageUrl;

  return (
    <>
      {eventImageFilePortal}
      <StorefrontAdminPageShell>
        <StorefrontAdminErrorAlert>{error}</StorefrontAdminErrorAlert>
        {notice ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {notice}
          </div>
        ) : null}

        <StorefrontAdminMainCard contentClassName="p-0 sm:p-0">
          <div className="space-y-0">
            <div className="border-b bg-muted/30 p-4 sm:p-6">
              {orgCtx?.isSuperadmin ? (
                <div className="mb-4 flex flex-wrap items-end gap-4 border-b border-border/60 pb-4">
                  <div className="min-w-[200px] max-w-xs space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">{t("Company")}</Label>
                    <Select
                      value={selectedOrgId ?? "__none__"}
                      onValueChange={(v) => {
                        if (v === "__none__") return;
                        setSelectedOrgId(v);
                        try {
                          window.localStorage.setItem(ORG_STORAGE_KEY, v);
                        } catch {
                          /* ignore */
                        }
                        void loadEvents();
                        void loadWebsites();
                      }}
                    >
                      <SelectTrigger className="h-11 bg-background">
                        <SelectValue placeholder={t("Select company")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled>
                          {t("Select company…")}
                        </SelectItem>
                        {orgCtx.organizations.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
                <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                  <SearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    onSearch={handleSearch}
                    placeholder={t("Search events...")}
                    buttonLabel={t("Search")}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                  <div className="flex overflow-hidden rounded-md border">
                    <button
                      type="button"
                      className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      title={t("List view")}
                      aria-label={t("List view")}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      title={t("Grid view")}
                      aria-label={t("Grid view")}
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                  <Select
                    value={String(perPage)}
                    onValueChange={(v) => {
                      const n = parseInt(v, 10) || 10;
                      setPerPage(n);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {t("per page")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="default" className="relative">
                        <Filter className="mr-2 h-4 w-4" />
                        {t("Filters")}
                        {activeFilterCount > 0 ? (
                          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                            {activeFilterCount}
                          </span>
                        ) : null}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2">
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        {t("Status")}
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={tab}
                        onValueChange={(v) => {
                          setTab(v as Tab);
                          setPage(1);
                        }}
                      >
                        <DropdownMenuRadioItem value="all">{t("All")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="published">{t("Published")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="draft">{t("Draft")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="archived">{t("Archived")}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TableColumnVisibilityMenu
                    columns={eventsColumnMenuDefs}
                    columnVisible={columnVisible}
                    setVisibility={setVisibility}
                    onReset={resetVisibility}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 shrink-0"
                    onClick={() => void loadEvents()}
                    disabled={loading}
                    aria-label={t("Refresh")}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-9 gap-1"
                    title={t("Open the appointments calendar view of published events")}
                  >
                    <Link href="/storefront/events-schedule">
                      <CalendarDays className="h-4 w-4" />
                      {t("Schedule view")}
                    </Link>
                  </Button>
                  <Button type="button" size="sm" className="gap-1" onClick={openCreate} disabled={!orgReady || loading}>
                    <Plus className="h-4 w-4" />
                    {t("Add event")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {selected.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">
                    {selected.size} {t("selected")}
                  </span>
                  <Button type="button" size="sm" variant="secondary" onClick={() => bulkPublish()} disabled={loading}>
                    {t("Publish")}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => bulkDraft()} disabled={loading}>
                    {t("Move to draft")}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => bulkArchive()} disabled={loading}>
                    {t("Archive")}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => void bulkDelete()} disabled={loading}>
                    {t("Delete")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    {t("Clear selection")}
                  </Button>
                </div>
              ) : null}

              {loading && rawRows.length === 0 ? (
                <div className="flex justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sortedRows.length === 0 ? (
                <NoRecordsFound
                  icon={CalendarDays}
                  title={t("No events found")}
                  description={t(
                    "Add upcoming pop-ups, festivals, or tour dates. Published events replace the Concept theme's “Shop the Feed” block on /shop.",
                  )}
                  hasFilters={hasFilters}
                  onClearFilters={() => {
                    setTab("all");
                    setSearchInput("");
                    setQ("");
                    setPage(1);
                  }}
                />
              ) : viewMode === "list" ? (
                <div className="overflow-x-auto rounded-md border border-border/60">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-12 min-w-[3rem] max-w-[3rem] p-3 text-left font-medium">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(c) => toggleSelectAll(c === true)}
                            aria-label={t("Select all")}
                          />
                        </th>
                        {columnVisible("title") ? (
                          <th className="min-w-0 p-3 text-left font-medium">
                            <button
                              type="button"
                              className="inline-flex max-w-full items-center truncate"
                              onClick={() => handleSort("title")}
                            >
                              {t("Title")}
                              {sortChevron("title")}
                            </button>
                          </th>
                        ) : null}
                        {columnVisible("date") ? (
                          <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium md:table-cell">
                            <button
                              type="button"
                              className="inline-flex w-full items-center justify-center gap-0.5"
                              onClick={() => handleSort("date")}
                            >
                              {t("Date")}
                              {sortChevron("date")}
                            </button>
                          </th>
                        ) : null}
                        {columnVisible("location") ? (
                          <th className="hidden min-w-0 p-3 text-center font-medium sm:table-cell">
                            <button
                              type="button"
                              className="inline-flex w-full max-w-full items-center justify-center gap-0.5 truncate"
                              onClick={() => handleSort("location")}
                            >
                              {t("Location")}
                              {sortChevron("location")}
                            </button>
                          </th>
                        ) : null}
                        {columnVisible("status") ? (
                          <th className="hidden min-w-0 whitespace-nowrap p-3 text-center font-medium md:table-cell">
                            <button
                              type="button"
                              className="inline-flex w-full max-w-full items-center justify-center gap-0.5 truncate"
                              onClick={() => handleSort("status")}
                            >
                              {t("Status")}
                              {sortChevron("status")}
                            </button>
                          </th>
                        ) : null}
                        <th className="min-w-0 p-3 text-right font-medium">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((e) => {
                        const items = buildRowActions(e);
                        const cityState = [e.city?.trim(), e.state?.trim()].filter(Boolean).join(", ");
                        const locationLabel = cityState || e.location?.trim() || e.venue?.trim() || "—";
                        return (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="w-12 min-w-[3rem] max-w-[3rem] p-3 align-top">
                              <Checkbox
                                checked={selected.has(e.id)}
                                onCheckedChange={(c) => toggleSelect(e.id, c === true)}
                                aria-label={t("Select row")}
                              />
                            </td>
                            {columnVisible("title") ? (
                              <td className="min-w-0 p-3 align-top">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                                    {e.imageUrl ? (
                                      <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                        <CalendarDays className="h-4 w-4" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex min-w-0 flex-col gap-0.5">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openEdit(e)}
                                        className="truncate text-left font-medium text-primary hover:underline"
                                        title={e.title}
                                      >
                                        {e.title}
                                      </button>
                                      {e.isFeatured ? (
                                        <Badge variant="outline" className="shrink-0 text-[10px] font-normal text-amber-600">
                                          {t("Featured")}
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <span className="text-xs text-muted-foreground">/{e.slug}</span>
                                    {/* Compact mobile-only summary, mirrors the products admin pattern. */}
                                    <div className="mt-1 space-y-1 md:hidden">
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{formatDateLabel(e.eventDate)}</span>
                                        {locationLabel !== "—" ? <> {" · "} {locationLabel}</> : null}
                                      </p>
                                      <Badge
                                        variant={
                                          e.status === "published" ? "default" : e.status === "archived" ? "outline" : "secondary"
                                        }
                                        className="w-fit"
                                      >
                                        {e.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            ) : null}
                            {columnVisible("date") ? (
                              <td className="hidden min-w-0 whitespace-nowrap p-3 text-center align-top text-muted-foreground md:table-cell">
                                {formatDateLabel(e.eventDate)}
                              </td>
                            ) : null}
                            {columnVisible("location") ? (
                              <td className="hidden min-w-0 p-3 text-center align-top text-muted-foreground sm:table-cell">
                                {locationLabel}
                              </td>
                            ) : null}
                            {columnVisible("status") ? (
                              <td className="hidden min-w-0 p-3 text-center align-top md:table-cell">
                                <div className="flex justify-center">
                                  <Badge
                                    variant={
                                      e.status === "published" ? "default" : e.status === "archived" ? "outline" : "secondary"
                                    }
                                  >
                                    {e.status}
                                  </Badge>
                                </div>
                              </td>
                            ) : null}
                            <td className="min-w-0 p-3 text-right align-top">
                              <TableActionButton
                                label={t("Edit")}
                                primaryIcon={<Pencil className={actionIconCls} />}
                                onPrimaryClick={() => openEdit(e)}
                                items={items}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedRows.map((e) => {
                    const items = buildRowActions(e);
                    const cityState = [e.city?.trim(), e.state?.trim()].filter(Boolean).join(", ");
                    const locationLabel = cityState || e.location?.trim() || e.venue?.trim() || "—";
                    return (
                      <Card key={e.id} className="overflow-hidden border-border/60 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                              {e.imageUrl ? (
                                <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <CalendarDays className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(e)}
                                  className="block min-w-0 flex-1 text-left font-medium text-primary hover:underline"
                                >
                                  {e.title}
                                </button>
                                {e.isFeatured ? (
                                  <Badge variant="outline" className="shrink-0 text-[10px] font-normal text-amber-600">
                                    {t("Featured")}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">/{e.slug}</p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>{formatDateLabel(e.eventDate)}</span>
                                {locationLabel !== "—" ? <span>{locationLabel}</span> : null}
                              </div>
                              <Badge
                                variant={
                                  e.status === "published" ? "default" : e.status === "archived" ? "outline" : "secondary"
                                }
                                className="mt-2 w-fit"
                              >
                                {e.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
                            <TableActionButton
                              label={t("Edit")}
                              primaryIcon={<Pencil className={actionIconCls} />}
                              onPrimaryClick={() => openEdit(e)}
                              items={items}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {!loading && sortedRows.length > 0 ? (
                <div className="border-t border-border/60 pt-4">
                  <Pagination page={pageSafe} lastPage={lastPage} total={total} from={from} to={to} onPageChange={setPage} />
                </div>
              ) : null}
            </div>
          </div>
        </StorefrontAdminMainCard>

        <Sheet
          open={editorOpen}
          onOpenChange={(o) => {
            setEditorOpen(o);
            if (!o) {
              setEditingId(null);
              setDraft(EMPTY_DRAFT);
              replaceImageBlob(null);
              setImageUploadError(null);
            }
          }}
        >
          <SheetContent
            side="right"
            className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md md:max-w-lg"
          >
            <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
              <SheetTitle>{editingId ? t("Edit event") : t("Add event")}</SheetTitle>
              <SheetDescription>
                {t("Published events replace the Concept theme’s “Shop the Feed” section on the storefront.")}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sf-event-title">{t("Title")}</Label>
                  <Input
                    id="sf-event-title"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder={t("Summer Pop-Up — Birmingham")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-event-slug">{t("Slug (optional)")}</Label>
                  <Input
                    id="sf-event-slug"
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                    placeholder={t("summer-popup-birmingham")}
                  />
                </div>

                <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Start")}
                  </Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
                    <DatePickerInput
                      id="sf-event-start-date"
                      value={draft.eventDate}
                      onChange={(e) => setDraft((d) => ({ ...d, eventDate: e.target.value }))}
                      placeholder={t("Pick start date")}
                    />
                    <TimePicker12h
                      value={draft.eventTime}
                      onChange={(v) => setDraft((d) => ({ ...d, eventTime: v }))}
                      ariaLabel={t("Start time")}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("End (optional)")}
                  </Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
                    <DatePickerInput
                      id="sf-event-end-date"
                      value={draft.endDate}
                      onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                      placeholder={t("Pick end date")}
                    />
                    <TimePicker12h
                      value={draft.endTime}
                      onChange={(v) => setDraft((d) => ({ ...d, endTime: v }))}
                      ariaLabel={t("End time")}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Location")}
                  </Label>

                  <div className="space-y-2">
                    <Label htmlFor="sf-event-address">{t("Address")}</Label>
                    <AddressAutocomplete
                      id="sf-event-address"
                      value={draft.addressLine}
                      onChange={(v) => setDraft((d) => ({ ...d, addressLine: v }))}
                      onPlaceSelect={(parsed) => {
                        setDraft((d) => ({
                          ...d,
                          addressLine: parsed.street || d.addressLine,
                          city: parsed.city || d.city,
                          state: parsed.state || d.state,
                          postalCode: parsed.zip || d.postalCode,
                          country: parsed.country || d.country,
                          latitude:
                            parsed.latitude != null && Number.isFinite(parsed.latitude)
                              ? String(parsed.latitude)
                              : d.latitude,
                          longitude:
                            parsed.longitude != null && Number.isFinite(parsed.longitude)
                              ? String(parsed.longitude)
                              : d.longitude,
                        }));
                      }}
                      placeholder={t("Start typing an address…")}
                      inputProps={{ autoComplete: "off" }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Powered by Google Places — pick from the dropdown to auto-fill city, state, ZIP, latitude, and longitude.",
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="sf-event-city">{t("City")}</Label>
                      <Input
                        id="sf-event-city"
                        value={draft.city}
                        onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                        placeholder={t("Birmingham")}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="sf-event-state">{t("State / region")}</Label>
                      <Input
                        id="sf-event-state"
                        value={draft.state}
                        onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                        placeholder={t("AL")}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="sf-event-zip">{t("ZIP / postal code")}</Label>
                      <Input
                        id="sf-event-zip"
                        value={draft.postalCode}
                        onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
                        placeholder={t("35203")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="sf-event-country">{t("Country")}</Label>
                      <Input
                        id="sf-event-country"
                        value={draft.country}
                        onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                        placeholder={t("United States")}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="sf-event-lat">{t("Latitude")}</Label>
                      <Input
                        id="sf-event-lat"
                        value={draft.latitude}
                        inputMode="decimal"
                        onChange={(e) => setDraft((d) => ({ ...d, latitude: e.target.value }))}
                        placeholder={t("33.5186")}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="sf-event-lng">{t("Longitude")}</Label>
                      <Input
                        id="sf-event-lng"
                        value={draft.longitude}
                        inputMode="decimal"
                        onChange={(e) => setDraft((d) => ({ ...d, longitude: e.target.value }))}
                        placeholder={t("-86.8104")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sf-event-venue">{t("Venue (optional)")}</Label>
                    <Input
                      id="sf-event-venue"
                      value={draft.venue}
                      onChange={(e) => setDraft((d) => ({ ...d, venue: e.target.value }))}
                      placeholder={t("Railroad Park")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("Cover image")}</Label>
                  {previewSrc ? (
                    <div className="overflow-hidden rounded-md border border-border/60 bg-muted/30">
                      <div className="relative aspect-[16/9] w-full">
                        <img
                          src={previewSrc}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        {imageUploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/60 p-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={triggerImagePicker}
                          disabled={imageUploading}
                        >
                          {imageUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {t("Uploading…")}
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" />
                              {t("Replace")}
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            replaceImageBlob(null);
                            setDraft((d) => ({ ...d, imageUrl: "" }));
                          }}
                          disabled={imageUploading}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("Remove")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={triggerImagePicker}
                      disabled={imageUploading}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-sm text-muted-foreground transition hover:bg-muted/30 disabled:opacity-60"
                    >
                      {imageUploading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{t("Uploading…")}</span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="h-6 w-6" />
                          <span className="font-medium text-foreground">{t("Upload event image")}</span>
                          <span className="text-xs">{t("PNG, JPG, GIF, WebP, or SVG")}</span>
                        </>
                      )}
                    </button>
                  )}
                  {imageUploadError ? (
                    <p className="text-xs text-destructive" role="alert">{imageUploadError}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sf-event-link">{t("CTA / details link (optional)")}</Label>
                  <Input
                    id="sf-event-link"
                    value={draft.linkUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
                    placeholder={t("https://…/tickets")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-event-desc">{t("Description (optional)")}</Label>
                  <Textarea
                    id="sf-event-desc"
                    rows={3}
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder={t("Short blurb shown on the event details page.")}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("Status")}</Label>
                    <Select
                      value={draft.status}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, status: (v as EditDraft["status"]) ?? "draft" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{t("Draft")}</SelectItem>
                        <SelectItem value="published">{t("Published")}</SelectItem>
                        <SelectItem value="archived">{t("Archived")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sf-event-sort">{t("Sort order")}</Label>
                    <Input
                      id="sf-event-sort"
                      type="number"
                      value={draft.sortOrder}
                      onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                {websites.length > 0 ? (
                  <div className="space-y-2">
                    <Label>{t("Website (optional)")}</Label>
                    <Select
                      value={draft.websiteId || "__none__"}
                      onValueChange={(v) => setDraft((d) => ({ ...d, websiteId: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("All websites")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("All websites")}</SelectItem>
                        {websites.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="sf-event-featured" className="text-sm font-medium">
                      {t("Featured")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("Featured events are surfaced first on the storefront events strip.")}
                    </p>
                  </div>
                  <Switch
                    id="sf-event-featured"
                    checked={draft.isFeatured}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, isFeatured: v }))}
                  />
                </div>
                {editingId ? (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => void removeEvent(editingId)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("Delete event")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <SheetFooter className="shrink-0 flex-row flex-wrap gap-2 border-t px-6 py-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditorOpen(false);
                  setEditingId(null);
                  setDraft(EMPTY_DRAFT);
                  replaceImageBlob(null);
                }}
              >
                {t("Cancel")}
              </Button>
              <Button type="button" onClick={() => void submit()} disabled={!draft.title.trim() || loading || imageUploading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? t("Save changes") : t("Create event")}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </StorefrontAdminPageShell>
    </>
  );
}
