-- AlterTable
ALTER TABLE `lms_event_registrations` ADD COLUMN `registration_source` VARCHAR(64) NULL,
    ADD COLUMN `source_name` VARCHAR(255) NULL,
    ADD COLUMN `campaign_id` VARCHAR(128) NULL,
    ADD COLUMN `affiliate_partner_id` BIGINT NULL,
    ADD COLUMN `affiliate_link_id` BIGINT NULL,
    ADD COLUMN `referral_code` VARCHAR(64) NULL,
    ADD COLUMN `coupon_id` BIGINT NULL,
    ADD COLUMN `coupon_code` VARCHAR(64) NULL,
    ADD COLUMN `utm_source` VARCHAR(128) NULL,
    ADD COLUMN `utm_medium` VARCHAR(128) NULL,
    ADD COLUMN `utm_campaign` VARCHAR(128) NULL,
    ADD COLUMN `utm_content` VARCHAR(128) NULL,
    ADD COLUMN `utm_term` VARCHAR(128) NULL,
    ADD COLUMN `landing_page` VARCHAR(512) NULL,
    ADD COLUMN `first_touch_at` DATETIME(3) NULL,
    ADD COLUMN `last_touch_at` DATETIME(3) NULL,
    ADD COLUMN `attribution_metadata` JSON NULL;

-- CreateIndex
CREATE INDEX `lms_event_registrations_organization_id_event_id_registration_source_idx` ON `lms_event_registrations`(`organization_id`, `event_id`, `registration_source`);

-- CreateIndex
CREATE INDEX `lms_event_registrations_organization_id_event_id_utm_campaign_idx` ON `lms_event_registrations`(`organization_id`, `event_id`, `utm_campaign`);

-- CreateIndex
CREATE INDEX `lms_event_registrations_affiliate_partner_id_idx` ON `lms_event_registrations`(`affiliate_partner_id`);

-- AddForeignKey
ALTER TABLE `lms_event_registrations` ADD CONSTRAINT `lms_event_registrations_affiliate_partner_id_fkey` FOREIGN KEY (`affiliate_partner_id`) REFERENCES `affiliate_partners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lms_event_registrations` ADD CONSTRAINT `lms_event_registrations_affiliate_link_id_fkey` FOREIGN KEY (`affiliate_link_id`) REFERENCES `affiliate_links`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `affiliate_commissions` ADD COLUMN `event_id` BIGINT NULL,
    ADD COLUMN `registration_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `affiliate_commissions_organization_id_event_id_idx` ON `affiliate_commissions`(`organization_id`, `event_id`);
