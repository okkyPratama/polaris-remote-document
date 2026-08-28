@echo off
setlocal enabledelayedexpansion

REM Path ke file properties
set CONFIG_FILE="__build\dev\config\system.properties"

REM Mengecek apakah file properties ada
if exist "%CONFIG_FILE%" (
    echo Loading configuration from %CONFIG_FILE%...

    REM Membaca file properties dan mengeset environment variables
    for /f "tokens=1,* delims==" %%A in ('type "%CONFIG_FILE%" ^| findstr /v "^#"' ) do (
        set "key=%%A"
        set "value=%%B"
        REM Menghapus spasi di awal/akhir
        for /f "tokens=* delims= " %%i in ("!key!") do set "key=%%i"
        for /f "tokens=* delims= " %%i in ("!value!") do set "value=%%i"

        set "key=!key: =!"
        set "value=!value: =!"
        set "!key!=!value!"

        REM Debug key & value yang disimpan pada environment variable (optional)
        REM echo Setting !key! to !value!
    )
    echo Finish loading configuration from %CONFIG_FILE%...
) else (
     echo Debug: %CONFIG_FILE% does not exist
)

air
