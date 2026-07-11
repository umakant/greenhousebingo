-- CreateTable
CREATE TABLE `event_host_performance_notes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `event_id` BIGINT NOT NULL,
    `host_id` BIGINT NOT NULL,
    `note` TEXT NOT NULL,
    `created_by_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_host_performance_notes_organization_id_event_id_host_id_idx`(`organization_id`, `event_id`, `host_id`),
    INDEX `event_host_performance_notes_organization_id_host_id_idx`(`organization_id`, `host_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_host_performance_notes` ADD CONSTRAINT `event_host_performance_notes_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_host_performance_notes` ADD CONSTRAINT `event_host_performance_notes_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `lms_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_host_performance_notes` ADD CONSTRAINT `event_host_performance_notes_host_id_fkey` FOREIGN KEY (`host_id`) REFERENCES `event_hosts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_host_performance_notes` ADD CONSTRAINT `event_host_performance_notes_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
