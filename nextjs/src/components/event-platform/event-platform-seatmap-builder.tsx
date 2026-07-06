"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SeatmapLayout } from "@/lib/event-platform/seatmaps/seatmap-schemas";
import { EMPTY_SEATMAP_LAYOUT } from "@/lib/event-platform/seatmaps/seatmap-schemas";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EventPlatformSeatmapBuilder({ seatmapId }: { seatmapId: string }) {
  const [name, setName] = React.useState("");
  const [layout, setLayout] = React.useState<SeatmapLayout>(EMPTY_SEATMAP_LAYOUT);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/event-platform/seatmaps/${seatmapId}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        item?: { name: string; layout: SeatmapLayout };
      } | null;
      if (res.ok && data?.ok && data.item) {
        setName(data.item.name);
        setLayout(data.item.layout ?? EMPTY_SEATMAP_LAYOUT);
      }
      setLoading(false);
    })();
  }, [seatmapId]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/event-platform/seatmaps/${seatmapId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, layout, status: "active" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Seat map saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function addSection() {
    setLayout({
      ...layout,
      sections: [
        ...layout.sections,
        { id: uid("sec"), label: `Section ${layout.sections.length + 1}`, rows: [] },
      ],
    });
  }

  function addRow(sectionId: string, seatCount: number) {
    setLayout({
      ...layout,
      sections: layout.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const rowLabel = String.fromCharCode(65 + sec.rows.length);
        const seats = Array.from({ length: seatCount }, (_, i) => ({
          id: uid("seat"),
          label: `${rowLabel}${i + 1}`,
          status: "available" as const,
        }));
        return {
          ...sec,
          rows: [...sec.rows, { id: uid("row"), label: rowLabel, seats }],
        };
      }),
    });
  }

  function removeSection(sectionId: string) {
    setLayout({
      ...layout,
      sections: layout.sections.filter((s) => s.id !== sectionId),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/event-platform/seatmaps">← Back</Link>
        </Button>
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save seat map
        </Button>
      </div>
      <div className="max-w-md space-y-1.5">
        <Label>Template name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={addSection}>
          <Plus className="mr-2 h-4 w-4" />
          Add section
        </Button>
      </div>
      {layout.sections.map((sec) => (
        <Card key={sec.id} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">{sec.label}</CardTitle>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(sec.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" size="sm" variant="outline" onClick={() => addRow(sec.id, 8)}>
              Add row (8 seats)
            </Button>
            <div className="space-y-2">
              {sec.rows.map((row) => (
                <div key={row.id}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Row {row.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {row.seats.map((seat) => (
                      <span
                        key={seat.id}
                        className="inline-flex h-7 min-w-7 items-center justify-center rounded border bg-muted/40 px-1 text-[10px]"
                        title={seat.label}
                      >
                        {seat.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {layout.sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a section to start building your seat map.</p>
      ) : null}
    </div>
  );
}
