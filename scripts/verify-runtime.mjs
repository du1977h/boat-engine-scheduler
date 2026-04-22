import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const runtimeDir = resolve(rootDir, ".runtime", "standalone");

const allowedEntries = new Set([
  ".next",
  ".env",
  "config",
  "data",
  "node_modules",
  "package.json",
  "public",
  "server.js"
]);

const forbiddenEntries = new Set([".rtx"]);

if (!existsSync(runtimeDir)) {
  console.error(`runtime directory not found: ${runtimeDir}`);
  process.exit(1);
}

const entries = readdirSync(runtimeDir, { withFileTypes: true });
const unexpectedEntries = [];
const unexpectedExecutables = [];

for (const entry of entries) {
  if (forbiddenEntries.has(entry.name) || !allowedEntries.has(entry.name)) {
    unexpectedEntries.push(entry.name);
    continue;
  }

  const absolutePath = resolve(runtimeDir, entry.name);
  const stats = statSync(absolutePath);
  const isExecutableFile = stats.isFile() && (stats.mode & 0o111) !== 0;

  if (isExecutableFile && entry.name !== "server.js") {
    unexpectedExecutables.push(entry.name);
  }
}

if (unexpectedEntries.length > 0 || unexpectedExecutables.length > 0) {
  if (unexpectedEntries.length > 0) {
    console.error(
      `unexpected files found in runtime root: ${unexpectedEntries.sort().join(", ")}`
    );
  }

  if (unexpectedExecutables.length > 0) {
    console.error(
      `unexpected executable files found in runtime root: ${unexpectedExecutables.sort().join(", ")}`
    );
  }

  process.exit(1);
}

console.log(`runtime verification passed: ${runtimeDir}`);
