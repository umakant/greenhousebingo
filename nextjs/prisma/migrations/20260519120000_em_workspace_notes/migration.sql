CREATE TABLE IF NOT EXISTS "em_workspace_notes" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "body" TEXT NOT NULL,
    "created_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "em_workspace_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "em_workspace_notes_organization_id_created_at_idx"
    ON "em_workspace_notes"("organization_id", "created_at");

DO $$
BEGIN
  ALTER TABLE "em_workspace_notes"
    ADD CONSTRAINT "em_workspace_notes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "em_workspace_notes"
    ADD CONSTRAINT "em_workspace_notes_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
