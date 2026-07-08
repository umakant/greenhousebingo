"use client";

import { cn } from "@/lib/utils";

const LEGEND = [
  { label: "VIP", color: "#3b82f6" },
  { label: "Floor", color: "#22c55e" },
  { label: "Lower Tier", color: "#84cc16" },
  { label: "Upper Tier", color: "#f59e0b" },
  { label: "Unavailable", color: "#d1d5db" },
];

function ArenaSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 260" className={cn("w-full", className)} aria-hidden>
      <rect x="95" y="8" width="130" height="28" rx="4" fill="#111827" />
      <text x="160" y="27" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">
        STAGE
      </text>
      <path d="M40 50 Q160 70 280 50 L300 220 Q160 250 20 220 Z" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
      <path d="M55 65 Q160 82 265 65 L280 205 Q160 228 40 205 Z" fill="#bbf7d0" stroke="#86efac" strokeWidth="1" />
      <path d="M70 82 Q160 96 250 82 L262 188 Q160 208 58 188 Z" fill="#fef08a" stroke="#fde047" strokeWidth="1" />
      <path d="M88 100 Q160 110 232 100 L240 168 Q160 182 80 168 Z" fill="#fed7aa" stroke="#fdba74" strokeWidth="1" />
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 118 + i * 7;
        return (
          <g key={i}>
            {Array.from({ length: 14 - Math.floor(i / 2) }).map((__, j) => {
              const x = 95 + j * 10 + i * 2;
              return <circle key={j} cx={x} cy={y} r="2.2" fill={i < 2 ? "#3b82f6" : i < 4 ? "#22c55e" : "#f59e0b"} opacity="0.85" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function TheaterSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 260" className={cn("w-full", className)} aria-hidden>
      <rect x="60" y="12" width="200" height="24" rx="4" fill="#111827" />
      <text x="160" y="28" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
        STAGE
      </text>
      {Array.from({ length: 10 }).map((_, row) =>
        Array.from({ length: 12 - Math.floor(row / 3) }).map((__, col) => (
          <rect
            key={`${row}-${col}`}
            x={70 + col * 18 + row * 2}
            y={50 + row * 18}
            width="12"
            height="12"
            rx="2"
            fill={row < 3 ? "#3b82f6" : row < 6 ? "#22c55e" : "#f59e0b"}
            opacity="0.8"
          />
        )),
      )}
    </svg>
  );
}

function GeneralSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 260" className={cn("w-full", className)} aria-hidden>
      <rect x="24" y="24" width="272" height="212" rx="8" fill="#f3f4f6" stroke="#e5e7eb" />
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 10 }).map((__, col) => (
          <rect
            key={`${row}-${col}`}
            x={36 + col * 26}
            y={40 + row * 24}
            width="18"
            height="16"
            rx="3"
            fill={row < 2 ? "#3b82f6" : "#22c55e"}
            opacity="0.75"
          />
        )),
      )}
    </svg>
  );
}

export function SeatmapPreviewVisual({
  variant = "arena",
  compact,
}: {
  variant?: "arena" | "theater" | "general";
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className={cn("rounded-lg border bg-muted/30 p-2", compact ? "p-1" : "p-3")}>
        {variant === "theater" ? <TheaterSvg /> : variant === "general" ? <GeneralSvg /> : <ArenaSvg />}
      </div>
      {!compact ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
