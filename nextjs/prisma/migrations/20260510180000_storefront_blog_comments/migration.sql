-- Storefront blog reader comments (moderated).

CREATE TABLE "storefront_blog_comments" (
    "id" BIGSERIAL NOT NULL,
    "blog_post_id" BIGINT NOT NULL,
    "author_name" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storefront_blog_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "storefront_blog_comments_blog_post_id_status_idx" ON "storefront_blog_comments"("blog_post_id", "status");

CREATE INDEX "storefront_blog_comments_blog_post_id_created_at_idx" ON "storefront_blog_comments"("blog_post_id", "created_at");

ALTER TABLE "storefront_blog_comments" ADD CONSTRAINT "storefront_blog_comments_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "storefront_blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
