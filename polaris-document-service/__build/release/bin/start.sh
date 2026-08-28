#!/bin/sh

# Path ke file properties
CONFIG_FILE="/app/conf/system.properties"

# Mengecek apakah file properties ada
if [ -f "$CONFIG_FILE" ]; then
  echo "Loading configuration from $CONFIG_FILE..."

  # Membaca file properties dan mengeset environment variables jika belum ada
  while IFS='=' read -r key value; do
    # Lewati baris kosong atau komentar
    case "$key" in
      \#* | '') continue ;;
    esac
    key=$(echo "$key" | xargs)   # Trim spasi di sekitar key
    value=$(echo "$value" | xargs) # Trim spasi di sekitar value
    # Jika environment variable dengan nama key belum ada, set nilainya
    if [ -z "$(eval echo \$$key)" ]; then
      export "$key=$value"
    fi
  done < "$CONFIG_FILE"
fi

# Log environment variables untuk debug (opsional)
echo "Loaded environment variables:"
env | grep DB_

# Menjalankan aplikasi
echo "Starting application..."
/app/bin/server
