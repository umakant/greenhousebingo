export function formatDurationLabel(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m total`;
  if (h > 0) return `${h}h total`;
  return `${m}m total`;
}

export type MyLearningTab = "in_progress" | "not_started" | "completed" | "overdue";

export type MyLearningCourseCard = {
  courseId: string;
  enrollmentId: string | null;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  progressPercent: number;
  isComplete: boolean;
  status: MyLearningTab;
  totalDurationMinutes: number;
  lastAccessedAt: string | null;
  href: string;
  canAccessContent: boolean;
  dueDate: string | null;
};

export type MyLearningHubPayload = {
  summary: {
    enrolledCount: number;
    completedCount: number;
    inProgressCount: number;
    overdueCount: number;
    notStartedCount: number;
    overallProgressPercent: number;
  };
  continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string;
    lessonTitle: string;
    href: string;
  } | null;
  tabs: Record<MyLearningTab, MyLearningCourseCard[]>;
  recommended: MyLearningCourseCard[];
  deadlines: Array<{
    courseId: string;
    title: string;
    dueDate: string;
    daysRemaining: number;
    href: string;
  }>;
};
