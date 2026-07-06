"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import MediaPicker from "@/components/MediaPicker";
import { LmsLessonVideoPlayer } from "@/components/lms/lms-lesson-video-player";
import type { LmsLessonVideoSettings } from "@/lib/lms-lesson-video-settings";
import { parseVideoSettings } from "@/lib/lms-lesson-video-settings";
import { extractVimeoVideoId, extractYoutubeVideoId, inferVideoProvider } from "@/lib/lms-video-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { t } from "@/lib/admin-t";


export type ContentLesson = {
  id: string;
  title: string;
  lessonType: string;
  bodyText: string | null;
  videoUrl: string | null;
  /** Provider + playback flags (see `lms-lesson-video-settings`). */
  videoMetadata: unknown;
  liveStartsAt: string | null;
  liveEndsAt: string | null;
  externalLiveUrl: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  isPublished: boolean;
};

export type ContentSection = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: ContentLesson[];
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(s: string): string | null {
  const t0 = s.trim();
  if (!t0) return null;
  const d = new Date(t0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const SEC_PREFIX = "sec:";
const LES_PREFIX = "les:";

function sortableSectionId(id: string) {
  return `${SEC_PREFIX}${id}`;
}
function sortableLessonId(id: string) {
  return `${LES_PREFIX}${id}`;
}
function parseSortableSectionId(d: string | number) {
  const s = String(d);
  return s.startsWith(SEC_PREFIX) ? s.slice(SEC_PREFIX.length) : s;
}
function parseSortableLessonId(d: string | number) {
  const s = String(d);
  return s.startsWith(LES_PREFIX) ? s.slice(LES_PREFIX.length) : s;
}

function SortableSectionShell({
  id,
  index,
  children,
  dragDisabled,
}: {
  id: string;
  index: number;
  children: React.ReactNode;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableSectionId(id),
    disabled: dragDisabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-xl border border-border/80 bg-card shadow-sm",
        isDragging ? "z-10 opacity-95 ring-2 ring-primary/25" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-2 border-b border-border/60 px-3 py-2">
        <button
          type="button"
          disabled={dragDisabled}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-grab active:cursor-grabbing"
          aria-label={t("Drag to reorder module")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function SortableLessonRow({
  id,
  index,
  title,
  lessonType,
  isPublished,
  open,
  onToggleOpen,
  dragDisabled,
  children,
}: {
  id: string;
  index: number;
  title: string;
  lessonType: string;
  isPublished: boolean;
  open: boolean;
  onToggleOpen: () => void;
  dragDisabled?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableLessonId(id),
    disabled: dragDisabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const typeLabel =
    lessonType === "VIDEO"
      ? t("Video")
      : lessonType === "TEXT"
        ? t("Text")
        : lessonType === "LIVE_CLASS"
          ? t("Live session")
          : lessonType === "PDF"
            ? t("PDF")
            : lessonType;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={["rounded-lg border border-border/60 bg-background", isDragging ? "z-10 shadow-md ring-1 ring-primary/20" : ""].join(" ")}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          disabled={dragDisabled}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-muted/40 text-muted-foreground disabled:opacity-40 cursor-grab active:cursor-grabbing"
          aria-label={t("Drag to reorder lesson")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">{index + 1}</span>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-medium" onClick={onToggleOpen}>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="truncate">{title || t("Untitled lesson")}</span>
          <span className="ml-2 shrink-0 text-xs font-normal text-muted-foreground">· {typeLabel}</span>
          {isPublished ? (
            <span className="ml-2 shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              {t("Live")}
            </span>
          ) : (
            <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t("Draft")}</span>
          )}
        </button>
      </div>
      {open ? <div className="border-t border-border/60 px-3 pb-3 pt-1">{children}</div> : null}
    </div>
  );
}

export function LmsCourseContentBuilder({ courseId }: { courseId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [sections, setSections] = React.useState<ContentSection[]>([]);
  const [canEdit, setCanEdit] = React.useState(true);
  const [expandedLesson, setExpandedLesson] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/content`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        sections?: ContentSection[];
        canEdit?: boolean;
        message?: string;
      };
      if (!res.ok || !json?.ok || !Array.isArray(json.sections)) {
        throw new Error(json?.message ?? "Failed to load content.");
      }
      setSections(json.sections);
      setCanEdit(json.canEdit !== false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onDragEndSections = React.useCallback(
    async (e: DragEndEvent) => {
      if (!canEdit) return;
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const ids = sections.map((s) => s.id);
      const oldIndex = ids.indexOf(parseSortableSectionId(active.id));
      const newIndex = ids.indexOf(parseSortableSectionId(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(sections, oldIndex, newIndex);
      setSections(next);
      const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/sections/reorder`, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sectionIds: next.map((s) => s.id) }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? "Reorder failed.");
        void load();
      }
    },
    [canEdit, courseId, sections, load],
  );

  const onDragEndLessons = React.useCallback(
    (sectionId: string) => async (e: DragEndEvent) => {
      if (!canEdit) return;
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      setSections((prev) => {
        const si = prev.findIndex((s) => s.id === sectionId);
        if (si < 0) return prev;
        const sec = prev[si];
        const ids = sec.lessons.map((l) => l.id);
        const oldIndex = ids.indexOf(parseSortableLessonId(active.id));
        const newIndex = ids.indexOf(parseSortableLessonId(over.id));
        if (oldIndex < 0 || newIndex < 0) return prev;
        const lessons = arrayMove(sec.lessons, oldIndex, newIndex);
        const copy = [...prev];
        copy[si] = { ...sec, lessons };
        void (async () => {
          const res = await fetch(
            `/api/lms/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/lessons/reorder`,
            {
              method: "PUT",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ lessonIds: lessons.map((l) => l.id) }),
            },
          );
          const json = (await res.json()) as { ok?: boolean; message?: string };
          if (!res.ok || !json?.ok) {
            toast.error(json?.message ?? "Reorder failed.");
            void load();
          }
        })();
        return copy;
      });
    },
    [canEdit, courseId, load],
  );

  async function addSection() {
    const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: t("New module"), description: null }),
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json?.ok) {
      toast.error((json as { message?: string }).message ?? "Could not add module.");
      return;
    }
    toast.success(t("Module added."));
    void load();
  }

  async function saveSection(section: ContentSection, title: string, description: string) {
    const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(section.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description: description.trim() || null }),
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json?.ok) {
      toast.error(json?.message ?? "Save failed.");
      return;
    }
    toast.success(t("Module saved."));
    void load();
  }

  async function removeSection(sectionId: string) {
    if (!confirm(t("Delete this module and all its lessons?"))) return;
    const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json?.ok) {
      toast.error(json?.message ?? "Delete failed.");
      return;
    }
    toast.success(t("Module removed."));
    void load();
  }

  async function addLesson(sectionId: string) {
    const res = await fetch(
      `/api/lms/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/lessons`,
      {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: t("New lesson"), lessonType: "TEXT" }),
      },
    );
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json?.ok) {
      toast.error(json?.message ?? "Could not add lesson.");
      return;
    }
    toast.success(t("Lesson added."));
    void load();
  }

  async function removeLesson(lessonId: string) {
    if (!confirm(t("Delete this lesson?"))) return;
    const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json?.ok) {
      toast.error(json?.message ?? "Delete failed.");
      return;
    }
    if (expandedLesson === lessonId) setExpandedLesson(null);
    toast.success(t("Lesson removed."));
    void load();
  }

  async function saveLesson(lesson: ContentLesson, patch: Record<string, unknown>) {
    const res = await fetch(`/api/lms/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lesson.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !json?.ok) {
      toast.error(json?.message ?? "Save failed.");
      return;
    }
    toast.success(t("Lesson saved."));
    void load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("Loading curriculum…")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t("Curriculum")}</CardTitle>
          <CardDescription>
            {t("Modules and lessons, same flow as other builders: drag to reorder, expand a lesson to edit rich text or video.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canEdit ? (
            <p className="text-sm text-muted-foreground">{t("You can view this structure; only course managers can edit.")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button type="button" size="sm" onClick={() => void addSection()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("Add module")}
              </Button>
            ) : null}
          </div>

          {sections.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {t("No modules yet. Add a module to start building lessons.")}
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndSections}>
              <SortableContext items={sections.map((s) => sortableSectionId(s.id))} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {sections.map((section, si) => (
                    <SectionEditor
                      key={section.id}
                      courseId={courseId}
                      section={section}
                      index={si}
                      canEdit={canEdit}
                      allSections={sections}
                      expandedLesson={expandedLesson}
                      setExpandedLesson={setExpandedLesson}
                      onSaveSection={(title, desc) => void saveSection(section, title, desc)}
                      onRemoveSection={() => void removeSection(section.id)}
                      onAddLesson={() => void addLesson(section.id)}
                      onRemoveLesson={removeLesson}
                      onSaveLesson={saveLesson}
                      lessonDragEndFactory={onDragEndLessons}
                      sensors={sensors}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type VideoTab = "youtube" | "vimeo" | "s3" | "file";

function defaultVideoTabFromLesson(lesson: ContentLesson): VideoTab {
  const parsed = parseVideoSettings(lesson.videoMetadata);
  if (parsed.provider === "youtube") return "youtube";
  if (parsed.provider === "vimeo") return "vimeo";
  if (parsed.provider === "s3") return "s3";
  if (parsed.provider === "file") return "file";
  const u = (lesson.videoUrl ?? "").trim();
  if (!u) return "file";
  if (extractYoutubeVideoId(u)) return "youtube";
  if (extractVimeoVideoId(u)) return "vimeo";
  if (u.startsWith("/")) return "file";
  if (inferVideoProvider(u) === "s3") return "s3";
  return "s3";
}

function SectionEditor({
  courseId,
  section,
  index,
  canEdit,
  allSections,
  expandedLesson,
  setExpandedLesson,
  onSaveSection,
  onRemoveSection,
  onAddLesson,
  onRemoveLesson,
  onSaveLesson,
  lessonDragEndFactory,
  sensors,
}: {
  courseId: string;
  section: ContentSection;
  index: number;
  canEdit: boolean;
  allSections: ContentSection[];
  expandedLesson: string | null;
  setExpandedLesson: React.Dispatch<React.SetStateAction<string | null>>;
  onSaveSection: (title: string, description: string) => void;
  onRemoveSection: () => void;
  onAddLesson: () => void;
  onRemoveLesson: (id: string) => void;
  onSaveLesson: (lesson: ContentLesson, patch: Record<string, unknown>) => Promise<void>;
  lessonDragEndFactory: (sectionId: string) => (e: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const [title, setTitle] = React.useState(section.title);
  const [description, setDescription] = React.useState(section.description ?? "");
  React.useEffect(() => {
    setTitle(section.title);
    setDescription(section.description ?? "");
  }, [section.title, section.description, section.id]);

  return (
    <SortableSectionShell id={section.id} index={index} dragDisabled={!canEdit}>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Label className="text-xs text-muted-foreground">{t("Module title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
            <Label className="text-xs text-muted-foreground">{t("Module description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={!canEdit} />
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {canEdit ? (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={() => onSaveSection(title, description)}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  {t("Save module")}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={onRemoveSection}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {t("Delete module")}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">{t("Lessons")}</span>
            {canEdit ? (
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onAddLesson}>
                <Plus className="mr-1 h-3 w-3" />
                {t("Add lesson")}
              </Button>
            ) : null}
          </div>
          {section.lessons.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">{t("No lessons in this module.")}</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={lessonDragEndFactory(section.id)}>
              <SortableContext items={section.lessons.map((l) => sortableLessonId(l.id))} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {section.lessons.map((lesson, li) => (
                    <li key={lesson.id}>
                      <SortableLessonRow
                        id={lesson.id}
                        index={li}
                        title={lesson.title}
                        lessonType={lesson.lessonType}
                        isPublished={lesson.isPublished}
                        open={expandedLesson === lesson.id}
                        onToggleOpen={() => setExpandedLesson((x) => (x === lesson.id ? null : lesson.id))}
                        dragDisabled={!canEdit}
                      >
                        <LessonEditorForm
                          key={lesson.id}
                          courseId={courseId}
                          lesson={lesson}
                          allSections={allSections}
                          canEdit={canEdit}
                          onSave={async (patch) => {
                            await onSaveLesson(lesson, patch);
                          }}
                          onRemove={() => {
                            void onRemoveLesson(lesson.id);
                          }}
                        />
                      </SortableLessonRow>
                    </li>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </SortableSectionShell>
  );
}

function LessonEditorForm({
  courseId,
  lesson,
  allSections,
  canEdit,
  onSave,
  onRemove,
}: {
  courseId: string;
  lesson: ContentLesson;
  allSections: ContentSection[];
  canEdit: boolean;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onRemove: () => void;
}) {
  const [title, setTitle] = React.useState(lesson.title);
  const [lessonType, setLessonType] = React.useState(lesson.lessonType);
  const [bodyText, setBodyText] = React.useState(lesson.bodyText ?? "");
  const [videoUrl, setVideoUrl] = React.useState(lesson.videoUrl ?? "");
  const [videoTab, setVideoTab] = React.useState<VideoTab>(() => defaultVideoTabFromLesson(lesson));
  const [videoMeta, setVideoMeta] = React.useState<LmsLessonVideoSettings>(() => {
    const p = parseVideoSettings(lesson.videoMetadata);
    return {
      privacyEnhanced: p.privacyEnhanced !== false,
      vimeoDnt: p.vimeoDnt !== false,
      showControls: p.showControls !== false,
      autoplay: p.autoplay === true,
      startSeconds: p.startSeconds,
      captionsUrl: p.captionsUrl,
    };
  });
  const [externalLiveUrl, setExternalLiveUrl] = React.useState(lesson.externalLiveUrl ?? "");
  const [liveStartsAt, setLiveStartsAt] = React.useState(toDatetimeLocalValue(lesson.liveStartsAt));
  const [liveEndsAt, setLiveEndsAt] = React.useState(toDatetimeLocalValue(lesson.liveEndsAt));
  const [durationSeconds, setDurationSeconds] = React.useState(lesson.durationSeconds != null ? String(lesson.durationSeconds) : "");
  const [isPublished, setIsPublished] = React.useState(lesson.isPublished);
  const [targetSectionId, setTargetSectionId] = React.useState(lesson.id ? allSections.find((s) => s.lessons.some((l) => l.id === lesson.id))?.id ?? "" : "");

  React.useEffect(() => {
    setTitle(lesson.title);
    setLessonType(lesson.lessonType);
    setBodyText(lesson.bodyText ?? "");
    setVideoUrl(lesson.videoUrl ?? "");
    setVideoTab(defaultVideoTabFromLesson(lesson));
    const p = parseVideoSettings(lesson.videoMetadata);
    setVideoMeta({
      privacyEnhanced: p.privacyEnhanced !== false,
      vimeoDnt: p.vimeoDnt !== false,
      showControls: p.showControls !== false,
      autoplay: p.autoplay === true,
      startSeconds: p.startSeconds,
      captionsUrl: p.captionsUrl,
    });
    setExternalLiveUrl(lesson.externalLiveUrl ?? "");
    setLiveStartsAt(toDatetimeLocalValue(lesson.liveStartsAt));
    setLiveEndsAt(toDatetimeLocalValue(lesson.liveEndsAt));
    setDurationSeconds(lesson.durationSeconds != null ? String(lesson.durationSeconds) : "");
    setIsPublished(lesson.isPublished);
    const sid = allSections.find((s) => s.lessons.some((l) => l.id === lesson.id))?.id ?? "";
    setTargetSectionId(sid);
  }, [lesson, allSections]);

  const currentSectionId = allSections.find((s) => s.lessons.some((l) => l.id === lesson.id))?.id ?? "";

  return (
    <div className="space-y-3 pt-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("Lesson title")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("Type")}</Label>
          <Select value={lessonType} onValueChange={setLessonType} disabled={!canEdit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIDEO">{t("Video")}</SelectItem>
              <SelectItem value="TEXT">{t("Text")}</SelectItem>
              <SelectItem value="LIVE_CLASS">{t("Live session")}</SelectItem>
              <SelectItem value="PDF">{t("PDF document")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
        <span className="text-sm">{t("Published to students")}</span>
        <Switch checked={isPublished} onCheckedChange={setIsPublished} disabled={!canEdit} />
      </div>

      {lessonType === "TEXT" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("Content")}</Label>
          <div className="rounded-md border border-input bg-background">
            <RichTextEditor content={bodyText} onChange={setBodyText} disabled={!canEdit} />
          </div>
        </div>
      ) : null}

      {lessonType === "VIDEO" ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t("Video source")}</Label>
            <RadioGroup
              className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
              value={videoTab}
              onValueChange={(v) => setVideoTab(v as VideoTab)}
              disabled={!canEdit}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="youtube" id={`vt-yt-${lesson.id}`} />
                <Label htmlFor={`vt-yt-${lesson.id}`} className="cursor-pointer text-sm font-normal">
                  YouTube
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="vimeo" id={`vt-vm-${lesson.id}`} />
                <Label htmlFor={`vt-vm-${lesson.id}`} className="cursor-pointer text-sm font-normal">
                  Vimeo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="s3" id={`vt-s3-${lesson.id}`} />
                <Label htmlFor={`vt-s3-${lesson.id}`} className="cursor-pointer text-sm font-normal">
                  S3 / HTTPS URL
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="file" id={`vt-fl-${lesson.id}`} />
                <Label htmlFor={`vt-fl-${lesson.id}`} className="cursor-pointer text-sm font-normal">
                  {t("Media library")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {videoTab === "file" ? (
            <MediaPicker label={t("Video file")} value={videoUrl} onChange={(v) => setVideoUrl(typeof v === "string" ? v : v[0] ?? "")} disabled={!canEdit} />
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {videoTab === "youtube"
                  ? t("YouTube link or video ID")
                  : videoTab === "vimeo"
                    ? t("Vimeo link or numeric video ID")
                    : t("S3, Wasabi, or HTTPS URL to MP4/WebM")}
              </Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={!canEdit}
                placeholder={
                  videoTab === "youtube"
                    ? "https://www.youtube.com/watch?v=…"
                    : videoTab === "vimeo"
                      ? "https://vimeo.com/…"
                      : "https://bucket.s3.region.amazonaws.com/…/video.mp4"
                }
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Start time (seconds)")}</Label>
              <Input
                type="number"
                min={0}
                value={videoMeta.startSeconds != null ? String(videoMeta.startSeconds) : ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setVideoMeta((m) => ({
                    ...m,
                    startSeconds: v === "" ? undefined : Math.max(0, Math.floor(Number.parseInt(v, 10) || 0)),
                  }));
                }}
                disabled={!canEdit}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Duration (seconds, optional)")}</Label>
              <Input
                type="number"
                min={0}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 600"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {videoTab === "youtube" ? (
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm">
                <span>{t("Privacy-enhanced embed (nocookie)")}</span>
                <Switch
                  checked={videoMeta.privacyEnhanced !== false}
                  onCheckedChange={(on) => setVideoMeta((m) => ({ ...m, privacyEnhanced: on }))}
                  disabled={!canEdit}
                />
              </label>
            ) : null}
            {videoTab === "vimeo" ? (
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm">
                <span>{t("Do not track (dnt=1)")}</span>
                <Switch
                  checked={videoMeta.vimeoDnt !== false}
                  onCheckedChange={(on) => setVideoMeta((m) => ({ ...m, vimeoDnt: on }))}
                  disabled={!canEdit}
                />
              </label>
            ) : null}
            <label className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm">
              <span>{t("Show player controls")}</span>
              <Switch
                checked={videoMeta.showControls !== false}
                onCheckedChange={(on) => setVideoMeta((m) => ({ ...m, showControls: on }))}
                disabled={!canEdit}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm">
              <span>{t("Autoplay (muted)")}</span>
              <Switch
                checked={videoMeta.autoplay === true}
                onCheckedChange={(on) => setVideoMeta((m) => ({ ...m, autoplay: on }))}
                disabled={!canEdit}
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("Captions track URL (VTT, optional)")}</Label>
            <Input
              value={videoMeta.captionsUrl ?? ""}
              onChange={(e) => setVideoMeta((m) => ({ ...m, captionsUrl: e.target.value.trim() || undefined }))}
              disabled={!canEdit}
              placeholder="https://…/captions.vtt"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {t("Learner playback requires active enrollment, access dates, a paid order when the seat was sold via storefront, and a capacity seat. Public courses still require enrollment for lesson video. S3 URLs are short-lived when the bucket matches Settings → Storage.")}
          </p>

          {videoUrl.trim() && (isPublished || canEdit) ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("Preview")}</Label>
              <LmsLessonVideoPlayer courseId={courseId} lessonId={lesson.id} title={title} />
            </div>
          ) : null}
        </div>
      ) : null}

      {lessonType === "PDF" ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("PDF URL")}</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={!canEdit}
              placeholder="https://…/lesson.pdf"
            />
          </div>
          <MediaPicker
            label={t("Or pick from media library")}
            value={videoUrl}
            onChange={(v) => setVideoUrl(typeof v === "string" ? v : (v[0] ?? ""))}
            disabled={!canEdit}
            placeholder={t("Select PDF…")}
            acceptExtensions={["pdf"]}
          />
          <p className="text-xs text-muted-foreground">
            {t("Learners view the PDF in an embedded viewer. Use a direct HTTPS link to a .pdf file.")}
          </p>
        </div>
      ) : null}

      {lessonType === "LIVE_CLASS" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("Meeting or stream URL")}</Label>
            <Input value={externalLiveUrl} onChange={(e) => setExternalLiveUrl(e.target.value)} disabled={!canEdit} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Session starts")}</Label>
            <Input type="datetime-local" value={liveStartsAt} onChange={(e) => setLiveStartsAt(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Session ends")}</Label>
            <Input type="datetime-local" value={liveEndsAt} onChange={(e) => setLiveEndsAt(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
      ) : null}

      {canEdit && allSections.length > 1 ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground">
              {t("Move to another module")}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const provider: LmsLessonVideoSettings["provider"] =
                videoTab === "youtube" ? "youtube" : videoTab === "vimeo" ? "vimeo" : videoTab === "s3" ? "s3" : "file";
              const meta: Record<string, unknown> | null =
                lessonType === "VIDEO"
                  ? {
                      provider,
                      privacyEnhanced: videoMeta.privacyEnhanced,
                      vimeoDnt: videoMeta.vimeoDnt,
                      showControls: videoMeta.showControls,
                      autoplay: videoMeta.autoplay === true,
                      ...(videoMeta.startSeconds != null && videoMeta.startSeconds > 0 ? { startSeconds: videoMeta.startSeconds } : {}),
                      ...(videoMeta.captionsUrl?.trim()
                        ? { captionsUrl: videoMeta.captionsUrl.trim().slice(0, 2048) }
                        : {}),
                    }
                  : null;

              void onSave({
                title: title.trim(),
                lessonType,
                bodyText: lessonType === "TEXT" ? bodyText : null,
                ...(lessonType === "VIDEO"
                  ? {
                      videoUrl: videoUrl.trim() || null,
                      videoMetadata: meta,
                      durationSeconds:
                        durationSeconds.trim() !== "" ? Math.max(0, Math.floor(Number.parseInt(durationSeconds, 10) || 0)) : null,
                    }
                  : lessonType === "PDF"
                    ? { videoUrl: videoUrl.trim() || null, videoMetadata: null, durationSeconds: null }
                    : { videoUrl: null, videoMetadata: null, durationSeconds: null }),
                externalLiveUrl: lessonType === "LIVE_CLASS" ? externalLiveUrl.trim() || null : null,
                liveStartsAt: lessonType === "LIVE_CLASS" ? fromDatetimeLocalValue(liveStartsAt) : null,
                liveEndsAt: lessonType === "LIVE_CLASS" ? fromDatetimeLocalValue(liveEndsAt) : null,
                isPublished,
                ...(targetSectionId && targetSectionId !== currentSectionId ? { targetSectionId } : {}),
              });
            }}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {t("Save lesson")}
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={onRemove}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {t("Delete lesson")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
