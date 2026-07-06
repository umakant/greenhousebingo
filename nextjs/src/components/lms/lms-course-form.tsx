"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import MediaPicker from "@/components/MediaPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Category = { id: string; name: string };
type Profile = { id: string; displayName: string; user?: { email: string | null } | null };

type CourseApi = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  deliveryType: string;
  status: string;
  isPublic: boolean;
  capacity: number | null;
  accessStartsAt: string | null;
  accessEndsAt: string | null;
  categoryId: string | null;
  coverImageUrl: string | null;
  salePrice: string | null;
  saleCurrency: string;
  instructors: Array<{
    instructorProfileId: string;
    role: string | null;
    isPrimary: boolean;
  }>;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function splitDatetimeLocalValue(value: string): { date: string; time: string } {
  if (!value.trim()) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date: date ?? "", time: time ?? "" };
}

function patchDatetimeLocalValue(value: string, patch: { date?: string; time?: string }): string {
  const { date, time } = splitDatetimeLocalValue(value);
  const nextDate = patch.date !== undefined ? patch.date : date;
  const nextTime = patch.time !== undefined ? patch.time : time;
  if (!nextDate.trim()) return "";
  return `${nextDate.trim()}T${(nextTime || "00:00").trim()}`;
}

export const LMS_COURSE_FORM_ID = "lms-course-form";

export function LmsCourseForm(props: {
  mode: "create" | "edit";
  courseId?: string;
  layout?: "page" | "drawer";
  formId?: string;
  onSaved?: (courseId?: string) => void;
  onSavingChange?: (saving: boolean) => void;
}) {
  const { mode, courseId, layout = "page", formId = LMS_COURSE_FORM_ID, onSaved, onSavingChange } = props;
  const router = useRouter();
  const [loading, setLoading] = React.useState(mode === "edit");
  const [saving, setSaving] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [newCategoryName, setNewCategoryName] = React.useState("");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [deliveryType, setDeliveryType] = React.useState("VIDEO");
  const [status, setStatus] = React.useState("DRAFT");
  const [isPublic, setIsPublic] = React.useState(false);
  const [capacity, setCapacity] = React.useState("");
  const [accessStartsAt, setAccessStartsAt] = React.useState("");
  const [accessEndsAt, setAccessEndsAt] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("");
  const [saleCurrency, setSaleCurrency] = React.useState("USD");

  type InstState = Record<string, { selected: boolean; role: string; isPrimary: boolean }>;

  const [instructors, setInstructors] = React.useState<InstState>({});

  const setInst = React.useCallback((id: string, patch: Partial<InstState[string]>) => {
    setInstructors((prev) => {
      const cur = prev[id] ?? { selected: false, role: "", isPrimary: false };
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/lms/course-categories", { credentials: "include", cache: "no-store" }),
          fetch("/api/lms/instructor-profiles", { credentials: "include", cache: "no-store" }),
        ]);
        const cJson = (await cRes.json()) as { ok?: boolean; items?: Category[] };
        const pJson = (await pRes.json()) as { ok?: boolean; items?: Profile[] };
        if (cancelled) return;
        if (cRes.ok && cJson?.ok && Array.isArray(cJson.items)) setCategories(cJson.items);
        if (pRes.ok && pJson?.ok && Array.isArray(pJson.items)) setProfiles(pJson.items);
      } catch {
        if (!cancelled) toast.error("Could not load lookups.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (mode !== "edit" || !courseId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [courseRes, profRes] = await Promise.all([
          fetch(`/api/lms/courses/${courseId}`, { credentials: "include", cache: "no-store" }),
          fetch("/api/lms/instructor-profiles", { credentials: "include", cache: "no-store" }),
        ]);
        const courseJson = (await courseRes.json()) as { ok?: boolean; course?: CourseApi; message?: string };
        const profJson = (await profRes.json()) as { ok?: boolean; items?: Profile[] };
        if (!courseRes.ok || !courseJson?.ok || !courseJson.course) {
          throw new Error(courseJson?.message ?? "Failed to load course.");
        }
        if (cancelled) return;
        const c = courseJson.course;
        const profItems = profRes.ok && profJson?.ok && Array.isArray(profJson.items) ? profJson.items : [];
        if (profItems.length) setProfiles(profItems);
        setTitle(c.title);
        setDescription(c.description ?? "");
        setDeliveryType(c.deliveryType);
        setStatus(c.status);
        setIsPublic(c.isPublic);
        setCapacity(c.capacity != null ? String(c.capacity) : "");
        setAccessStartsAt(toDatetimeLocalValue(c.accessStartsAt));
        setAccessEndsAt(toDatetimeLocalValue(c.accessEndsAt));
        setCategoryId(c.categoryId ?? "");
        setCoverImageUrl(c.coverImageUrl ?? "");
        setSalePrice(c.salePrice ?? "");
        setSaleCurrency(c.saleCurrency || "USD");
        const nextInst: InstState = {};
        for (const p of profItems) {
          nextInst[p.id] = { selected: false, role: "", isPrimary: false };
        }
        for (const link of c.instructors) {
          nextInst[link.instructorProfileId] = {
            selected: true,
            role: link.role ?? "",
            isPrimary: link.isPrimary,
          };
        }
        setInstructors(nextInst);
      } catch (e: unknown) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load course.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, courseId]);

  React.useEffect(() => {
    if (mode !== "create") return;
    setInstructors((prev) => {
      const next = { ...prev };
      for (const p of profiles) {
        if (!next[p.id]) next[p.id] = { selected: false, role: "", isPrimary: false };
      }
      return next;
    });
  }, [mode, profiles]);

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    const res = await fetch("/api/lms/course-categories", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: Category; message?: string };
    if (!res.ok || !json?.ok || !json.item) {
      toast.error(json?.message ?? "Could not create category.");
      return;
    }
    setCategories((c) => [...c, json.item!].sort((a, b) => a.name.localeCompare(b.name)));
    setCategoryId(json.item.id);
    setNewCategoryName("");
    toast.success("Category added.");
  }

  function buildInstructorPayload() {
    return Object.entries(instructors)
      .filter(([, v]) => v.selected)
      .map(([id, v]) => ({
        instructorProfileId: id,
        role: v.role.trim() || null,
        isPrimary: v.isPrimary,
      }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    onSavingChange?.(true);
    try {
      const capacityNum = capacity.trim() === "" ? null : Number.parseInt(capacity, 10);
      if (capacity.trim() !== "" && (capacityNum === null || !Number.isFinite(capacityNum) || capacityNum < 0)) {
        throw new Error("Invalid capacity.");
      }

      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        deliveryType,
        status,
        isPublic,
        capacity: capacityNum,
        accessStartsAt: fromDatetimeLocalValue(accessStartsAt),
        accessEndsAt: fromDatetimeLocalValue(accessEndsAt),
        categoryId: categoryId || null,
        coverImageUrl: coverImageUrl.trim() || null,
        linkedPosProductId: null,
        salePrice: salePrice.trim() === "" ? null : salePrice.trim(),
        saleCurrency,
        instructors: buildInstructorPayload(),
      };

      const url = mode === "create" ? "/api/lms/courses" : `/api/lms/courses/${courseId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; course?: { id: string }; message?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Save failed.");
      toast.success(mode === "create" ? "Course created." : "Course saved.");
      if (layout === "drawer") {
        onSaved?.(json.course?.id);
      } else if (mode === "create" && json.course?.id) {
        router.push(`/lms/courses?edit=${json.course.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading course…
      </div>
    );
  }

  const isDrawer = layout === "drawer";

  return (
    <div className={isDrawer ? "space-y-6 pb-2" : "mx-auto max-w-3xl space-y-6 pb-10"}>
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      {!isDrawer ? (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href="/lms/courses">← Courses</Link>
        </Button>
        {mode === "edit" && courseId ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/lms/courses/${courseId}/content`}>Curriculum & lessons</Link>
          </Button>
        ) : null}
      </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>Title, description, and delivery mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-title">Title</Label>
            <Input id="course-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-desc">Description</Label>
            <Textarea id="course-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Delivery</Label>
              <Select value={deliveryType} onValueChange={setDeliveryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="LIVE_CLASS">Live class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <CardDescription>Cover image for the course catalog and overview.</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaPicker label="Cover image" value={coverImageUrl} onChange={(v) => setCoverImageUrl(typeof v === "string" ? v : v[0] ?? "")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-cat">New category name</Label>
              <Input id="new-cat" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Onboarding" />
            </div>
            <Button type="button" variant="secondary" onClick={() => void addCategory()}>
              Add category
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructors</CardTitle>
          <CardDescription>Select profiles and optionally set a role; mark one as primary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No instructor profiles in this organization.</p>
          ) : (
            profiles.map((p) => {
              const st = instructors[p.id] ?? { selected: false, role: "", isPrimary: false };
              return (
                <div key={p.id} className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 sm:w-48">
                    <Checkbox
                      checked={st.selected}
                      onCheckedChange={(chk) => setInst(p.id, { selected: chk === true })}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.displayName}</div>
                      {p.user?.email ? <div className="text-xs text-muted-foreground truncate">{p.user.email}</div> : null}
                    </div>
                  </div>
                  <Input
                    className="sm:flex-1"
                    placeholder="Role (optional)"
                    value={st.role}
                    disabled={!st.selected}
                    onChange={(e) => setInst(p.id, { role: e.target.value })}
                  />
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <Checkbox
                      id={`primary-${p.id}`}
                      checked={st.isPrimary}
                      disabled={!st.selected}
                      onCheckedChange={(chk) => {
                        const on = chk === true;
                        if (on) {
                          setInstructors((prev) => {
                            const n = { ...prev };
                            for (const k of Object.keys(n)) {
                              n[k] = { ...n[k], isPrimary: k === p.id && n[k].selected };
                            }
                            if (!n[p.id]) n[p.id] = { selected: true, role: st.role, isPrimary: true };
                            else n[p.id] = { ...n[p.id], selected: true, isPrimary: true };
                            return n;
                          });
                        } else {
                          setInst(p.id, { isPrimary: false });
                        }
                      }}
                    />
                    <Label htmlFor={`primary-${p.id}`} className="font-normal cursor-pointer">
                      Primary
                    </Label>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Set the course price and currency.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sale-price">Price</Label>
              <Input id="sale-price" type="text" inputMode="decimal" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-ccy">Currency</Label>
              <Select value={saleCurrency} onValueChange={setSaleCurrency}>
                <SelectTrigger id="sale-ccy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Visibility, capacity, and default enrollment access window.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <div>
              <div className="text-sm font-medium">Public catalog</div>
              <p className="text-xs text-muted-foreground">When off, the course is treated as private to your org.</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap">Capacity (empty = unlimited)</Label>
            <Input id="cap" type="number" min={0} step={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Unlimited" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="a1-date">Access starts</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <DatePickerInput
                  id="a1-date"
                  value={splitDatetimeLocalValue(accessStartsAt).date}
                  onChange={(e) => setAccessStartsAt((v) => patchDatetimeLocalValue(v, { date: e.target.value }))}
                />
                <Input
                  id="a1-time"
                  type="time"
                  className="w-full sm:w-[7.5rem]"
                  value={splitDatetimeLocalValue(accessStartsAt).time}
                  onChange={(e) => setAccessStartsAt((v) => patchDatetimeLocalValue(v, { time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a2-date">Access ends</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <DatePickerInput
                  id="a2-date"
                  value={splitDatetimeLocalValue(accessEndsAt).date}
                  onChange={(e) => setAccessEndsAt((v) => patchDatetimeLocalValue(v, { date: e.target.value }))}
                />
                <Input
                  id="a2-time"
                  type="time"
                  className="w-full sm:w-[7.5rem]"
                  value={splitDatetimeLocalValue(accessEndsAt).time}
                  onChange={(e) => setAccessEndsAt((v) => patchDatetimeLocalValue(v, { time: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isDrawer ? (
        <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : mode === "create" ? (
            "Create course"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
      ) : null}
    </form>
    </div>
  );
}
