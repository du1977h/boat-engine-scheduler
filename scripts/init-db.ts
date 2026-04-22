import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$connect();
  const migrationPath = path.join(process.cwd(), "prisma/migrations/0001_init/migration.sql");
  const sql = await fs.readFile(migrationPath, "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(`${statement};`);
  }

  console.log("DB初期化が完了しました。");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
