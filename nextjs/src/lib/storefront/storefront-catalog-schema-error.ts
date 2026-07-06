import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/** Shown in admin when DB is behind Prisma (missing table/column). */
export const STOREFRONT_CATALOG_SCHEMA_ERROR_MESSAGE =
  "Storefront catalog schema is out of date (missing pos_products columns such as storefront_featured, slug, or storefront_collections). On the server from the nextjs folder run: npm run db:migrate:deploy so pending migrations apply (see PM2 log / prisma migrate status). If migrate deploy is blocked: npm run db:apply-storefront-gap adds many pos_products/collections columns (not the blog table). Blog requires migration 20260506140000_storefront_blog_posts. P3009: resolve the failed migration with prisma migrate resolve first. Encode @ in DATABASE_URL passwords as %40. Restart the app after.";

/** Shown on Blog admin APIs when storefront_blog_posts (or its columns) are missing. */
export const STOREFRONT_BLOG_SCHEMA_ERROR_MESSAGE =
  "Blog database schema is missing (table storefront_blog_posts). On the server, from the nextjs folder, run: npm run db:migrate:deploy. If you see P3009, Prisma will not apply any newer migrations until the migration listed as failed is resolved — run npx prisma migrate status. Compare your database to prisma/migrations/<that-name>/migration.sql: if that SQL is already fully applied, run npx prisma migrate resolve --applied \"<that-name>\"; if it never finished, fix the error (or restore the DB), then npx prisma migrate resolve --rolled-back \"<that-name>\" and deploy again. A common blocker is 20260420120000_crm_lead_first_last_name (crm_leads first_name/last_name). After deploy succeeds, the blog migration 20260506140000_storefront_blog_posts can apply. Ensure DATABASE_URL points at this database (encode @ in passwords as %40). Restart the app.";

export function storefrontCatalogSchemaErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2022" || e.code === "P2021")) {
    return NextResponse.json(
      { ok: false, message: STOREFRONT_CATALOG_SCHEMA_ERROR_MESSAGE, code: e.code },
      { status: 503 },
    );
  }
  return null;
}

/** Same detection as catalog (P2021/P2022); message targets Blog admin instead of product/catalog tables. */
export function storefrontBlogSchemaErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2022" || e.code === "P2021")) {
    return NextResponse.json(
      { ok: false, message: STOREFRONT_BLOG_SCHEMA_ERROR_MESSAGE, code: e.code },
      { status: 503 },
    );
  }
  return null;
}
