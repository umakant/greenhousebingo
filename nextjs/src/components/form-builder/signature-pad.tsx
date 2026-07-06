"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PEN = "#0f172a";
const BG = "#ffffff";

function point(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

export function SignaturePad({
  value,
  onChange,
  disabled,
  className,
  clearLabel = "Clear signature",
  clearButtonClassName,
  clearButtonVariant = "outline",
  hideClearButton = false,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  className?: string;
  clearLabel?: string;
  clearButtonClassName?: string;
  clearButtonVariant?: "outline" | "ghost";
  /** Hide built-in clear control (e.g. when using custom footer links) */
  hideClearButton?: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const hasInk = React.useRef(false);
  const skipValueEffect = React.useRef(false);

  const setupContext = React.useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return null;
    const w = Math.max(200, wrap.clientWidth);
    const h = 160;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = PEN;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return { ctx, w, h };
  }, []);

  const drawDataUrl = React.useCallback(
    (dataUrl: string) => {
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const s = setupContext();
        if (!s) return;
        const { w, h, ctx } = s;
        ctx.drawImage(img, 0, 0, w, h);
        hasInk.current = true;
      };
      img.src = dataUrl;
    },
    [setupContext],
  );

  // Apply external `value` (initial / clear / programmatic)
  React.useEffect(() => {
    if (skipValueEffect.current) {
      skipValueEffect.current = false;
      return;
    }
    const s = setupContext();
    if (!s) return;
    if (value) drawDataUrl(value);
    else hasInk.current = false;
  }, [value, setupContext, drawDataUrl]);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      if (skipValueEffect.current) return;
      const s = setupContext();
      if (!s) return;
      if (value) drawDataUrl(value);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [value, setupContext, drawDataUrl]);

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    skipValueEffect.current = true;
    if (!hasInk.current) {
      onChange("");
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e, e.currentTarget);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const canvas = e.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = point(e, canvas);
    const prev = last.current;
    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      hasInk.current = true;
    }
    last.current = p;
  }

  function endStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    emit();
  }

  function clear() {
    hasInk.current = false;
    setupContext();
    skipValueEffect.current = true;
    onChange("");
  }

  return (
    <div ref={wrapRef} className={cn("space-y-2", className)}>
      <div
        className={cn(
          "rounded-md border border-input bg-background overflow-hidden touch-none",
          disabled && "opacity-60 pointer-events-none",
        )}
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair bg-white"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={(e) => {
            if (drawing.current) endStroke(e);
          }}
        />
      </div>
      {!hideClearButton && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant={clearButtonVariant}
            size="sm"
            className={clearButtonClassName}
            onClick={clear}
            disabled={disabled}
          >
            {clearLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/** True when the stored value is a drawn signature (PNG data URL from the canvas). */
export function isSignatureValueComplete(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("data:image") && value.length > 80;
}
