import { promises as fs } from "fs";
import path from "path";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const configuredLoginUsersSchema = z.record(
  z.object({
    password: z.string().min(1, "password は必須です。"),
    displayName: z.string().min(1, "displayName は必須です。"),
    role: z.union([z.literal("ADMIN"), z.literal("GENERAL"), z.literal("管理者"), z.literal("一般")]).optional()
  })
);

function normalizeRole(role: string | undefined, loginId: string): UserRole {
  if (role === "ADMIN" || role === "管理者") {
    return "ADMIN";
  }

  if (role === "GENERAL" || role === "一般") {
    return "GENERAL";
  }

  return loginId === "admin" ? "ADMIN" : "GENERAL";
}

async function readConfiguredLoginUsersFile() {
  const filePath = path.join(process.cwd(), "config", "login-users.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return configuredLoginUsersSchema.parse(parsed);
}

export async function getConfiguredLoginUser(loginId: string) {
  const users = await readConfiguredLoginUsersFile();
  const entry = users[loginId];

  if (!entry) {
    return null;
  }

  return {
    loginId,
    password: entry.password,
    displayName: entry.displayName,
    role: normalizeRole(entry.role, loginId)
  };
}
