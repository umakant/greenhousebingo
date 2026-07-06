export type GanttStaff = { id: string; name: string; color: string | null; email?: string | null };
export type GanttSub = { id: string; name: string; color: string | null; email?: string | null };

export type GanttProjectStaff = {
  id: string;
  projectId: string;
  locationId: string | null;
  staffId: string | null;
  label?: string;
  startDate: string | null;
  endDate: string | null;
  approvalStatus: string;
  notifiedAt: string | null;
  staff: GanttStaff | null;
};

export type GanttProjectSub = {
  id: string;
  projectId: string;
  locationId: string | null;
  subId: string | null;
  label?: string;
  startDate: string | null;
  endDate: string | null;
  sub: GanttSub | null;
};

export type GanttProjectLocation = {
  id: string;
  projectId: string;
  name: string;
  color: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  startDate: string | null;
  endDate: string | null;
  showLocationMap?: boolean;
  staffAssignments: GanttProjectStaff[];
  subAssignments: GanttProjectSub[];
};

export type GanttProject = {
  id: string;
  name: string;
  color: string | null;
  status: string | null;
  startDate: string;
  endDate: string;
  clientId: string | null;
  projectRefId: number | null;
  createdAt: string;
  locations: GanttProjectLocation[];
  staffAssignments: GanttProjectStaff[];
  subAssignments: GanttProjectSub[];
};
