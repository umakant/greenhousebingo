-- Storefront blog posts (merchant CMS; @@map storefront_blog_posts)

CREATE TABLE IF NOT EXISTS "storefront_blog_posts" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "website_id" BIGINT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body_html" TEXT NOT NULL DEFAULT '',
    "featured_image_url" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "seo_title" VARCHAR(512),
    "seo_description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_featured_home" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "storefront_blog_posts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "storefront_blog_posts"
    ADD CONSTRAINT "storefront_blog_posts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "storefront_blog_posts"
    ADD CONSTRAINT "storefront_blog_posts_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "storefront_websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "storefront_blog_posts"
    ADD CONSTRAINT "storefront_blog_posts_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "storefront_blog_posts"
    ADD CONSTRAINT "storefront_blog_posts_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_blog_posts_organization_id_slug_key"
  ON "storefront_blog_posts" ("organization_id", "slug");

CREATE INDEX IF NOT EXISTS "storefront_blog_posts_organization_id_status_idx"
  ON "storefront_blog_posts" ("organization_id", "status");

CREATE INDEX IF NOT EXISTS "storefront_blog_posts_website_id_idx"
  ON "storefront_blog_posts" ("website_id");

CREATE INDEX IF NOT EXISTS "storefront_blog_posts_organization_id_published_at_idx"
  ON "storefront_blog_posts" ("organization_id", "published_at");
