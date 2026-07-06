// Run: node scripts/seed-appointment-demo.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const log = (m) => console.log(`[appt-seed] ${m}`);

async function main() {
  log("Starting appointment demo seed…");

  // Find company user
  const company = await prisma.user.findFirst({ where: { type: "company" } });
  if (!company) { log("No company user found — run main seed first"); return; }
  const createdBy = company.id;
  log(`Using company id=${createdBy}`);

  // Clear existing
  await prisma.schedule.deleteMany({ where: { createdBy } });
  await prisma.appointment.deleteMany({ where: { createdBy } });
  log("Cleared old data");

  // Appointments
  const appts = await prisma.appointment.createMany({
    data: [
      { appointmentName: "Team Building & Development",    appointmentType: "1", weekDay: JSON.stringify(["Wednesday","Thursday"]),                      duration: 60, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Digital Transformation Workshop",appointmentType: "1", weekDay: JSON.stringify(["Thursday"]),                                  duration: 90, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Free Consultation Call",         appointmentType: "0", weekDay: JSON.stringify(["Monday","Wednesday","Saturday"]),              duration: 30, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Quick Support Session",          appointmentType: "0", weekDay: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]), duration: 20, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Financial Planning Review",      appointmentType: "1", weekDay: JSON.stringify(["Tuesday","Friday"]),                           duration: 60, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Onboarding Assistance",          appointmentType: "0", weekDay: JSON.stringify(["Monday","Wednesday","Friday"]),                duration: 45, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Performance Review Meeting",     appointmentType: "1", weekDay: JSON.stringify(["Tuesday","Thursday"]),                         duration: 60, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Investment Strategy Session",    appointmentType: "1", weekDay: JSON.stringify(["Friday"]),                                     duration: 90, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Product Demo Session",           appointmentType: "1", weekDay: JSON.stringify(["Wednesday","Thursday"]),                       duration: 45, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Open House Session",             appointmentType: "0", weekDay: JSON.stringify(["Monday","Sunday"]),                            duration: 120,enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Crisis Management Planning",     appointmentType: "1", weekDay: JSON.stringify(["Monday","Tuesday"]),                           duration: 90, enabled: true, createdBy, creatorId: createdBy },
      { appointmentName: "Information Session",            appointmentType: "0", weekDay: JSON.stringify(["Wednesday","Thursday"]),                       duration: 60, enabled: false, createdBy, creatorId: createdBy },
    ],
  });
  log(`Created ${appts.count} appointments`);

  // Reload them to get IDs
  const allAppts = await prisma.appointment.findMany({ where: { createdBy }, orderBy: { id: "asc" } });
  const byName = Object.fromEntries(allAppts.map((a) => [a.appointmentName, a.id]));

  // Schedules — spread across Jan-Apr 2026
  const uid = () => Math.random().toString(36).slice(2, 12);
  const scheduleData = [
    // completed (21)
    { name: "Kimberly Young",    email: "kimberly@ex.com",  appointmentId: byName["Team Building & Development"],     date: new Date("2026-01-28"), startTime: "09:00", endTime: "10:00", status: "complete" },
    { name: "Brandon King",      email: "brandon@ex.com",   appointmentId: byName["Crisis Management Planning"],      date: new Date("2026-02-02"), startTime: "15:00", endTime: "16:30", status: "complete" },
    { name: "Megan Scott",       email: "megan@ex.com",     appointmentId: byName["Information Session"],             date: new Date("2026-02-04"), startTime: "12:45", endTime: "13:45", status: "complete" },
    { name: "Tyler Adams",       email: "tyler@ex.com",     appointmentId: byName["Free Consultation Call"],          date: new Date("2026-02-07"), startTime: "11:00", endTime: "11:30", status: "complete" },
    { name: "Grace Liu",         email: "grace@ex.com",     appointmentId: byName["Digital Transformation Workshop"], date: new Date("2026-02-09"), startTime: "14:00", endTime: "15:30", status: "complete" },
    { name: "James Carter",      email: "james@ex.com",     appointmentId: byName["Financial Planning Review"],       date: new Date("2026-02-09"), startTime: "10:00", endTime: "11:00", status: "complete" },
    { name: "Olivia Harris",     email: "olivia@ex.com",    appointmentId: byName["Onboarding Assistance"],           date: new Date("2026-02-09"), startTime: "13:00", endTime: "13:45", status: "complete" },
    { name: "Ethan Brooks",      email: "ethan@ex.com",     appointmentId: byName["Performance Review Meeting"],      date: new Date("2026-02-17"), startTime: "09:30", endTime: "10:30", status: "complete" },
    { name: "Sophia Martinez",   email: "sophia@ex.com",    appointmentId: byName["Investment Strategy Session"],     date: new Date("2026-02-20"), startTime: "14:00", endTime: "15:30", status: "complete" },
    { name: "Liam Johnson",      email: "liam@ex.com",      appointmentId: byName["Team Building & Development"],     date: new Date("2026-02-25"), startTime: "10:00", endTime: "11:00", status: "complete" },
    { name: "Emma Wilson",       email: "emma@ex.com",      appointmentId: byName["Free Consultation Call"],          date: new Date("2026-02-26"), startTime: "11:00", endTime: "11:30", status: "complete" },
    { name: "Noah Anderson",     email: "noah@ex.com",      appointmentId: byName["Product Demo Session"],            date: new Date("2026-02-26"), startTime: "15:00", endTime: "15:45", status: "complete" },
    { name: "Isabella Taylor",   email: "isabella@ex.com",  appointmentId: byName["Quick Support Session"],           date: new Date("2026-03-01"), startTime: "10:00", endTime: "10:20", status: "complete" },
    { name: "William Brown",     email: "william@ex.com",   appointmentId: byName["Crisis Management Planning"],      date: new Date("2026-03-03"), startTime: "14:00", endTime: "15:30", status: "complete" },
    { name: "Charlotte Davis",   email: "charlotte@ex.com", appointmentId: byName["Financial Planning Review"],       date: new Date("2026-03-07"), startTime: "09:00", endTime: "10:00", status: "complete" },
    { name: "Lucas Garcia",      email: "lucas@ex.com",     appointmentId: byName["Onboarding Assistance"],           date: new Date("2026-03-08"), startTime: "11:00", endTime: "11:45", status: "complete" },
    { name: "Amelia Thompson",   email: "amelia@ex.com",    appointmentId: byName["Information Session"],             date: new Date("2026-03-08"), startTime: "13:00", endTime: "14:00", status: "complete" },
    { name: "Henry White",       email: "henry@ex.com",     appointmentId: byName["Team Building & Development"],     date: new Date("2026-03-11"), startTime: "09:00", endTime: "10:00", status: "complete" },
    { name: "Evelyn Lewis",      email: "evelyn@ex.com",    appointmentId: byName["Digital Transformation Workshop"], date: new Date("2026-03-12"), startTime: "14:00", endTime: "15:30", status: "complete" },
    { name: "Alexander Clark",   email: "alex@ex.com",      appointmentId: byName["Quick Support Session"],           date: new Date("2026-03-15"), startTime: "10:00", endTime: "10:20", status: "complete" },
    { name: "Ava Robinson",      email: "ava@ex.com",       appointmentId: byName["Performance Review Meeting"],      date: new Date("2026-03-17"), startTime: "11:00", endTime: "12:00", status: "complete" },
    // approved (8)
    { name: "Samantha Baker",    email: "samantha@ex.com",  appointmentId: byName["Quick Support Session"],           date: new Date("2026-03-12"), startTime: "09:30", endTime: "09:50", status: "approved" },
    { name: "Michael Lee",       email: "michael@ex.com",   appointmentId: byName["Investment Strategy Session"],     date: new Date("2026-03-19"), startTime: "14:00", endTime: "15:30", status: "approved" },
    { name: "Rachel Kim",        email: "rachel@ex.com",    appointmentId: byName["Free Consultation Call"],          date: new Date("2026-03-21"), startTime: "10:00", endTime: "10:30", status: "approved" },
    { name: "David Turner",      email: "david@ex.com",     appointmentId: byName["Onboarding Assistance"],           date: new Date("2026-03-24"), startTime: "13:00", endTime: "13:45", status: "approved" },
    { name: "Patricia Moore",    email: "patricia@ex.com",  appointmentId: byName["Team Building & Development"],     date: new Date("2026-03-25"), startTime: "09:00", endTime: "10:00", status: "approved" },
    { name: "Kevin Hall",        email: "kevin@ex.com",     appointmentId: byName["Digital Transformation Workshop"], date: new Date("2026-03-26"), startTime: "14:00", endTime: "15:30", status: "approved" },
    { name: "Sandra Young",      email: "sandra@ex.com",    appointmentId: byName["Financial Planning Review"],       date: new Date("2026-04-03"), startTime: "10:00", endTime: "11:00", status: "approved" },
    { name: "Christopher Martin",email: "chris@ex.com",     appointmentId: byName["Crisis Management Planning"],      date: new Date("2026-04-07"), startTime: "15:00", endTime: "16:30", status: "approved" },
    // pending (7)
    { name: "Nathan Rodriguez",  email: "nathan@ex.com",    appointmentId: byName["Open House Session"],              date: new Date("2026-03-09"), startTime: "15:00", endTime: "17:00", status: "pending" },
    { name: "Karen Evans",       email: "karen@ex.com",     appointmentId: byName["Product Demo Session"],            date: new Date("2026-03-26"), startTime: "10:00", endTime: "10:45", status: "pending" },
    { name: "Daniel Harris",     email: "daniel@ex.com",    appointmentId: byName["Information Session"],             date: new Date("2026-04-08"), startTime: "11:00", endTime: "12:00", status: "pending" },
    { name: "Laura Wilson",      email: "laura@ex.com",     appointmentId: byName["Quick Support Session"],           date: new Date("2026-04-10"), startTime: "09:00", endTime: "09:20", status: "pending" },
    { name: "Mark Thompson",     email: "mark@ex.com",      appointmentId: byName["Free Consultation Call"],          date: new Date("2026-04-14"), startTime: "11:00", endTime: "11:30", status: "pending" },
    { name: "Jennifer Anderson", email: "jennifer@ex.com",  appointmentId: byName["Team Building & Development"],     date: new Date("2026-04-15"), startTime: "09:00", endTime: "10:00", status: "pending" },
    { name: "Robert Jackson",    email: "robert@ex.com",    appointmentId: byName["Investment Strategy Session"],     date: new Date("2026-04-17"), startTime: "14:00", endTime: "15:30", status: "pending" },
    // rejected (4)
    { name: "Susan White",       email: "susan@ex.com",     appointmentId: byName["Performance Review Meeting"],      date: new Date("2026-03-05"), startTime: "10:00", endTime: "11:00", status: "rejected" },
    { name: "Donald Martinez",   email: "donald@ex.com",    appointmentId: byName["Crisis Management Planning"],      date: new Date("2026-03-14"), startTime: "15:00", endTime: "16:30", status: "rejected" },
    { name: "Barbara Thomas",    email: "barbara@ex.com",   appointmentId: byName["Digital Transformation Workshop"], date: new Date("2026-03-18"), startTime: "14:00", endTime: "15:30", status: "rejected" },
    { name: "Charles Moore",     email: "charles@ex.com",   appointmentId: byName["Financial Planning Review"],       date: new Date("2026-03-20"), startTime: "09:00", endTime: "10:00", status: "rejected" },
  ];

  for (const row of scheduleData) {
    await prisma.schedule.create({
      data: { ...row, uniqueId: uid(), createdBy, creatorId: createdBy },
    });
  }
  log(`Created ${scheduleData.length} schedules`);
  log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
