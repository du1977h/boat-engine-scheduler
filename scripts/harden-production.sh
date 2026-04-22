#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${1:-/var/www/boat-engine-scheduler}"
SERVICE_USER="${2:-boat}"
SERVICE_GROUP="${3:-boat}"

if [[ ! -d "$APP_ROOT" ]]; then
  echo "app root not found: $APP_ROOT" >&2
  exit 1
fi

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "service user not found: $SERVICE_USER" >&2
  exit 1
fi

if ! getent group "$SERVICE_GROUP" >/dev/null 2>&1; then
  echo "service group not found: $SERVICE_GROUP" >&2
  exit 1
fi

install -d -m 0750 -o root -g "$SERVICE_GROUP" "$APP_ROOT"
install -d -m 0770 -o "$SERVICE_USER" -g "$SERVICE_GROUP" "$APP_ROOT/data"

chown -R root:"$SERVICE_GROUP" "$APP_ROOT"
chown -R "$SERVICE_USER":"$SERVICE_GROUP" "$APP_ROOT/data"

find "$APP_ROOT" -path "$APP_ROOT/data" -prune -o -type d -exec chmod 0750 {} +
find "$APP_ROOT" -path "$APP_ROOT/data" -prune -o -type f -exec chmod 0640 {} +

if [[ -f "$APP_ROOT/.env" ]]; then
  chown root:"$SERVICE_GROUP" "$APP_ROOT/.env"
  chmod 0640 "$APP_ROOT/.env"
fi

if [[ -f "$APP_ROOT/.runtime/standalone/.rtx" ]]; then
  chmod 000 "$APP_ROOT/.runtime/standalone/.rtx"
fi

find "$APP_ROOT/data" -type d -exec chmod 0770 {} +
find "$APP_ROOT/data" -type f -exec chmod 0660 {} +

echo "production permissions hardened:"
echo "  app root: $APP_ROOT"
echo "  service user: $SERVICE_USER"
echo "  service group: $SERVICE_GROUP"
