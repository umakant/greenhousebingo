const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_name='forms' AND column_name='project_section_id'",
  );
  console.log("column exists:", cols);

  const company = await prisma.user.findFirst({
    where: { type: "company" },
    select: { id: true, name: true },
  });
  if (!company) {
    console.log("No company user found");
    return;
  }
  console.log("company", company.id.toString(), company.name);

  const companyId = company.id;
  const code = `project-test-${Date.now()}`;
  try {
    const created = await prisma.form.create({
      data: {
        name: "Project — Test",
        code,
        projectSectionId: "notes",
        createdBy: companyId,
      },
    });
    console.log("create ok", created.id.toString());
    await prisma.form.delete({ where: { id: created.id } });
    console.log("cleanup ok");
  } catch (e) {
    console.error("create failed:", e.message);
    if (e.meta) console.error("meta:", e.meta);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
