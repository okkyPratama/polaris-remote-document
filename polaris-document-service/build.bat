@echo off
REM Folder output build
set OUTPUT_DIR=__build\release
set BIN_DIR=%OUTPUT_DIR%\bin
set APP_NAME=app
set CONFIG_FILE=\app\conf\system.properties

REM Fungsi untuk menampilkan cara penggunaan
:usage
echo Usage: %0 {windows|linux|mac}
exit /b 1

REM Fungsi untuk menghapus file start script jika sudah ada
:remove_existing_start_script
set SCRIPT_PATH=%1
if exist "%SCRIPT_PATH%" (
    echo Removing existing %SCRIPT_PATH%...
    del /f /q "%SCRIPT_PATH%"
)
exit /b

REM Fungsi untuk membuat file start.bat untuk Windows
:create_start_script_windows
set OUTPUT_FILE_START=%BIN_DIR%\start.bat
call :remove_existing_start_script "%OUTPUT_FILE_START%"
echo Creating start.bat for Windows...
(
echo @echo off
echo.
echo :: Path ke file properties
echo set CONFIG_FILE=%%~dp0\__build\conf\system.properties
echo.
echo :: Mengecek apakah file properties ada
echo if exist "%%CONFIG_FILE%%" (
echo     echo Loading configuration from %%CONFIG_FILE%%...
echo     for /F "tokens=1,2 delims==" %%A in ('type "%%CONFIG_FILE%%" ^| findstr /R "^[^#]"') do (
echo         set %%A=%%B
echo     )
echo )
echo.
echo :: Log environment variables untuk debug (opsional)
echo echo Loaded environment variables:
echo set RMQ_
echo.
echo :: Menjalankan aplikasi
echo echo Starting application...
echo "%%~dp0\__build\bin\app.exe"
) > "%OUTPUT_FILE_START%"
echo start.bat created successfully at %OUTPUT_FILE_START%
exit /b

REM Fungsi untuk membuat file start.sh untuk Linux
:create_start_script_linux
set OUTPUT_FILE_START=%OUTPUT_DIR%\bin\start.sh
set OUTPUT_FILE_STOP=%OUTPUT_DIR%\bin\stop.sh
call :remove_existing_start_script "%OUTPUT_FILE_START%"
call :remove_existing_start_script "%OUTPUT_FILE_STOP%"
echo Creating start.sh for Linux...
(
echo #!/bin/bash
echo.
echo # Path ke file properties
echo CONFIG_FILE="%CONFIG_FILE%"
echo.
echo # Mengecek apakah file properties ada
echo if [[ -f $CONFIG_FILE ]]; then
echo   echo "Loading configuration from $CONFIG_FILE..."
echo.
echo   # Membaca file properties dan mengeset environment variables jika belum ada
echo   while IFS='=' read -r key value; do
echo     [[ -z "$key" || "$key" =~ ^# ]] && continue
echo     key=$(echo "$key" | xargs)
echo     value=$(echo "$value" | xargs)
echo     [[ -z "${!key}" ]] && export "$key=$value"
echo   done < "$CONFIG_FILE"
echo fi
echo.
echo # Log environment variables untuk debug (opsional)
echo echo "Loaded environment variables:"
echo env | grep RMQ_
echo.
echo # Menjalankan aplikasi
echo echo "Starting application..."
echo $BIN_DIR/$APP_NAME
) > "%OUTPUT_FILE_START%"
echo start.sh created successfully at %OUTPUT_FILE_START%
echo Creating stop.sh for Linux...
(
echo #!/bin/bash
echo echo "Stopping application..."
echo pkill -f "$BIN_DIR/$APP_NAME"
) > "%OUTPUT_FILE_STOP%"
echo stop.sh created successfully at %OUTPUT_FILE_STOP%
exit /b

REM Fungsi untuk membuat file start.sh untuk macOS
:create_start_script_mac
call :create_start_script_linux
exit /b

REM Memeriksa apakah argumen disediakan
if "%~1"=="" (
    echo Error: Target OS not specified.
    call :usage
)

REM Menentukan nilai GOOS dan GOARCH berdasarkan argumen
set GOOS=
set GOARCH=
set EXT=
set CREATE_SCRIPT_FUNC=
if "%~1"=="windows" (
    set GOOS=windows
    set GOARCH=amd64
    set EXT=.exe
    set CREATE_SCRIPT_FUNC=create_start_script_windows
) else if "%~1"=="linux" (
    set GOOS=linux
    set GOARCH=amd64
    set EXT=
    set CREATE_SCRIPT_FUNC=create_start_script_linux
) else if "%~1"=="mac" (
    set GOOS=darwin
    set GOARCH=amd64
    set EXT=
    set CREATE_SCRIPT_FUNC=create_start_script_mac
) else (
    echo Error: Unsupported target OS '%~1'.
    call :usage
)

REM Membuat folder output jika belum ada
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
)

REM Menjalankan build
echo Building for %1...
set OUTPUT_FILE_GENERATOR=%OUTPUT_DIR%\bin\%APP_NAME%%EXT%
REM Menjalankan build Go
set GOOS=%GOOS% GOARCH=%GOARCH% go build %OUTPUT_FILE_GENERATOR%

REM Memeriksa hasil build
if %ERRORLEVEL% neq 0 (
    echo Build failed.
    exit /b 2
)

echo Build successful! Output: %OUTPUT_FILE_GENERATOR%

REM Membuat start script menggunakan fungsi yang sesuai
call %CREATE_SCRIPT_FUNC%