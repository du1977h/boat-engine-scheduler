#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "作業ディレクトリ: $APP_DIR"
cd "$APP_DIR"

if [[ ! -f ".env" ]]; then
  cp .env.example .env
  echo ".env を .env.example から作成しました。必要に応じて値を編集してください。"
else
  echo ".env は既に存在するため、そのまま利用します。"
fi

echo "依存関係をインストールします..."
npm install

echo "Prisma Client を生成します..."
npx prisma generate

DATABASE_URL_VALUE="$(sed -n 's/^DATABASE_URL="\{0,1\}\(.*\)"\{0,1\}$/\1/p' .env | head -n 1)"

if [[ -z "$DATABASE_URL_VALUE" ]]; then
  echo "DATABASE_URL が .env に見つかりません。"
  exit 1
fi

DB_PATH=""
if [[ "$DATABASE_URL_VALUE" == file:./* ]]; then
  DB_PATH="$APP_DIR/${DATABASE_URL_VALUE#file:./}"
elif [[ "$DATABASE_URL_VALUE" == file:/* ]]; then
  DB_PATH="${DATABASE_URL_VALUE#file:}"
fi

if [[ -z "$DB_PATH" ]]; then
  echo "このスクリプトは SQLite の file: DATABASE_URL を前提にしています。現在の値: $DATABASE_URL_VALUE"
  exit 1
fi

mkdir -p "$(dirname "$DB_PATH")"

if [[ -f "$DB_PATH" ]]; then
  echo "SQLite ファイルは既に存在します: $DB_PATH"
  echo "初期化はスキップしました。完全にやり直したい場合は npm run db:reset を使ってください。"
else
  echo "DB を初期化します..."
  npm run db:init
fi

cat <<'EOF'

セットアップが完了しました。次の例で作業を始められます。

  npm run import:users -- public/samples/users.sample.csv
  npm run import:members -- public/samples/members.sample.csv
  npm run dev -- --hostname 0.0.0.0 --port 3100

EOF
