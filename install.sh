#!/bin/bash

set -e

# read from .env
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$DIR/.env" ]; then
  export $(grep -v '^#' "$DIR/.env" | xargs)
fi

echo "Installing system dependencies..."
sudo apt update
sudo apt install -y postgresql postgresql-contrib

echo "Starting PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi
sudo systemctl enable postgresql
echo "PostgreSQL up and running"

echo "Creating database..."

sudo -u postgres psql <<EOF
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = '${DB_NAME}'
)\gexec
EOF

echo "Creating database user..."

sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles 
    WHERE rolname = '${DB_USER}'
  ) THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END \$\$;
EOF

echo "Database ready"

echo "Installing Python dependencies..."

pip install -r "$DIR/requirements.txt"

echo "Python dependencies installed."

echo "Installing Node.js dependencies..."

cd "$DIR/src/playwright"
npm install

echo "Node.js dependencies installed."

echo "Installation completed successfully."