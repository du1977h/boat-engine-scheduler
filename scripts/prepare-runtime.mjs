import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(process.cwd());
const buildDir = resolve(rootDir, ".next");
const standaloneDir = resolve(buildDir, "standalone");
const staticDir = resolve(buildDir, "static");
const publicDir = resolve(rootDir, "public");
const runtimeRoot = resolve(rootDir, ".runtime");
const runtimeDir = resolve(runtimeRoot, "standalone");
const runtimeStaticDir = resolve(runtimeDir, ".next", "static");
const runtimePublicDir = resolve(runtimeDir, "public");

if (!existsSync(standaloneDir)) {
  throw new Error("standalone ビルドが見つかりません。先に `next build` を実行してください。");
}

rmSync(runtimeDir, { recursive: true, force: true });
mkdirSync(runtimeStaticDir, { recursive: true });

cpSync(standaloneDir, runtimeDir, { recursive: true });

if (existsSync(staticDir)) {
  cpSync(staticDir, runtimeStaticDir, { recursive: true });
}

if (existsSync(publicDir)) {
  cpSync(publicDir, runtimePublicDir, { recursive: true });
}

console.log(`runtime prepared: ${runtimeDir}`);
