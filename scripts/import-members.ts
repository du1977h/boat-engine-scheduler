import fs from "fs/promises";
import { importMembersCsv } from "../lib/csv";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("使い方: npm run import:members -- public/samples/members.sample.csv");
  }
  const text = await fs.readFile(filePath, "utf8");
  const result = await importMembersCsv(text, filePath);
  console.log(result.message);
  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
