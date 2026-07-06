"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SeatmapRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: string | null;
};

export function EventPlatformSeatmapsAdmin() {
  const router = useRouter();
  const [items, setItems] = React.useState<SeatmapRow[] | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/seatmaps", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: SeatmapRow[] } | null;
    setItems(res.ok && data?.ok ? data.items ?? [] : []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/seatmaps", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), status: "draft" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: { id: string }; message?: string } | null;
      if (!res.ok || !data?.ok || !data.item) throw new Error(data?.message ?? "Create failed.");
      setSheetOpen(false);
      setName("");
      toast.success("Seat map created.");
      router.push(`/admin/event-platform/seatmaps/${data.item.id}/edit`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading seat maps…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New seat map
        </Button>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <NoRecordsFound icon={LayoutGrid} title="No seat maps yet" description="Create reusable seat map templates for ticketed events." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/event-platform/seatmaps/${row.id}/edit`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New seat map</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Label htmlFor="sm-name">Name</Label>
            <Input id="sm-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <SheetFooter>
            <Button disabled={saving} onClick={() => void create()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create & edit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
