#!/bin/bash

# Folder output build
OUTPUT_DIR="./__build/release"
BIN_DIR="$OUTPUT_DIR/bin"
APP_NAME="server"
CONFIG_FILE="/app/conf/system.properties"

# Fungsi untuk menampilkan cara penggunaan
usage() {
    echo "Usage: $0 {windows|linux|mac}"
    exit 1
}

# Fungsi untuk menghapus file start script jika sudah ada
remove_existing_start_script() {
    local script_path="$1"
    if [ -f "$script_path" ]; then
        echo "Removing existing $script_path..."
        rm -f "$script_path"
    fi
}

# Fungsi untuk membuat file start.bat untuk Windows
create_start_script_windows() {
    local output_file_start="$BIN_DIR/start.bat"
    remove_existing_start_script "$output_file_start"
    echo "Creating start.bat for Windows..."
    cat > "$output_file_start" <<EOL
@echo off

:: Path ke file properties
set CONFIG_FILE=%~dp0\\__build\\conf\\system.properties

:: Mengecek apakah file properties ada
if exist "%CONFIG_FILE%" (
    echo Loading configuration from %CONFIG_FILE%...
    for /F "tokens=1,2 delims==" %%A in ('type "%CONFIG_FILE%" ^| findstr /R "^[^#]"') do (
        set %%A=%%B
    )
)

:: Log environment variables untuk debug (opsional)
echo Loaded environment variables:
set RMQ_

:: Menjalankan aplikasi
echo Starting application...
"%~dp0\\__build\\bin\\app.exe"
EOL
    echo "start.bat created successfully at $output_file_start"
}

# Fungsi untuk membuat file start.sh untuk Linux
create_start_script_linux() {
    local output_file_start="$OUTPUT_DIR/bin/start.sh"
    local output_file_stop="$OUTPUT_DIR/bin/stop.sh"
    remove_existing_start_script "$output_file_start"
    remove_existing_start_script "$output_file_stop"
    echo "Creating start.sh for Linux..."
    cat > "$output_file_start" <<EOL
#!/bin/bash

# Path ke file properties
CONFIG_FILE="$CONFIG_FILE"

# Mengecek apakah file properties ada
if [[ -f \$CONFIG_FILE ]]; then
  echo "Loading configuration from \$CONFIG_FILE..."

  # Membaca file properties dan mengeset environment variables jika belum ada
  while IFS='=' read -r key value; do
    [[ -z "\$key" || "\$key" =~ ^# ]] && continue
    key=\$(echo "\$key" | xargs)
    value=\$(echo "\$value" | xargs)
    [[ -z "\${!key}" ]] && export "\$key=\$value"
  done < "\$CONFIG_FILE"
fi

# Log environment variables untuk debug (opsional)
echo "Loaded environment variables:"
env | grep RMQ_

# Menjalankan aplikasi
echo "Starting application..."
$BIN_DIR/$APP_NAME
EOL

    chmod +x "$output_file_start"
    echo "start.sh created successfully at $output_file_start"

    echo "Creating stop.sh for Linux..."
    cat > "$output_file_stop" <<EOL
#!/bin/bash
echo "Stopping application..."
pkill -f "$BIN_DIR/$APP_NAME"

EOL
    chmod +x "$output_file_stop"
    echo "stop.sh created successfully at $output_file_stop"
}

# Fungsi untuk membuat file start.sh untuk macOS
create_start_script_mac() {
    create_start_script_linux
}

# Memeriksa apakah argumen disediakan
if [ -z "$1" ]; then
    echo "Error: Target OS not specified."
    usage
fi

# Menentukan nilai GOOS dan GOARCH berdasarkan argumen
case "$1" in
    windows)
        GOOS="windows"
        GOARCH="amd64"
        EXT=".exe"
        CREATE_SCRIPT_FUNC="create_start_script_windows"
        ;;
    linux)
        GOOS="linux"
        GOARCH="arm64"
        EXT=""
        CREATE_SCRIPT_FUNC="create_start_script_linux"
        ;;
    mac)
        GOOS="darwin"
        GOARCH="amd64"
        EXT=""
        CREATE_SCRIPT_FUNC="create_start_script_mac"
        ;;
    *)
        echo "Error: Unsupported target OS '$1'."
        usage
        ;;
esac

# Membuat folder output jika belum ada
mkdir -p "$OUTPUT_DIR"

# Menjalankan build
echo "Building for $1..."
OUTPUT_FILE_GENERATOR="$OUTPUT_DIR/bin/$APP_NAME$EXT"
echo "$OUTPUT_FILE_GENERATOR"
# shellcheck disable=SC2046
GOOS=$GOOS GOARCH=$GOARCH go build -o $OUTPUT_FILE_GENERATOR ./server.go

# Memeriksa hasil build
if [ $? -ne 0 ]; then
    echo "Build failed."
    exit 2
fi
chmod +x $OUTPUT_FILE_GENERATOR
echo "Build successful! Output: $OUTPUT_FILE_GENERATOR"

# Membuat start script menggunakan fungsi yang sesuai
#$CREATE_SCRIPT_FUNC