/** Stable learner URL — prefer slug so links survive DB re-seeds. */
export function lmsMyLearningCoursePath(
  course: { slug?: string | null; id: bigint | string | number },
): string {
  const slug = course.slug?.trim();
  if (slug) return `/lms/my-learning/${encodeURIComponent(slug)}`;
  return `/lms/my-learning/${String(course.id)}`;
}
