-- AlterTable
ALTER TABLE `event_audit_logs` ADD COLUMN `event_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `event_audit_logs_organization_id_event_id_created_at_idx` ON `event_audit_logs`(`organization_id`, `event_id`, `created_at`);

-- AddForeignKey
ALTER TABLE `event_audit_logs` ADD CONSTRAINT `event_audit_logs_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `lms_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `event_operational_tasks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `event_id` BIGINT NOT NULL,
    `template_key` VARCHAR(64) NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `assigned_to_id` BIGINT NULL,
    `due_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `completed_by_id` BIGINT NULL,
    `notes` TEXT NULL,
    `is_custom` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `event_operational_tasks_event_id_template_key_key`(`event_id`, `template_key`),
    INDEX `event_operational_tasks_organization_id_event_id_status_idx`(`organization_id`, `event_id`, `status`),
    INDEX `event_operational_tasks_organization_id_event_id_category_idx`(`organization_id`, `event_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_alert_dismissals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `event_id` BIGINT NOT NULL,
    `alert_key` VARCHAR(128) NOT NULL,
    `dismissed_by_id` BIGINT NULL,
    `dismissed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `event_alert_dismissals_event_id_alert_key_key`(`event_id`, `alert_key`),
    INDEX `event_alert_dismissals_organization_id_event_id_idx`(`organization_id`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_operational_tasks` ADD CONSTRAINT `event_operational_tasks_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `event_operational_tasks` ADD CONSTRAINT `event_operational_tasks_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `lms_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `event_operational_tasks` ADD CONSTRAINT `event_operational_tasks_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `event_operational_tasks` ADD CONSTRAINT `event_operational_tasks_completed_by_id_fkey` FOREIGN KEY (`completed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `event_operational_tasks` ADD CONSTRAINT `event_operational_tasks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_alert_dismissals` ADD CONSTRAINT `event_alert_dismissals_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `event_alert_dismissals` ADD CONSTRAINT `event_alert_dismissals_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `lms_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `event_alert_dismissals` ADD CONSTRAINT `event_alert_dismissals_dismissed_by_id_fkey` FOREIGN KEY (`dismissed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
