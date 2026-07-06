import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Landing page disabled — send visitors to login (or dashboard if already signed in). */
export default async function HomePage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  const rolesRaw = store.get("pf_roles")?.value;

  if (role || (rolesRaw && rolesRaw !== "[]")) {
    redirect("/dashboard");
  }

  redirect("/login");
}
