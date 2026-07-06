-- LMS course support: link StTicket to course + lesson + student
ALTER TABLE "st_tickets" ADD COLUMN "lms_course_id" BIGINT;
ALTER TABLE "st_tickets" ADD COLUMN "lms_lesson_id" BIGINT;
ALTER TABLE "st_tickets" ADD COLUMN "lms_student_user_id" BIGINT;

CREATE INDEX "st_tickets_lms_course_id_idx" ON "st_tickets"("lms_course_id");
CREATE INDEX "st_tickets_lms_lesson_id_idx" ON "st_tickets"("lms_lesson_id");
CREATE INDEX "st_tickets_lms_student_user_id_idx" ON "st_tickets"("lms_student_user_id");

ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_lms_course_id_fkey" FOREIGN KEY ("lms_course_id") REFERENCES "lms_courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_lms_lesson_id_fkey" FOREIGN KEY ("lms_lesson_id") REFERENCES "lms_course_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "st_tickets" ADD CONSTRAINT "st_tickets_lms_student_user_id_fkey" FOREIGN KEY ("lms_student_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
