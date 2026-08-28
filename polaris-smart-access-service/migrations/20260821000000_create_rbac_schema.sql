-- migrate:up
-- ========================================
-- Polaris Smart Access Service - RBAC Schema
-- Source: Actual database schema from polaris_master (TiDB)
-- ========================================

-- ========================================
-- MASTER TABLES
-- ========================================

-- Permission Master (Feature-based for UI display)
CREATE TABLE `sa_m_permission` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Permission key (e.g., business-party:view)',
  `resource` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Resource domain (e.g., business-party)',
  `action` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Action type (e.g., view, edit, delete)',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `module` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Module grouping (optional)',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sa_m_permission_key` (`key`),
  KEY `idx_sa_m_permission_resource` (`resource`),
  KEY `idx_sa_m_permission_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Feature-based permissions for UI display only';

-- Role Master
CREATE TABLE `sa_m_role` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Role code (e.g., SUPER_ADMIN, SUPERVISOR)',
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'System role (cannot be deleted)',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / INACTIVE',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sa_m_role_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Role master — defines available roles in system';

-- Section Master
CREATE TABLE `sa_m_section` (
  `id` varchar(36) NOT NULL COMMENT 'UUID v7 (app-generated)',
  `code` varchar(32) NOT NULL COMMENT 'INBOUND, OUTBOUND, INVENTORY',
  `name` varchar(128) NOT NULL,
  `description` varchar(256) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
COMMENT='Operational sections — for section-level scoping';

-- User Master (Identity mapping to Keycloak)
CREATE TABLE `sa_m_user` (
  `id` varchar(36) NOT NULL COMMENT 'UUID v7 (app-generated)',
  `keycloak_id` varchar(64) NOT NULL COMMENT 'Keycloak subject (sub) — link to Keycloak identity',
  `username` varchar(128) NOT NULL COMMENT 'Username (synced from Keycloak) - IMMUTABLE',
  `email` varchar(256) DEFAULT NULL COMMENT 'Email address (synced from Keycloak)',
  `fullname` varchar(50) NOT NULL COMMENT 'Full name (synced from Keycloak)',
  `status` varchar(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / INACTIVE',
  `failed_login_count` int DEFAULT '0' COMMENT 'Failed login attempts counter',
  `locked_until` timestamp NULL DEFAULT NULL COMMENT 'Account lock expiry (brute-force protection)',
  `last_failed_login_at` timestamp NULL DEFAULT NULL COMMENT 'Last failed login timestamp',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_keycloak_id` (`keycloak_id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
COMMENT='User identity mapping to Keycloak IdP — credentials NOT stored here';

-- ========================================
-- RELATIONAL TABLES
-- ========================================

-- Role to API Endpoint Mapping (Actual authorization)
CREATE TABLE `sa_r_role_api` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID v7 (app-generated)',
  `role_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Role name (ref: sa_m_role.code)',
  `service_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Service name (e.g., polaris-master-data-service)',
  `http_method` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'HTTP method (POST, GET, PUT, DELETE)',
  `http_endpoint` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Endpoint path, supports wildcard (*)',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mapping description',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Active flag',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft delete flag',
  `created_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sa_r_role_api` (`role_name`,`service_name`,`http_method`,`http_endpoint`),
  KEY `idx_sa_r_role_api_role_name` (`role_name`),
  KEY `idx_sa_r_role_api_service_name` (`service_name`),
  KEY `idx_sa_r_role_api_endpoint` (`http_endpoint`),
  KEY `idx_sa_r_role_api_active_deleted` (`is_active`,`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Role to API endpoint mapping — actual authorization enforcement';

-- Role to Permission Mapping (UI display only)
CREATE TABLE `sa_r_role_permission` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sa_r_role_permission` (`role_id`,`permission_id`),
  KEY `idx_sa_r_role_permission_role` (`role_id`),
  KEY `idx_sa_r_role_permission_perm` (`permission_id`),
  CONSTRAINT `fk_sa_r_role_permission_role` FOREIGN KEY (`role_id`) REFERENCES `sa_m_role` (`id`),
  CONSTRAINT `fk_sa_r_role_permission_perm` FOREIGN KEY (`permission_id`) REFERENCES `sa_m_permission` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Role to permission mapping — UI display only, NOT used for API authorization';

-- User to Owner Mapping
CREATE TABLE `sa_r_user_owner` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL COMMENT 'ref: sa_m_user.id',
  `owner_id` varchar(36) NOT NULL COMMENT 'ref: md_m_business_party.id',
  `owner_code` varchar(64) NOT NULL COMMENT 'cache: owner code for display',
  `owner_name` varchar(255) NOT NULL COMMENT 'cache: owner name for display',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_owner` (`user_id`,`owner_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
COMMENT='User to owner access mapping — determines which owners user can access';

-- User to Role Mapping
CREATE TABLE `sa_r_user_role` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sa_r_user_role` (`user_id`,`role_id`),
  KEY `idx_sa_r_user_role_user` (`user_id`),
  KEY `idx_sa_r_user_role_role` (`role_id`),
  CONSTRAINT `fk_sa_r_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `sa_m_role` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User to role assignment — defines user roles';

-- User to Warehouse Mapping
CREATE TABLE `sa_r_user_warehouse` (
  `id` varchar(36) NOT NULL COMMENT 'UUID v7 (app-generated)',
  `user_id` varchar(36) NOT NULL COMMENT 'ref: sa_m_user.id',
  `warehouse_id` varchar(36) NOT NULL COMMENT 'ref: md_m_warehouse.id',
  `warehouse_code` varchar(32) NOT NULL COMMENT 'cache: warehouse code for display',
  `warehouse_name` varchar(128) NOT NULL COMMENT 'cache: warehouse name for display',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_warehouse` (`user_id`,`warehouse_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
COMMENT='User-to-warehouse access mapping — determines which warehouses user can login to';

-- ========================================
-- TRANSACTION TABLES
-- ========================================

-- Login Attempt Logging (Brute-force detection)
CREATE TABLE `sa_t_login_attempt` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `username` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT '0',
  `failure_reason` varchar(100) DEFAULT '',
  `attempted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempt_username_attempted` (`username`,`attempted_at`),
  KEY `idx_login_attempt_ip_attempted` (`ip_address`,`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
COMMENT='Login attempt logging for brute-force detection';

-- Login Event Audit
CREATE TABLE `sa_t_login_event` (
  `id` varchar(36) NOT NULL COMMENT 'UUID v7 (app-generated)',
  `keycloak_id` varchar(64) DEFAULT NULL COMMENT 'Keycloak subject (if identified)',
  `username` varchar(128) NOT NULL COMMENT 'Username from token claim',
  `ip_address` varchar(64) NOT NULL COMMENT 'Client IP',
  `event_type` varchar(16) NOT NULL COMMENT 'LOGIN / LOGOUT / TIMEOUT',
  `is_success` tinyint(1) NOT NULL COMMENT 'Event result (true = success)',
  `occurred_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Event timestamp (UTC)',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_keycloak_id` (`keycloak_id`),
  KEY `idx_username` (`username`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_occurred_at` (`occurred_at`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
COMMENT='Login event audit — LOGIN/LOGOUT/TIMEOUT (brute-force in Keycloak, this is local mirror)';

-- Session Metadata
CREATE TABLE `sa_t_session` (
  `id` varchar(36) NOT NULL COMMENT 'UUID v7 (app-generated) = session token id',
  `user_id` varchar(36) NOT NULL COMMENT 'UUID ref: sa_m_user.id',
  `warehouse_id` varchar(36) NOT NULL COMMENT 'UUID ref: md_m_warehouse.id (current context)',
  `owner_context_id` varchar(36) DEFAULT NULL COMMENT 'UUID ref: md_m_business_party.id (active owner scope, NULL = all)',
  `role_set` longtext NOT NULL COMMENT 'Array active role codes (resolved from smart-access)',
  `ip_address` varchar(64) NOT NULL COMMENT 'Client IP at login',
  `user_agent` varchar(512) DEFAULT NULL COMMENT 'Browser/client user agent',
  `status` varchar(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / EXPIRED / INVALIDATED',
  `last_activity_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'For sliding timeout',
  `expires_at` timestamp NOT NULL COMMENT 'Hard expiry (UTC)',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(128) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` varchar(128) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
COMMENT='Session metadata — token enforcement via Redis (polaris:session:{id})';

-- migrate:down

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS `sa_t_session`;
DROP TABLE IF EXISTS `sa_t_login_event`;
DROP TABLE IF EXISTS `sa_t_login_attempt`;
DROP TABLE IF EXISTS `sa_r_user_warehouse`;
DROP TABLE IF EXISTS `sa_r_user_role`;
DROP TABLE IF EXISTS `sa_r_user_owner`;
DROP TABLE IF EXISTS `sa_r_role_permission`;
DROP TABLE IF EXISTS `sa_r_role_api`;
DROP TABLE IF EXISTS `sa_m_user`;
DROP TABLE IF EXISTS `sa_m_section`;
DROP TABLE IF EXISTS `sa_m_role`;
DROP TABLE IF EXISTS `sa_m_permission`;
