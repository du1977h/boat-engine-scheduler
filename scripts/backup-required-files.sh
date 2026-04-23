#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${APP_ROOT}/.env"
DEFAULT_BACKUP_ROOT="${APP_ROOT}/backups"
BACKUP_ROOT="${1:-$DEFAULT_BACKUP_ROOT}"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_DIR="${BACKUP_ROOT%/}/backup-${TIMESTAMP}"

read_database_url() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo ".env が見つかりません: $ENV_FILE" >&2
    exit 1
  fi

  local database_url
  database_url="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | cut -d '=' -f 2-)"

  if [[ -z "$database_url" ]]; then
    echo "DATABASE_URL が .env に見つかりません。" >&2
    exit 1
  fi

  database_url="${database_url%\"}"
  database_url="${database_url#\"}"
  database_url="${database_url%\'}"
  database_url="${database_url#\'}"

  printf '%s\n' "$database_url"
}

resolve_database_path() {
  local database_url="$1"

  if [[ "$database_url" == file:./* ]]; then
    printf '%s/%s\n' "$APP_ROOT" "${database_url#file:./}"
    return 0
  fi

  if [[ "$database_url" == file:/* ]]; then
    printf '%s\n' "${database_url#file:}"
    return 0
  fi

  echo "このスクリプトは SQLite の file: DATABASE_URL のみ対応しています。現在の値: $database_url" >&2
  exit 1
}

copy_if_exists() {
  local source_path="$1"
  local destination_path="$2"

  if [[ -e "$source_path" ]]; then
    mkdir -p "$(dirname "$destination_path")"
    cp -a "$source_path" "$destination_path"
  fi
}

copy_tree_if_exists() {
  local source_path="$1"
  local destination_path="$2"

  if [[ -e "$source_path" ]]; then
    mkdir -p "$(dirname "$destination_path")"
    cp -a "$source_path" "$destination_path"
  fi
}

DATABASE_URL_VALUE="$(read_database_url)"
DATABASE_PATH="$(resolve_database_path "$DATABASE_URL_VALUE")"

if [[ ! -f "$DATABASE_PATH" ]]; then
  echo "SQLite ファイルが見つかりません: $DATABASE_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/app"

copy_if_exists "$ENV_FILE" "$BACKUP_DIR/app/.env"
copy_if_exists "${APP_ROOT}/.env.example" "$BACKUP_DIR/app/.env.example"
copy_if_exists "$DATABASE_PATH" "$BACKUP_DIR/app/data/$(basename "$DATABASE_PATH")"
copy_tree_if_exists "${APP_ROOT}/deploy" "$BACKUP_DIR/app/deploy"
copy_tree_if_exists "${APP_ROOT}/prisma" "$BACKUP_DIR/app/prisma"
copy_tree_if_exists "${APP_ROOT}/private-imports" "$BACKUP_DIR/app/private-imports"
copy_tree_if_exists "${APP_ROOT}/public/samples" "$BACKUP_DIR/app/public/samples"
copy_if_exists "${APP_ROOT}/package.json" "$BACKUP_DIR/app/package.json"
copy_if_exists "${APP_ROOT}/package-lock.json" "$BACKUP_DIR/app/package-lock.json"
copy_if_exists "${APP_ROOT}/README.md" "$BACKUP_DIR/app/README.md"

cat >"$BACKUP_DIR/backup-info.txt" <<EOF
backup_created_at=$(date '+%Y-%m-%d %H:%M:%S %Z')
app_root=$APP_ROOT
database_url=$DATABASE_URL_VALUE
database_path=$DATABASE_PATH
backup_dir=$BACKUP_DIR
included_files=.env,.env.example,data/$(basename "$DATABASE_PATH"),deploy/,prisma/,private-imports/,public/samples/,package.json,package-lock.json,README.md
note=稼働中に取得した場合は SQLite の瞬間整合性が弱くなるため、可能なら systemd 停止中に取得してください。
EOF

echo "バックアップを作成しました: $BACKUP_DIR"
echo "含めた主なファイル:"
echo "  - .env"
echo "  - $(basename "$DATABASE_PATH")"
echo "  - deploy/"
echo "  - prisma/"
echo "  - private-imports/"
echo "  - public/samples/"
echo "  - package.json / package-lock.json / README.md"
echo
echo "推奨:"
echo "  sudo systemctl stop boat-engine-scheduler"
echo "  npm run backup:create -- /path/to/backup-root"
echo "  sudo systemctl start boat-engine-scheduler"
