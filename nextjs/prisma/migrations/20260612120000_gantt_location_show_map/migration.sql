ALTER TABLE "gantt_project_locations"
ADD COLUMN IF NOT EXISTS "show_location_map" BOOLEAN NOT NULL DEFAULT false;
