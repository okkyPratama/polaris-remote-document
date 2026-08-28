#!/bin/bash

# Load .env file first
if [[ -f .env ]]; then
  echo "Loading configuration from .env..."
  set -a
  source .env
  set +a
fi

# Path ke file properties
CONFIG_FILE="./__build/dev/config/system.properties"

# Mengecek apakah file properties ada dan load dengan set -a
if [[ -f $CONFIG_FILE ]]; then
  echo "Loading configuration from $CONFIG_FILE..."
  set -a
  source <(cat "$CONFIG_FILE" | sed 's/\r$//')
  set +a
fi

# Menjalankan proyek Go
air
