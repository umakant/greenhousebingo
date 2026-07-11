-- CreateTable
CREATE TABLE `event_live_incidents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `event_id` BIGINT NOT NULL,
    `category` VARCHAR(64) NOT NULL,
    `description` TEXT NOT NULL,
    `severity` VARCHAR(32) NOT NULL DEFAULT 'info',
    `registration_id` BIGINT NULL,
    `follow_up_status` VARCHAR(32) NOT NULL DEFAULT 'open',
    `reported_by_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `event_live_incidents_organization_id_event_id_created_at_idx`(`organization_id`, `event_id`, `created_at`),
    INDEX `event_live_incidents_organization_id_event_id_follow_up_status_idx`(`organization_id`, `event_id`, `follow_up_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_live_incidents` ADD CONSTRAINT `event_live_incidents_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `event_live_incidents` ADD CONSTRAINT `event_live_incidents_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `lms_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `event_live_incidents` ADD CONSTRAINT `event_live_incidents_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `lms_event_registrations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `event_live_incidents` ADD CONSTRAINT `event_live_incidents_reported_by_id_fkey` FOREIGN KEY (`reported_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
