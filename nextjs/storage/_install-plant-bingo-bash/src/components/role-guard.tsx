import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSession, dashboardPathFor, type AccountRole } from "@/hooks/use-session";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { toast } from "sonner";

export function RoleGuard({
  allow,
  children,
}: {
  allow: AccountRole[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { user, role, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (role && !allow.includes(role)) {
      toast.error("You don't have access to that dashboard.");
      navigate({ to: dashboardPathFor(role), replace: true });
    }
  }, [loading, user, role, allow, navigate]);

  if (loading || !user || (role && !allow.includes(role))) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-forest" />
        </div>
        <SiteFooter />
      </div>
    );
  }
  return <>{children}</>;
}
