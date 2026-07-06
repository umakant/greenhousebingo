"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

export type DistributionSlice = {
  name: string;
  value: number;
  isPrimaryBrandHolder?: boolean;
};

type Props = {
  data: DistributionSlice[];
  size?: number;
};

export function OwnershipDonutChart({ data, size = 180 }: Props) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((s, d) => s + d.value, 0);
  const outerRadius = Math.floor(size * 0.38);
  const innerRadius = Math.floor(size * 0.26);

  if (total === 0) {
    return (
      <div
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        className="flex shrink-0 items-center justify-center"
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={size * 0.14}
          />
        </svg>
      </div>
    );
  }

  const chartData = slices.map((d, i) => ({
    ...d,
    color: COLORS[i % COLORS.length],
  }));

  // Single full ring — render with SVG to avoid Recharts clipping in tight flex layouts.
  if (chartData.length === 1) {
    const color = chartData[0].color;
    const stroke = Math.max(outerRadius - innerRadius, 8);
    const radius = (outerRadius + innerRadius) / 2;
    return (
      <div
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        className="relative shrink-0"
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total}%</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className="relative shrink-0"
    >
      <ResponsiveContainer width={size} height={size}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            paddingAngle={chartData.length > 1 ? 2 : 0}
            stroke="none"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`${Number(v ?? 0)}%`, "Ownership"]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{total}%</span>
        <span className="text-xs text-muted-foreground">Total</span>
      </div>
    </div>
  );
}

export function OwnershipDistributionLegend({ data }: { data: DistributionSlice[] }) {
  const slices = data.filter((d) => d.value > 0);
  return (
    <ul className="space-y-2">
      {slices.map((d, i) => (
        <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="truncate">{d.name}</span>
            {d.isPrimaryBrandHolder ? (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Primary
              </span>
            ) : null}
          </span>
          <span className="font-medium tabular-nums">{d.value}%</span>
        </li>
      ))}
    </ul>
  );
}
