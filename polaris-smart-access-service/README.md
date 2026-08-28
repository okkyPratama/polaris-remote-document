# Polaris Smart Access Service

Smart Access is a comprehensive API-based solution for managing access control to pages and menus. This project provides a secure and efficient way to register users and configure their access permissions.

## Features
- **Expose Grpc Server (port: 28080)**:
    - Search Service : bitbucket.org.log_tech.polaris_smart_access_service.SearchService
      - Method: 
        - searchFlexParam
        - searchEmployee
        - searchRole
        - searchPermission
        - searchUserRole
        - searchRolePermission
        - searchRoleApiService
    
    - Client Example : [see code from test folder](https://bitbucket.org/log-tech/polaris-smart-access-service/src/main/test/grpc_client_search_test.go)
    

- **Expose Rest Server (port: 8080)**:
  - Rest API Documentation
    - **[Config](APIDocConfig.md)**
    - **[Role](APIDocRole.md)**
    - **[Permission](APIDocPermission.md)**
    - **[User Role](APIDocUserRole.md)**
    - **[Role APIs](APIDocRoleApi.md)**
    - **[Role Permission](APIDocRolePermission.md)**
    - **[Flex Param](APIDocFlexParam.md)**
    - **[Employee](APIDocEmployee.md)**

## Build With

This project is built using Go 1.23 and integrates several powerful libraries to enhance functionality:

- **helper-go**:
  - [helper-go v1.1.1](https://bitbucket.org/log-tech/helper-go) - helper for create grpc server, rest server, redis client
  

- **air-verse/air**:
    - [air-verse/air v1.61.5](https://github.com/air-verse/air) - Auto reload and build for development mode


## Getting Started

### Prerequisites
Requires Go version 1.23 or above.

### For Development

Create Database and Table:
```mysql
CREATE TABLE `sa_m_config` (
  `cfg_key` varchar(100) NOT NULL,
  `cfg_value` longtext NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(100) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` varchar(100) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`cfg_key`),
  KEY `sa_m_config_is_active_IDX` (`is_active`) USING BTREE,
  KEY `sa_m_config_deleted_by_IDX` (`deleted_by`) USING BTREE,
  KEY `sa_m_config_deleted_at_IDX` (`deleted_at`) USING BTREE,
  KEY `sa_m_config_created_by_IDX` (`created_by`) USING BTREE,
  KEY `sa_m_config_created_at_IDX` (`created_at`) USING BTREE,
  KEY `sa_m_config_updated_by_IDX` (`updated_by`) USING BTREE,
  KEY `sa_m_config_updated_at_IDX` (`updated_at`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
