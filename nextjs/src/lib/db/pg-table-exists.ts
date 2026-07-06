import { prisma } from "@/lib/prisma";

export async function pgTableExists(table: string, schema = "public"): Promise<boolean> {
  try {
    const tableName = table.includes(".") ? table.split(".").pop() || table : table;
    const rows = (await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = ${schema}
          AND table_name = ${tableName}
      ) AS "exists"
    `) as Array<{ exists: boolean }>;
    return !!rows?.[0]?.exists;
  } catch {
    return false;
  }
}

