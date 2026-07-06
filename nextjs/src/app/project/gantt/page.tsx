import { redirect } from "next/navigation";

/** Gantt lives on Manage Project → view toggle; keep URL for bookmarks. */
export default function ProjectGanttRedirectPage() {
  redirect("/projects?view=gantt");
}
