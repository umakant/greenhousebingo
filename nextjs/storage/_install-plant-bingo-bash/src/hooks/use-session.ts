import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "customer" | "venue" | "partner" | "guest";

export function useSession() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async (uid: string | null) => {
      if (!uid) {
        setRole(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", uid)
        .maybeSingle();
      if (mounted) setRole((data?.account_type as AccountRole) ?? null);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      setSession(next);
      loadRole(next?.user?.id ?? null);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadRole(data.session?.user?.id ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const user: User | null = session?.user ?? null;
  return { session, user, role, loading };
}

export function dashboardPathFor(role: AccountRole | null | undefined): string {
  if (role === "venue") return "/venue/dashboard";
  if (role === "partner") return "/partner/dashboard";
  return "/account";
}
