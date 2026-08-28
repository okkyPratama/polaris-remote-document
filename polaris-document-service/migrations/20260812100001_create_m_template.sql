-- migrate:up
CREATE TABLE IF NOT EXISTS `m_template` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v7, app-generated',
    `template_code` VARCHAR(64) NOT NULL COMMENT 'Business code: system_default_grn, grn_unilever_v2',
    `name` VARCHAR(128) NOT NULL COMMENT 'Nama template (human-readable)',
    `template_type` VARCHAR(32) NOT NULL COMMENT 'GRN / GIN / LPN_LABEL / PUTAWAY_LABEL / SHIPMENT_LABEL / INVENTORY_REPORT',
    `output_format` VARCHAR(8) NOT NULL COMMENT 'PDF / EXCEL / ZPL',
    `description` VARCHAR(256) NULL COMMENT 'Deskripsi template',
    `template_content` LONGTEXT NOT NULL COMMENT 'Template source: JSON layout / HTML / ZPL raw',
    `version` INT NOT NULL DEFAULT 1 COMMENT 'Versi template — increment setiap upload baru',
    `page_settings_json` JSON NULL COMMENT 'Page settings: {sizeType, widthMm, heightMm, marginMm, orientation}',
    `is_system_default` BOOLEAN NOT NULL DEFAULT false COMMENT 'true = platform default (tidak bisa dihapus admin)',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT 'Active flag',
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_by` VARCHAR(128) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` VARCHAR(128) NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_by` VARCHAR(128) NULL,
    `deleted_at` TIMESTAMP NULL,
    UNIQUE KEY `uk_template_code` (`template_code`),
    INDEX `idx_m_template_type_active` (`template_type`, `is_active`),
    INDEX `idx_m_template_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- migrate:down
DROP TABLE IF EXISTS `m_template`;
