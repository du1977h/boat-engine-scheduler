import { ImportType, Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { textNoStore } from "@/lib/http";
import { memberCsvRowSchema, normalizeUserRole, userCsvRowSchema } from "@/lib/validations";

type ImportResult = {
  success: boolean;
  message: string;
  rowCount: number;
};

function parseCsv<T>(csvText: string) {
  return parse(csvText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as T[];
}

export async function importMembersCsv(csvText: string, fileName: string, executedByUserId?: number): Promise<ImportResult> {
  try {
    const rows = parseCsv<{ name?: string; 氏名?: string }>(csvText);
    if (rows.length === 0) {
      throw new Error("CSVにデータ行がありません。");
    }

    const normalized = rows.map((row, index) => {
      const name = row.name ?? row["氏名"];
      const parsed = memberCsvRowSchema.safeParse({ name });
      if (!parsed.success) {
        throw new Error(`${index + 2}行目: 氏名が空欄です。`);
      }
      return parsed.data;
    });

    const names = normalized.map((row) => row.name);
    const duplicated = names.find((name, index) => names.indexOf(name) !== index);
    if (duplicated) {
      throw new Error(`部員CSVに重複した氏名があります: ${duplicated}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.member.updateMany({
        data: {
          isActive: false
        }
      });

      for (const row of normalized) {
        await tx.member.upsert({
          where: { name: row.name },
          update: { isActive: true },
          create: { name: row.name, isActive: true }
        });
      }

      await tx.importHistory.create({
        data: {
          importType: ImportType.MEMBERS,
          fileName,
          rowCount: normalized.length,
          success: true,
          executedByUserId
        }
      });
    });

    return {
      success: true,
      message: `${normalized.length}件の部員を取り込みました。CSVに存在しない既存部員は無効化しました。`,
      rowCount: normalized.length
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "部員CSVの取り込みに失敗しました。";
    await prisma.importHistory.create({
      data: {
        importType: ImportType.MEMBERS,
        fileName,
        rowCount: 0,
        success: false,
        errorSummary: message,
        executedByUserId
      }
    });
    return {
      success: false,
      message,
      rowCount: 0
    };
  }
}

export async function importUsersCsv(csvText: string, fileName: string, executedByUserId?: number): Promise<ImportResult> {
  try {
    const rows = parseCsv<Record<string, string>>(csvText);
    if (rows.length === 0) {
      throw new Error("CSVにデータ行がありません。");
    }

    const normalized = rows.map((row, index) => {
      const parsed = userCsvRowSchema.safeParse(row);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new Error(`${index + 2}行目: ${issue.path.join(".") || "列"} が不正です。`);
      }
      return parsed.data;
    });

    const loginIds = normalized.map((row) => row.login_id);
    const duplicated = loginIds.find((loginId, index) => loginIds.indexOf(loginId) !== index);
    if (duplicated) {
      throw new Error(`ユーザーCSVに重複したlogin_idがあります: ${duplicated}`);
    }

    await prisma.$transaction(async (tx) => {
      for (const row of normalized) {
        const hashed = await hashPassword(row.password);
        await tx.user.upsert({
          where: { loginId: row.login_id },
          update: {
            passwordHash: hashed,
            displayName: row.display_name,
            role: normalizeUserRole(row.role)
          },
          create: {
            loginId: row.login_id,
            passwordHash: hashed,
            displayName: row.display_name,
            role: normalizeUserRole(row.role)
          }
        });
      }

      await tx.importHistory.create({
        data: {
          importType: ImportType.USERS,
          fileName,
          rowCount: normalized.length,
          success: true,
          executedByUserId
        }
      });
    });

    return {
      success: true,
      message: `${normalized.length}件のユーザーを追加・更新しました。`,
      rowCount: normalized.length
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ユーザーCSVの取り込みに失敗しました。";
    await prisma.importHistory.create({
      data: {
        importType: ImportType.USERS,
        fileName,
        rowCount: 0,
        success: false,
        errorSummary: message,
        executedByUserId
      }
    });
    return {
      success: false,
      message,
      rowCount: 0
    };
  }
}

export function csvTextResponse(fileName: string, csvText: string) {
  return textNoStore(csvText, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`
    }
  });
}
