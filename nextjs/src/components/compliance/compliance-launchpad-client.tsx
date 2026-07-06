"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type LaunchpadSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  progressPct: number;
  completed: boolean;
  blockers: string[];
  nextAction: string;
  tasksGenerated: number;
};

export function ComplianceLaunchpadClient() {
  const [loading, setLoading] = React.useState(true);
  const [sections, setSections] = React.useState<LaunchpadSection[]>([]);
  const [overallProgressPct, setOverallProgressPct] = React.useState(0);
  const [completedSections, setCompletedSections] = React.useState(0);
  const [generating, setGenerating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/launchpad", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        sections?: LaunchpadSection[];
        overallProgressPct?: number;
        completedSections?: number;
      };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load launchpad");
        return;
      }
      setSections(data.sections ?? []);
      setOverallProgressPct(data.overallProgressPct ?? 0);
      setCompletedSections(data.completedSections ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/compliance/launchpad", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_tasks" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; created?: number };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to generate tasks");
        return;
      }
      toast.success(`Created ${data.created ?? 0} task(s)`);
      void load();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Compliance Launchpad</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedSections} of {sections.length} sections complete · {overallProgressPct}% overall
            </p>
          </div>
          <Button onClick={() => void generateTasks()} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate tasks from blockers
          </Button>
        </div>
        <Progress className="mt-4 h-2" value={overallProgressPct} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <div key={section.id} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{section.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              </div>
              {section.completed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              )}
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{section.progressPct}%</span>
              </div>
              <Progress value={section.progressPct} className="h-2" />
            </div>
            {section.blockers.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {section.blockers.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-green-700 dark:text-green-400">No blockers</p>
            )}
            <p className="mt-3 text-sm">
              <span className="font-medium">Next:</span> {section.nextAction}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{section.tasksGenerated} open task(s)</p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link href={section.href}>Go to section →</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
