@echo off
REM Safe wrapper around dbmate for polaris-smart-access-service
REM Only allows: new, status, migrate (destructive commands rejected)

setlocal enabledelayedexpansion

set COMMAND=%1

if "%COMMAND%"=="" (
    echo ❌ Error: Command required
    echo Allowed commands: new, status, migrate
    echo.
    echo Usage:
    echo   dbmate.bat new migration_name
    echo   dbmate.bat status
    echo   dbmate.bat migrate
    exit /b 1
)

REM Validate command
if not "%COMMAND%"=="new" if not "%COMMAND%"=="status" if not "%COMMAND%"=="migrate" (
    echo ❌ Error: Command '%COMMAND%' not allowed
    echo Allowed commands: new, status, migrate
    exit /b 1
)

REM For status and migrate, require DATABASE_URL
if "%COMMAND%"=="status" goto check_db_url
if "%COMMAND%"=="migrate" goto check_db_url
goto execute_command

:check_db_url
if "%DATABASE_URL%"=="" (
    echo ❌ Error: DATABASE_URL not set
    echo.
    echo Example (DEV only, never commit):
    echo   set DATABASE_URL=mysql://username:password@localhost:3306/polaris_smart_access
    echo.
    echo Then run:
    echo   dbmate.bat %COMMAND%
    exit /b 1
)
echo ℹ️  Using DATABASE_URL: (hidden)
goto execute_command

:execute_command
if "%COMMAND%"=="new" (
    if "%2%"=="" (
        echo ❌ Error: Migration name required
        echo Usage: dbmate.bat new migration_name
        exit /b 1
    )
    echo Creating migration: %2%
    dbmate new %2%
    echo ✅ Migration created in migrations\ folder
    exit /b 0
)

if "%COMMAND%"=="status" (
    echo Checking migration status...
    dbmate status
    exit /b 0
)

if "%COMMAND%"=="migrate" (
    echo Running pending migrations...
    dbmate up
    echo ✅ Migrations completed
    exit /b 0
)
