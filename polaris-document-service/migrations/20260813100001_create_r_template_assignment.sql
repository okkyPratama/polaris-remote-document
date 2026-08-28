-- migrate:up
CREATE TABLE IF NOT EXISTS `r_template_assignment` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID v7, app-generated',
    `company_id` VARCHAR(36) NULL COMMENT 'UUID ref: md_m_company.id — NULL jika bukan assignment per company',
    `warehouse_id` VARCHAR(36) NULL COMMENT 'UUID ref: md_m_warehouse.id — NULL jika bukan assignment per warehouse',
    `owner_id` VARCHAR(36) NULL COMMENT 'UUID ref: md_m_business_party.id — NULL jika bukan assignment per owner',
    `template_type` VARCHAR(32) NOT NULL COMMENT 'Same enum as m_template.template_type',
    `template_id` VARCHAR(36) NOT NULL COMMENT 'UUID ref: m_template.id',
    `effective_from` DATE NOT NULL DEFAULT (CURRENT_DATE) COMMENT 'Tanggal mulai berlaku',
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_by` VARCHAR(128) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_by` VARCHAR(128) NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_by` VARCHAR(128) NULL,
    `deleted_at` TIMESTAMP NULL,
    UNIQUE KEY `uk_assignment_scope` (`company_id`, `warehouse_id`, `owner_id`, `template_type`, `effective_from`),
    INDEX `idx_assignment_owner_type` (`owner_id`, `template_type`),
    INDEX `idx_assignment_warehouse_type` (`warehouse_id`, `template_type`),
    INDEX `idx_assignment_company_type` (`company_id`, `template_type`),
    INDEX `idx_assignment_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- migrate:down
DROP TABLE IF EXISTS `r_template_assignment`;
