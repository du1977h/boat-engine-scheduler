import { UserRole } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  loginId: z.string().min(1, "ログインIDを入力してください。"),
  password: z.string().min(1, "パスワードを入力してください。")
});

export const scheduleUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が不正です。"),
  itemType: z.enum(["BOAT", "ENGINE"]),
  roleType: z.enum(["STORAGE", "GO", "RETURN"]),
  memberId: z.number().int().positive().nullable()
});

export const userCsvRowSchema = z.object({
  login_id: z.string().min(1),
  password: z.string().min(1),
  display_name: z.string().min(1),
  role: z.enum(["管理者", "一般"])
});

export const memberCsvRowSchema = z.object({
  name: z.string().min(1)
});

export function normalizeUserRole(role: "管理者" | "一般"): UserRole {
  return role === "管理者" ? "ADMIN" : "GENERAL";
}
