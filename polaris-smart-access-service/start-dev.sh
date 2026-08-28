#!/bin/bash

# Path ke file properties
CONFIG_FILE="./__build/dev/conf/system.properties"

# Mengecek apakah file properties ada
if [[ -f $CONFIG_FILE ]]; then
  echo "Loading configuration from $CONFIG_FILE..."

  # Membaca file properties dan mengeset environment variables
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    export "$key=$value"
  done < "$CONFIG_FILE"
fi

# Log environment variables untuk debug (opsional)
echo "Loaded environment variables:"
env | grep APP_
env | grep DB_

# Menjalankan proyek Go
#echo "Starting dev server..."
#go run server.go
air