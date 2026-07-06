CREATE TABLE IF NOT EXISTS "project_missions" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "mission_number" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "project_missions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "project_missions_project_id_idx" ON "project_missions"("project_id");
CREATE INDEX IF NOT EXISTS "project_missions_status_idx" ON "project_missions"("status");
