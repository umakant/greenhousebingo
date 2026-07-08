"use client";

import * as React from "react";
import { Eye, Loader2, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { LmsCreatePortalUserSheet } from "@/components/lms/lms-create-portal-user-sheet";
import { getImagePath } from "@/utils/image-path";
import { Button } from "@/components/ui/button";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { usePortalImpersonate } from "@/hooks/use-portal-impersonate";
import { canImpersonateLmsInstructors } from "@/lib/portal-impersonate-client";
import { t } from "@/lib/admin-t";


export type InstructorDirectoryRow = {
  id: string;
  userId: string;
  displayName: string | null;
  headline: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  courseCount: number;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
  } | null;
};

export function LmsInstructorsAdminClient({ permissions }: { permissions: string[] }) {
  const showImpersonate = canImpersonateLmsInstructors(permissions);
  const canCreate =
    permissions.includes("*") ||
    permissions.includes("manage-lms-instructors") ||
    permissions.includes("manage-lms-events") ||
    permissions.includes("manage-lms");
  const { impersonate, isLoading: impersonateLoading } = usePortalImpersonate({
    returnPath: "/lms/instructors",
    lmsPortal: "instructor",
  });

  const [createOpen, setCreateOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<InstructorDirectoryRow[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/instructor-profiles", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: InstructorDirectoryRow[];
        message?: string;
      } | null;
      if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
        toast.error(data?.message ?? t("Failed to load instructors"));
        setProfiles([]);
        return;
      }
      setProfiles(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="rounded-lg border border-border/80 bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{t("Instructor directory")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Create instructor logins and profiles for your organization. Use Impersonate to open their instructor portal.",
              )}
            </p>
          </div>
          {canCreate ? (
            <Button size="sm" className="gap-1 shrink-0" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("Create instructor")}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("Loading…")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">{t("Instructor")}</th>
                  <th className="px-4 py-2">{t("Email")}</th>
                  <th className="px-4 py-2">{t("Courses")}</th>
                  <th className="px-4 py-2">{t("Status")}</th>
                  <th className="px-4 py-2 text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {t("No instructor profiles yet. Create an instructor account to get started.")}
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => {
                    const img = p.avatarUrl?.trim() || p.user?.avatar?.trim() || "";
                    const portalUserId = p.userId?.trim() || p.user?.id?.trim() || "";
                    const menuItems: TableActionItem[] = [
                      {
                        label: t("View courses"),
                        icon: <Eye className="h-4 w-4" />,
                        href: "/lms/courses",
                      },
                    ];
                    if (showImpersonate) {
                      menuItems.push({
                        label: t("Impersonate"),
                        icon: <UserRound className="h-4 w-4" />,
                        onSelect: () => {
                          if (portalUserId) void impersonate(portalUserId);
                        },
                        disabled: !portalUserId || impersonateLoading(portalUserId),
                      });
                    }

                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getImagePath(img)} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">
                                  {(p.displayName || p.user?.name || "?").slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{p.displayName || p.user?.name || "—"}</div>
                              {p.headline ? (
                                <div className="text-xs text-muted-foreground">{p.headline}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.user?.email ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{p.courseCount}</td>
                        <td className="px-4 py-3">{p.isActive ? t("Active") : t("Inactive")}</td>
                        <td className="px-4 py-3 text-right">
                          <TableActionButton label={t("Actions")} items={menuItems} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LmsCreatePortalUserSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        kind="instructor"
        onCreated={() => void load()}
      />
    </>
  );
}
