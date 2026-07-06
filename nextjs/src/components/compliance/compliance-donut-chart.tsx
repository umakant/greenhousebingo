"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export type DonutSlice = { name: string; value: number; color: string };

export const COMPLIANCE_DONUT_COLORS = {
  green: "#22c55e",
  blue: "#3b82f6",
  amber: "#f59e0b",
  red: "#ef4444",
  gray: "#94a3b8",
  track: "#e5e7eb",
  violet: "#8b5cf6",
  orange: "#f97316",
};

export function scoreDonutSlices(percent: number, scoreColor?: string): DonutSlice[] {
  const score = Math.max(0, Math.min(100, percent));
  return [
    { name: "Score", value: score, color: scoreColor ?? COMPLIANCE_DONUT_COLORS.green },
    { name: "Gap", value: Math.max(0, 100 - score), color: COMPLIANCE_DONUT_COLORS.track },
  ];
}

export function DonutWithLegend({
  data,
  centerLabel,
  size = 120,
  hideLegend = false,
}: {
  data: DonutSlice[];
  centerLabel?: string;
  size?: number;
  hideLegend?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={size * 0.32}
                outerRadius={size * 0.44}
                dataKey="value"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full border-8 border-muted" />
        )}
        {centerLabel ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[0.625rem] font-bold tabular-nums leading-none">{centerLabel}</span>
          </div>
        ) : null}
      </div>
      {!hideLegend ? (
        <div className="w-full space-y-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
              <span className="font-semibold tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
