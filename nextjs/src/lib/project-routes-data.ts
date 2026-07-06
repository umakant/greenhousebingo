export type RouteStopStatus = "departed" | "completed" | "upcoming" | "pending";

export type EmployeeRouteStop = {
  id: string;
  order: number;
  name: string;
  address: string;
  icon: "home" | "clinic" | "stadium" | "venue" | "office";
  distanceFromPrevKm: number | null;
  timeFromPrev: string | null;
  services: string[];
  status: RouteStopStatus;
  statusTime: string | null;
  lat: number;
  lng: number;
};

export type EmployeeRouteStatus = "scheduled" | "in_progress" | "completed" | "delayed";

export type EmployeeRoute = {
  id: string;
  routeNumber: number;
  employeeName: string;
  role: string;
  email: string;
  phone: string;
  avatarInitials: string;
  status: EmployeeRouteStatus;
  routeDate: string;
  shiftStart: string;
  shiftEnd: string;
  stops: EmployeeRouteStop[];
  totalDistanceKm: number;
  totalTime: string;
  completedStops: number;
  remainingStops: number;
  issues: number;
  distanceTraveledKm: number;
  nextStopName: string;
  nextStopDistanceKm: number;
  eta: string;
  traffic: "light" | "moderate" | "heavy";
  avgStopTime: string;
  driveTime: string;
  idleTime: string;
};

export const EMPLOYEE_ROUTES: EmployeeRoute[] = [
  {
    id: "tammy-baker",
    routeNumber: 17,
    employeeName: "Tammy Baker",
    role: "Driver / Medic",
    email: "tammy.baker@firstaidresponders.com",
    phone: "(412) 555-0147",
    avatarInitials: "TB",
    status: "scheduled",
    routeDate: "2026-06-18",
    shiftStart: "7:30 AM",
    shiftEnd: "5:30 PM",
    totalDistanceKm: 701.36,
    totalTime: "9h 37m",
    completedStops: 3,
    remainingStops: 1,
    issues: 0,
    distanceTraveledKm: 312.45,
    nextStopName: "North Event Center",
    nextStopDistanceKm: 15.4,
    eta: "3:02 PM",
    traffic: "light",
    avgStopTime: "38m",
    driveTime: "5h 12m",
    idleTime: "14m",
    stops: [
      {
        id: "s1",
        order: 1,
        name: "Pittsburgh Depot",
        address: "1000 Liberty Ave, Pittsburgh, PA 15222",
        icon: "home",
        distanceFromPrevKm: null,
        timeFromPrev: null,
        services: ["Medical Standby"],
        status: "departed",
        statusTime: "7:45 AM",
        lat: 40.4414,
        lng: -80.0005,
      },
      {
        id: "s2",
        order: 2,
        name: "UPMC Presbyterian",
        address: "200 Lothrop St, Pittsburgh, PA 15213",
        icon: "clinic",
        distanceFromPrevKm: 4.2,
        timeFromPrev: "18m",
        services: ["Medical Standby", "First Aid"],
        status: "completed",
        statusTime: "9:20 AM",
        lat: 40.4419,
        lng: -79.9612,
      },
      {
        id: "s3",
        order: 3,
        name: "Acrisure Stadium",
        address: "100 Art Rooney Ave, Pittsburgh, PA 15212",
        icon: "stadium",
        distanceFromPrevKm: 6.8,
        timeFromPrev: "22m",
        services: ["Event Medical", "Crowd Care"],
        status: "completed",
        statusTime: "11:45 AM",
        lat: 40.4468,
        lng: -80.0157,
      },
      {
        id: "s4",
        order: 4,
        name: "North Event Center",
        address: "500 Hartman Run Rd, Morgantown, WV 26505",
        icon: "venue",
        distanceFromPrevKm: 15.4,
        timeFromPrev: "28m",
        services: ["Medical Standby"],
        status: "upcoming",
        statusTime: null,
        lat: 39.6512,
        lng: -79.9542,
      },
    ],
  },
  {
    id: "james-carter",
    routeNumber: 12,
    employeeName: "James Carter",
    role: "Field Supervisor",
    email: "james.carter@firstaidresponders.com",
    phone: "(305) 555-0198",
    avatarInitials: "JC",
    status: "in_progress",
    routeDate: "2026-06-18",
    shiftStart: "6:00 AM",
    shiftEnd: "4:00 PM",
    totalDistanceKm: 428.5,
    totalTime: "8h 10m",
    completedStops: 2,
    remainingStops: 2,
    issues: 1,
    distanceTraveledKm: 198.2,
    nextStopName: "Miami Convention Center",
    nextStopDistanceKm: 8.1,
    eta: "1:15 PM",
    traffic: "moderate",
    avgStopTime: "42m",
    driveTime: "4h 05m",
    idleTime: "22m",
    stops: [
      {
        id: "s1",
        order: 1,
        name: "Miami HQ",
        address: "601 Biscayne Blvd, Miami, FL 33132",
        icon: "home",
        distanceFromPrevKm: null,
        timeFromPrev: null,
        services: ["Logistics"],
        status: "departed",
        statusTime: "6:15 AM",
        lat: 25.7781,
        lng: -80.1865,
      },
      {
        id: "s2",
        order: 2,
        name: "Bayfront Park Event",
        address: "301 Biscayne Blvd, Miami, FL 33132",
        icon: "venue",
        distanceFromPrevKm: 2.1,
        timeFromPrev: "12m",
        services: ["Medical Standby"],
        status: "completed",
        statusTime: "8:30 AM",
        lat: 25.7753,
        lng: -80.186,
      },
      {
        id: "s3",
        order: 3,
        name: "Miami Convention Center",
        address: "1901 Convention Center Dr, Miami Beach, FL 33139",
        icon: "stadium",
        distanceFromPrevKm: 8.1,
        timeFromPrev: "25m",
        services: ["Event Medical", "AED Coverage"],
        status: "upcoming",
        statusTime: null,
        lat: 25.812,
        lng: -80.124,
      },
      {
        id: "s4",
        order: 4,
        name: "South Beach Clinic Post",
        address: "1200 Ocean Dr, Miami Beach, FL 33139",
        icon: "clinic",
        distanceFromPrevKm: 5.4,
        timeFromPrev: "18m",
        services: ["First Aid"],
        status: "pending",
        statusTime: null,
        lat: 25.782,
        lng: -80.13,
      },
    ],
  },
  {
    id: "sarah-mitchell",
    routeNumber: 8,
    employeeName: "Sarah Mitchell",
    role: "Medic / EMT",
    email: "sarah.mitchell@firstaidresponders.com",
    phone: "(312) 555-0163",
    avatarInitials: "SM",
    status: "completed",
    routeDate: "2026-06-17",
    shiftStart: "8:00 AM",
    shiftEnd: "6:00 PM",
    totalDistanceKm: 312.8,
    totalTime: "7h 45m",
    completedStops: 3,
    remainingStops: 0,
    issues: 0,
    distanceTraveledKm: 312.8,
    nextStopName: "—",
    nextStopDistanceKm: 0,
    eta: "—",
    traffic: "light",
    avgStopTime: "35m",
    driveTime: "3h 50m",
    idleTime: "10m",
    stops: [
      {
        id: "s1",
        order: 1,
        name: "Chicago Dispatch",
        address: "2301 S King Dr, Chicago, IL 60616",
        icon: "home",
        distanceFromPrevKm: null,
        timeFromPrev: null,
        services: ["Medical Standby"],
        status: "departed",
        statusTime: "8:10 AM",
        lat: 41.8506,
        lng: -87.6244,
      },
      {
        id: "s2",
        order: 2,
        name: "McCormick Place",
        address: "2301 S Lake Shore Dr, Chicago, IL 60616",
        icon: "venue",
        distanceFromPrevKm: 1.2,
        timeFromPrev: "8m",
        services: ["Event Medical"],
        status: "completed",
        statusTime: "10:00 AM",
        lat: 41.8515,
        lng: -87.6105,
      },
      {
        id: "s3",
        order: 3,
        name: "Soldier Field",
        address: "1410 S Museum Campus Dr, Chicago, IL 60605",
        icon: "stadium",
        distanceFromPrevKm: 3.5,
        timeFromPrev: "15m",
        services: ["Crowd Care", "Medical Standby"],
        status: "completed",
        statusTime: "2:30 PM",
        lat: 41.8623,
        lng: -87.6167,
      },
    ],
  },
  {
    id: "mike-johnson",
    routeNumber: 21,
    employeeName: "Mike Johnson",
    role: "Driver / Security Liaison",
    email: "mike.johnson@firstaidresponders.com",
    phone: "(602) 555-0122",
    avatarInitials: "MJ",
    status: "scheduled",
    routeDate: "2026-06-19",
    shiftStart: "7:00 AM",
    shiftEnd: "5:00 PM",
    totalDistanceKm: 520.0,
    totalTime: "9h 00m",
    completedStops: 0,
    remainingStops: 4,
    issues: 0,
    distanceTraveledKm: 0,
    nextStopName: "Phoenix Arena",
    nextStopDistanceKm: 0,
    eta: "7:30 AM",
    traffic: "light",
    avgStopTime: "—",
    driveTime: "—",
    idleTime: "—",
    stops: [
      {
        id: "s1",
        order: 1,
        name: "Phoenix Operations Hub",
        address: "201 E Jefferson St, Phoenix, AZ 85004",
        icon: "home",
        distanceFromPrevKm: null,
        timeFromPrev: null,
        services: ["Logistics"],
        status: "pending",
        statusTime: null,
        lat: 33.4484,
        lng: -112.074,
      },
      {
        id: "s2",
        order: 2,
        name: "Phoenix Arena",
        address: "201 E Jefferson St, Phoenix, AZ 85004",
        icon: "stadium",
        distanceFromPrevKm: 0.5,
        timeFromPrev: "5m",
        services: ["Event Medical"],
        status: "pending",
        statusTime: null,
        lat: 33.4457,
        lng: -112.0712,
      },
      {
        id: "s3",
        order: 3,
        name: "Scottsdale Medical Post",
        address: "7000 E Camelback Rd, Scottsdale, AZ 85251",
        icon: "clinic",
        distanceFromPrevKm: 12.3,
        timeFromPrev: "22m",
        services: ["First Aid", "Medical Standby"],
        status: "pending",
        statusTime: null,
        lat: 33.5024,
        lng: -111.928,
      },
      {
        id: "s4",
        order: 4,
        name: "Tempe Festival Grounds",
        address: "909 E Apache Blvd, Tempe, AZ 85281",
        icon: "venue",
        distanceFromPrevKm: 18.6,
        timeFromPrev: "28m",
        services: ["Crowd Care"],
        status: "pending",
        statusTime: null,
        lat: 33.4142,
        lng: -111.9261,
      },
    ],
  },
];

export function getEmployeeRouteById(id: string): EmployeeRoute | undefined {
  return EMPLOYEE_ROUTES.find((r) => r.id === id);
}

export function getEmployeeRouteForUser(displayName: string, email?: string | null): EmployeeRoute | undefined {
  const normalizedName = displayName.trim().toLowerCase();
  const normalizedEmail = email?.trim().toLowerCase();
  return EMPLOYEE_ROUTES.find((r) => {
    if (normalizedEmail && r.email.toLowerCase() === normalizedEmail) return true;
    return r.employeeName.trim().toLowerCase() === normalizedName;
  });
}

export const ROUTE_STATUS_LABELS: Record<EmployeeRouteStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};

export const STOP_STATUS_LABELS: Record<RouteStopStatus, string> = {
  departed: "Departed",
  completed: "Completed",
  upcoming: "Upcoming",
  pending: "Pending",
};
