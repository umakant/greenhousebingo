"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Sale {
  id: string;
  number: string;
  total: number;
  date: string;
  status: string;
}

export default function PosCalendarClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetch("/api/pos/sales", { credentials: "include" }).then(r => r.json()).then(setSales);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const getSalesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return sales.filter(s => s.date?.startsWith(dateStr));
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const nullCells: (number | null)[] = Array(firstDay).fill(null);
  const dayCells: (number | null)[] = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cells = [...nullCells, ...dayCells];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{monthName} {year}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 bg-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="border-t border-r min-h-[80px] bg-muted/20" />;
            const daySales = getSalesForDay(day);
            const total = daySales.reduce((s, sl) => s + Number(sl.total), 0);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            return (
              <div key={day} className={`border-t border-r min-h-[80px] p-1.5 ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}>
                <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                {daySales.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <div className="text-xs font-semibold text-green-700">${total.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">{daySales.length} sale{daySales.length !== 1 ? "s" : ""}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
