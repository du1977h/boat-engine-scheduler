import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";

function resolveSqlitePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("db:reset は SQLite の file: DATABASE_URL 専用です。");
  }

  const rawPath = databaseUrl.slice("file:".length);
  if (!rawPath) {
    throw new Error("DATABASE_URL の SQLite パスが不正です。");
  }

  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), "prisma", rawPath);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL が設定されていません。");
  }

  const dbPath = resolveSqlitePath(databaseUrl);

  await prisma.$disconnect();
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-journal`, { force: true });

  console.log(`DBを削除しました: ${dbPath}`);
  console.log("続けて npm run db:init を実行してください。");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
