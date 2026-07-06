import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.user.findFirst({ where: { type: "company" } });
  if (!company) throw new Error("No company user found — run the base seed first");

  console.log(`Seeding Taskly data for company ${company.email} (id=${company.id})`);

  const staffUsers = await prisma.user.findMany({
    where: { createdBy: company.id, type: "staff" },
    take: 3,
  });
  const clientUsers = await prisma.user.findMany({
    where: { createdBy: company.id, type: "client" },
    take: 2,
  });

  let proj1 = await prisma.project.findFirst({ where: { createdBy: company.id }, orderBy: { id: "asc" } });
  let proj2 = await prisma.project.findFirst({ where: { createdBy: company.id }, orderBy: { id: "desc" } });

  if (!proj1) {
    proj1 = await prisma.project.create({
      data: {
        name: "WorkDo Platform v2",
        description: "Next-generation project management platform rebuild with modern tech stack.",
        budget: 45000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        status: "Ongoing",
        creatorId: company.id,
        createdBy: company.id,
      },
    });
  }

  if (!proj2 || proj2.id === proj1.id) {
    proj2 = await prisma.project.create({
      data: {
        name: "Mobile App Redesign",
        description: "Complete UI/UX overhaul of the mobile application.",
        budget: 18000,
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-04-30"),
        status: "Ongoing",
        creatorId: company.id,
        createdBy: company.id,
      },
    });
  }

  const proj3 = await prisma.project.create({
    data: {
      name: "Customer Portal",
      description: "Self-service customer portal with billing and support features.",
      budget: 22000,
      startDate: new Date("2026-03-15"),
      endDate: new Date("2026-08-31"),
      status: "Not Started",
      creatorId: company.id,
      createdBy: company.id,
    },
  });

  console.log(`  Projects created: ${proj1.name}, ${proj2.name}, ${proj3.name}`);

  const existingTs = await prisma.taskStage.findMany({ where: { createdBy: company.id }, orderBy: { order: "asc" } });
  let [ts1, ts2, ts3, ts4] = existingTs;
  if (existingTs.length < 4) {
    ts1 = ts1 ?? await prisma.taskStage.create({ data: { name: "To Do", color: "#6366f1", complete: false, order: 1, creatorId: company.id, createdBy: company.id } });
    ts2 = ts2 ?? await prisma.taskStage.create({ data: { name: "In Progress", color: "#f59e0b", complete: false, order: 2, creatorId: company.id, createdBy: company.id } });
    ts3 = ts3 ?? await prisma.taskStage.create({ data: { name: "In Review", color: "#3b82f6", complete: false, order: 3, creatorId: company.id, createdBy: company.id } });
    ts4 = ts4 ?? await prisma.taskStage.create({ data: { name: "Done", color: "#10b981", complete: true, order: 4, creatorId: company.id, createdBy: company.id } });
  }

  const existingBs = await prisma.bugStage.findMany({ where: { createdBy: company.id }, orderBy: { order: "asc" } });
  let [bs1, bs2, bs3] = existingBs;
  if (existingBs.length < 3) {
    bs1 = bs1 ?? await prisma.bugStage.create({ data: { name: "Open", color: "#ef4444", complete: false, order: 1, creatorId: company.id, createdBy: company.id } });
    bs2 = bs2 ?? await prisma.bugStage.create({ data: { name: "In Progress", color: "#f59e0b", complete: false, order: 2, creatorId: company.id, createdBy: company.id } });
    bs3 = bs3 ?? await prisma.bugStage.create({ data: { name: "Closed", color: "#10b981", complete: true, order: 3, creatorId: company.id, createdBy: company.id } });
  }

  console.log("  Stages ready");

  const assignedIds = staffUsers.slice(0, 2).map((u) => Number(u.id));

  await prisma.projectUser.createMany({
    data: staffUsers.map((u) => ({ projectId: proj1!.id, userId: u.id })),
    skipDuplicates: true,
  });
  if (clientUsers.length) {
    await prisma.projectClient.createMany({
      data: clientUsers.map((u) => ({ projectId: proj1!.id, clientId: u.id })),
      skipDuplicates: true,
    });
  }

  const ms1 = await prisma.projectMilestone.create({
    data: {
      projectId: proj1!.id, title: "Phase 1: Foundation",
      cost: 5000, startDate: new Date("2026-01-01"), endDate: new Date("2026-02-28"),
      status: "Complete", progress: 100, summary: "Core setup and infrastructure",
    },
  });
  const ms2 = await prisma.projectMilestone.create({
    data: {
      projectId: proj1!.id, title: "Phase 2: Features",
      cost: 8000, startDate: new Date("2026-03-01"), endDate: new Date("2026-04-30"),
      status: "Incomplete", progress: 60, summary: "Main feature development",
    },
  });

  const tasks = await prisma.projectTask.createMany({
    data: [
      {
        projectId: proj1!.id, milestoneId: ms1.id, title: "Set up project repository",
        priority: "High", assignedTo: assignedIds, stageId: ts4!.id,
        duration: "2026-01-01 - 2026-01-07", description: "Initialize git repository and CI/CD pipeline.",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj1!.id, milestoneId: ms1.id, title: "Design database schema",
        priority: "High", assignedTo: assignedIds.slice(0, 1), stageId: ts4!.id,
        duration: "2026-01-08 - 2026-01-20", description: "Design and document all database tables.",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj1!.id, milestoneId: ms2.id, title: "Implement user authentication",
        priority: "High", assignedTo: assignedIds, stageId: ts3!.id,
        duration: "2026-03-01 - 2026-03-15", description: "JWT-based auth with refresh tokens.",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj1!.id, milestoneId: ms2.id, title: "Build dashboard UI",
        priority: "Medium", assignedTo: assignedIds.slice(1), stageId: ts2!.id,
        duration: "2026-03-16 - 2026-03-31", description: "Main dashboard with KPIs and charts.",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj1!.id, title: "Write API documentation",
        priority: "Low", assignedTo: [], stageId: ts1!.id,
        duration: "2026-04-01 - 2026-04-15", description: "Document all REST API endpoints.",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj1!.id, title: "Performance optimization",
        priority: "Medium", assignedTo: assignedIds, stageId: ts1!.id,
        duration: "2026-04-16 - 2026-04-30",
        creatorId: company.id, createdBy: company.id,
      },
    ],
  });

  await prisma.projectBug.createMany({
    data: [
      {
        projectId: proj1!.id, title: "Login page shows blank screen on mobile",
        priority: "High", assignedTo: assignedIds, stageId: bs1!.id,
        description: "Reproduced on iOS Safari 16 and Chrome mobile.",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj1!.id, title: "Dashboard data not refreshing after navigation",
        priority: "Medium", assignedTo: assignedIds.slice(0, 1), stageId: bs2!.id,
        description: "Data caches from the previous session.",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj1!.id, title: "Export to CSV includes extra blank rows",
        priority: "Low", assignedTo: [], stageId: bs3!.id,
        description: "Fixed in commit abc123.",
        creatorId: company.id, createdBy: company.id,
      },
    ],
  });

  console.log(`  Project 1 (${proj1!.name}): 2 milestones, ${tasks.count} tasks, 3 bugs`);

  if (staffUsers.length) {
    await prisma.projectUser.createMany({
      data: staffUsers.slice(0, 1).map((u) => ({ projectId: proj2!.id, userId: u.id })),
      skipDuplicates: true,
    });
  }
  await prisma.projectTask.createMany({
    data: [
      {
        projectId: proj2!.id, title: "Requirements gathering",
        priority: "High", assignedTo: staffUsers.slice(0, 1).map((u) => Number(u.id)),
        stageId: ts4!.id, duration: "2026-02-01 - 2026-02-15",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj2!.id, title: "Wireframe design",
        priority: "Medium", assignedTo: [], stageId: ts2!.id,
        duration: "2026-02-16 - 2026-03-01",
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj2!.id, title: "Prototype implementation",
        priority: "High", assignedTo: staffUsers.slice(0, 2).map((u) => Number(u.id)),
        stageId: ts1!.id, duration: "2026-03-01 - 2026-03-31",
        creatorId: company.id, createdBy: company.id,
      },
    ],
  });

  await prisma.projectBug.createMany({
    data: [
      {
        projectId: proj2!.id, title: "Navigation menu disappears on resize",
        priority: "Medium", assignedTo: [], stageId: bs1!.id,
        creatorId: company.id, createdBy: company.id,
      },
      {
        projectId: proj2!.id, title: "Form validation not triggering on blur",
        priority: "High", assignedTo: staffUsers.slice(0, 1).map((u) => Number(u.id)), stageId: bs2!.id,
        creatorId: company.id, createdBy: company.id,
      },
    ],
  });

  console.log(`  Project 2 (${proj2!.name}): 3 tasks, 2 bugs`);
  console.log("Taskly seed complete ✓");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
