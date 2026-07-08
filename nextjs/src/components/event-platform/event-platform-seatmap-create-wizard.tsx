"use client";

import * as React from "react";
import {
  ArrowRight,
  Circle,
  Loader2,
  Monitor,
  PenLine,
  Plus,
  Square,
  Trash2,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CANVAS,
  DEFAULT_SEATMAP_TIERS,
  SEATMAP_CATEGORIES,
  SEATMAP_LAYOUT_SHAPES,
  SEATMAP_MAP_TYPES,
} from "@/lib/event-platform/seatmaps/seatmap-create-constants";
import type { SeatmapCanvas, SeatmapLayout, SeatmapTier } from "@/lib/event-platform/seatmaps/seatmap-schemas";
import { cn } from "@/lib/utils";

const STEPS = ["Basic Info", "Layout", "Sections & Pricing", "Review"] as const;
type StepId = (typeof STEPS)[number];

export type SeatmapCreateWizardValues = {
  name: string;
  category: string;
  mapType: string;
  description: string;
  canvas: SeatmapCanvas;
  tiers: Array<{ id: string; name: string; price: number; color: string }>;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultSeatmapCreateValues(): SeatmapCreateWizardValues {
  return {
    name: "",
    category: "",
    mapType: "",
    description: "",
    canvas: { ...DEFAULT_CANVAS },
    tiers: DEFAULT_SEATMAP_TIERS.map((t) => ({
      id: uid("tier"),
      name: t.name,
      price: t.price,
      color: t.color,
    })),
  };
}

export function buildLayoutFromCreateValues(values: SeatmapCreateWizardValues): SeatmapLayout {
  const tiers: SeatmapTier[] = values.tiers
    .filter((t) => t.name.trim())
    .map((t) => ({
      id: t.id,
      name: t.name.trim(),
      price: t.price,
      color: t.color,
    }));

  return {
    sections: [],
    tiers,
    meta: {
      category: values.category,
      mapType: values.mapType,
      canvas: values.canvas,
    },
  };
}

function shapeIcon(shape: SeatmapCanvas["shape"]) {
  switch (shape) {
    case "rectangle":
      return Square;
    case "fan_arena":
      return Waves;
    case "semi_circle":
      return Circle;
    default:
      return PenLine;
  }
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-2 border-b pb-4">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            i === current
              ? "bg-primary text-primary-foreground"
              : i < current
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          <span className="tabular-nums">{i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function CanvasPreview({ canvas }: { canvas: SeatmapCanvas }) {
  const landscape = canvas.orientation === "horizontal";
  const aspect = landscape
    ? `${canvas.width} / ${canvas.height}`
    : `${canvas.height} / ${canvas.width}`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
      <div
        className={cn(
          "relative flex w-full max-w-[220px] items-center justify-center border-2 border-dashed border-primary/40 bg-background",
          canvas.shape === "semi_circle" && "rounded-t-full",
          canvas.shape === "fan_arena" && "rounded-t-[40%]",
        )}
        style={{ aspectRatio: aspect, maxHeight: landscape ? 140 : 200 }}
      >
        {canvas.defaultStagePosition ? (
          <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-foreground px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
            Stage
          </div>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {canvas.width} × {canvas.height}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Monitor className="h-4 w-4" />
        {landscape ? "Horizontal (Landscape)" : "Vertical (Portrait)"}
      </div>
    </div>
  );
}

function BasicInfoStep({
  values,
  onPatch,
}: {
  values: SeatmapCreateWizardValues;
  onPatch: (patch: Partial<SeatmapCreateWizardValues>) => void;
}) {
  const descLen = values.description.length;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Basic Information</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sm-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sm-name"
              placeholder="e.g., Main Arena"
              value={values.name}
              onChange={(e) => onPatch({ name: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={values.category || undefined} onValueChange={(v) => onPatch({ category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SEATMAP_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={values.mapType || undefined} onValueChange={(v) => onPatch({ mapType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SEATMAP_MAP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sm-desc">Description</Label>
            <Textarea
              id="sm-desc"
              placeholder="Enter a short description (optional)"
              value={values.description}
              maxLength={250}
              rows={3}
              onChange={(e) => onPatch({ description: e.target.value })}
            />
            <p className="text-right text-xs text-muted-foreground">{descLen}/250</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Canvas Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Layout Shape</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEATMAP_LAYOUT_SHAPES.map((shape) => {
                const Icon = shapeIcon(shape.id);
                const selected = values.canvas.shape === shape.id;
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => onPatch({ canvas: { ...values.canvas, shape: shape.id } })}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-3 text-center text-xs transition-colors",
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="font-medium">{shape.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Canvas Size</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sm-width" className="text-xs text-muted-foreground">
                  Width (px) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sm-width"
                  type="number"
                  min={800}
                  max={2000}
                  value={values.canvas.width}
                  onChange={(e) =>
                    onPatch({
                      canvas: { ...values.canvas, width: Number(e.target.value) || DEFAULT_CANVAS.width },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-height" className="text-xs text-muted-foreground">
                  Height (px) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sm-height"
                  type="number"
                  min={800}
                  max={2000}
                  value={values.canvas.height}
                  onChange={(e) =>
                    onPatch({
                      canvas: { ...values.canvas, height: Number(e.target.value) || DEFAULT_CANVAS.height },
                    })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Recommended: 800px – 2000px</p>
          </div>

          <div className="space-y-2">
            <Label>Orientation</Label>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="orientation"
                    className="accent-primary"
                    checked={values.canvas.orientation === "horizontal"}
                    onChange={() => onPatch({ canvas: { ...values.canvas, orientation: "horizontal" } })}
                  />
                  <span className="text-sm">Horizontal (Landscape)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="orientation"
                    className="accent-primary"
                    checked={values.canvas.orientation === "vertical"}
                    onChange={() => onPatch({ canvas: { ...values.canvas, orientation: "vertical" } })}
                  />
                  <span className="text-sm">Vertical (Portrait)</span>
                </label>
              </div>
              <CanvasPreview canvas={values.canvas} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Options</h3>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={values.canvas.defaultStagePosition}
              onCheckedChange={(checked) =>
                onPatch({ canvas: { ...values.canvas, defaultStagePosition: checked === true } })
              }
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium leading-none">Set a default stage position</p>
              <p className="text-xs text-muted-foreground">
                You can change the stage position later while editing the map.
              </p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={values.canvas.rowSeatLabels}
              onCheckedChange={(checked) =>
                onPatch({ canvas: { ...values.canvas, rowSeatLabels: checked === true } })
              }
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium leading-none">Enable row and seat labels</p>
              <p className="text-xs text-muted-foreground">
                Display row letters and seat numbers on the seat map.
              </p>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}

function LayoutStep({ values }: { values: SeatmapCreateWizardValues }) {
  const shapeLabel = SEATMAP_LAYOUT_SHAPES.find((s) => s.id === values.canvas.shape)?.label ?? values.canvas.shape;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your canvas layout. After creating the template you can place sections and seats in the visual editor.
      </p>
      <div className="rounded-lg border bg-muted/20 p-6">
        <CanvasPreview canvas={values.canvas} />
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Shape</dt>
          <dd className="font-medium">{shapeLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dimensions</dt>
          <dd className="font-medium">
            {values.canvas.width} × {values.canvas.height} px
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Orientation</dt>
          <dd className="font-medium capitalize">{values.canvas.orientation}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Stage</dt>
          <dd className="font-medium">{values.canvas.defaultStagePosition ? "Default position" : "None"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Labels</dt>
          <dd className="font-medium">{values.canvas.rowSeatLabels ? "Row & seat labels" : "Disabled"}</dd>
        </div>
      </dl>
    </div>
  );
}

function SectionsPricingStep({
  values,
  onPatch,
}: {
  values: SeatmapCreateWizardValues;
  onPatch: (patch: Partial<SeatmapCreateWizardValues>) => void;
}) {
  function updateTier(id: string, patch: Partial<SeatmapCreateWizardValues["tiers"][number]>) {
    onPatch({
      tiers: values.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }

  function addTier() {
    onPatch({
      tiers: [...values.tiers, { id: uid("tier"), name: "", price: 0, color: "#94a3b8" }],
    });
  }

  function removeTier(id: string) {
    onPatch({ tiers: values.tiers.filter((t) => t.id !== id) });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Define pricing tiers for your sections. You can assign seats to tiers when editing the map layout.
      </p>
      <div className="space-y-3">
        {values.tiers.map((tier) => (
          <div key={tier.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_6rem_3rem_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Tier name</Label>
              <Input value={tier.name} onChange={(e) => updateTier(tier.id, { name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={tier.price}
                onChange={(e) => updateTier(tier.id, { price: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <Input
                type="color"
                className="h-9 w-full cursor-pointer p-1"
                value={tier.color}
                onChange={(e) => updateTier(tier.id, { color: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeTier(tier.id)}
              disabled={values.tiers.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addTier}>
        <Plus className="mr-2 h-4 w-4" />
        Add tier
      </Button>
    </div>
  );
}

function ReviewStep({ values }: { values: SeatmapCreateWizardValues }) {
  const shapeLabel = SEATMAP_LAYOUT_SHAPES.find((s) => s.id === values.canvas.shape)?.label ?? values.canvas.shape;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Confirm your seat map template details before creating.</p>
      <div className="space-y-4 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Basic Information</h4>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{values.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium">{values.category || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium">{values.mapType || "—"}</dd>
          </div>
          {values.description ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd>{values.description}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="space-y-4 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Canvas</h4>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Shape</dt>
            <dd className="font-medium">{shapeLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-medium">
              {values.canvas.width} × {values.canvas.height} px
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Orientation</dt>
            <dd className="font-medium capitalize">{values.canvas.orientation}</dd>
          </div>
        </dl>
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Pricing tiers ({values.tiers.filter((t) => t.name.trim()).length})</h4>
        <ul className="space-y-2 text-sm">
          {values.tiers
            .filter((t) => t.name.trim())
            .map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </span>
                <span className="tabular-nums font-medium">${t.price.toFixed(2)}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export function EventPlatformSeatmapCreateWizard({
  onSubmit,
  onCancel,
  onSavingChange,
}: {
  onSubmit: (values: SeatmapCreateWizardValues) => Promise<void>;
  onCancel?: () => void;
  onSavingChange?: (saving: boolean) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [values, setValues] = React.useState<SeatmapCreateWizardValues>(defaultSeatmapCreateValues);
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  function patch(partial: Partial<SeatmapCreateWizardValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!values.name.trim()) return "Name is required.";
      if (!values.category) return "Select a category.";
      if (!values.mapType) return "Select a type.";
      const { width, height } = values.canvas;
      if (width < 800 || width > 2000 || height < 800 || height > 2000) {
        return "Canvas size must be between 800px and 2000px.";
      }
    }
    if (index === 2) {
      const named = values.tiers.filter((t) => t.name.trim());
      if (named.length === 0) return "Add at least one pricing tier.";
    }
    return null;
  }

  async function handleNext() {
    const validation = validateStep(step);
    if (validation) {
      setErr(validation);
      return;
    }
    setErr(null);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create seat map.");
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setErr(null);
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="space-y-6">
      <StepIndicator current={step} />

      {step === 0 ? <BasicInfoStep values={values} onPatch={patch} /> : null}
      {step === 1 ? <LayoutStep values={values} /> : null}
      {step === 2 ? <SectionsPricingStep values={values} onPatch={patch} /> : null}
      {step === 3 ? <ReviewStep values={values} /> : null}

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={step === 0 ? onCancel : handleBack}
          disabled={saving || (step === 0 && !onCancel)}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        <Button type="button" onClick={() => void handleNext()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {step === STEPS.length - 1 ? (
            "Create seat map"
          ) : (
            <>
              Next: {STEPS[step + 1] as StepId}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
