import type { CommandCenterLinkDef } from "@/lib/launchpad/command-center-links";

export type CommandCenterQuickAction = CommandCenterLinkDef & {
  colorClass: string;
};

export type CommandCenterTask = {
  id: string;
  label: string;
  dueLabel: string;
  dueVariant: "today" | "soon" | "normal" | "tomorrow";
  href: string;
};

export type CommandCenterActivity = {
  id: string;
  message: string;
  timeLabel: string;
  icon: string;
};

export type CommandCenterApproval = {
  id: string;
  label: string;
  count: number;
  href: string;
  icon: string;
  alwaysShow?: boolean;
};

export type CommandCenterMetricRow = {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "warning";
};

export type CommandCenterSnapshot = {
  id: string;
  title: string;
  href: string;
  rows: CommandCenterMetricRow[];
};

export type CommandCenterNotification = {
  id: string;
  message: string;
  priority: "high" | "medium" | "low";
  href?: string;
  icon?: string;
};

export type CommandCenterScheduleItem = {
  id: string;
  time: string;
  title: string;
  dotColor: string;
};

export type CommandCenterHealthScore = {
  id: string;
  label: string;
  percent: number;
};

export type CommandCenterCalendarEvent = {
  id: string;
  date: string;
  label: string;
  color: string;
  type: "project" | "deadline" | "pto" | "compliance";
};

export type CommandCenterShortcut = {
  id: string;
  label: string;
  href: string;
  icon: string;
  colorClass: string;
  permissions?: string[];
  addonScope?: string;
};

export type CommandCenterCompliance = {
  score: number;
  frameworks: Array<{ label: string; percent: number }>;
  actions: Array<{ label: string; href: string }>;
};

export type CommandCenterPayload = {
  quickActions: CommandCenterQuickAction[];
  tasks: CommandCenterTask[];
  recentActivity: CommandCenterActivity[];
  pendingApprovals: CommandCenterApproval[];
  snapshots: CommandCenterSnapshot[];
  compliance: CommandCenterCompliance | null;
  notifications: CommandCenterNotification[];
  shortcuts: CommandCenterShortcut[];
  calendarEvents: CommandCenterCalendarEvent[];
  schedule: CommandCenterScheduleItem[];
  healthScores: CommandCenterHealthScore[];
};
