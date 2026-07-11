import type { ActivityFilterCategory } from "@/lib/event-platform/event-operations/activity-constants";
import type { ExtendedAlert } from "@/lib/event-platform/event-operations/event-alert-engine";

export type EventOperationsFilters = {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  activityType?: string;
  category?: ActivityFilterCategory;
  attendeeId?: string;
};

export type EventActivityRow = {
  id: string;
  timestamp: string;
  userName: string | null;
  userId: string | null;
  activityType: string;
  activityLabel: string;
  description: string;
  category: ActivityFilterCategory;
  entityType: string;
  entityId: string | null;
  source: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadataFormatted: Array<{ key: string; value: string }>;
  relatedLink: string | null;
};

export type EventOperationalTaskDto = {
  id: string;
  templateKey: string | null;
  title: string;
  category: string;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  dueAt: string | null;
  completedAt: string | null;
  completedByName: string | null;
  notes: string | null;
  isCustom: boolean;
  isOverdue: boolean;
};

export type EventOperationsOverview = {
  eventId: string;
  canManage: boolean;
  canAssignTasks: boolean;
  canExport: boolean;
  filters: EventOperationsFilters;
  checklist: {
    percent: number;
    completed: number;
    total: number;
    overdue: number;
    tasks: EventOperationalTaskDto[];
  };
  alerts: ExtendedAlert[];
  activity: EventActivityRow[];
  activityTotal: number;
};
