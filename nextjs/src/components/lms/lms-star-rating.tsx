"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function LmsStarRatingDisplay({
  rating,
  max = 5,
  size = "sm",
  className,
}: {
  rating: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const icon = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= Math.floor(rounded);
        const half = !filled && i + 0.5 <= rounded;
        return (
          <Star
            key={i}
            className={cn(icon, filled || half ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
          />
        );
      })}
    </span>
  );
}

export function LmsStarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  const display = hover || value;
  return (
    <span className="inline-flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          className="rounded p-0.5 transition hover:scale-110 disabled:opacity-50"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} stars`}
        >
          <Star
            className={cn(
              "h-6 w-6",
              n <= display ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </span>
  );
}
