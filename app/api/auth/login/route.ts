import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { getConfiguredLoginUser } from "@/lib/login-users";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "入力内容が不正です。" }, { status: 400 });
    }

    const configuredUser = await getConfiguredLoginUser(parsed.data.loginId);
    if (!configuredUser || configuredUser.password !== parsed.data.password) {
      return NextResponse.json({ message: "ログインIDまたはパスワードが正しくありません。" }, { status: 401 });
    }

    const passwordHash = await hashPassword(configuredUser.password);
    const user = await prisma.user.upsert({
      where: {
        loginId: configuredUser.loginId
      },
      update: {
        displayName: configuredUser.displayName,
        role: configuredUser.role,
        passwordHash
      },
      create: {
        loginId: configuredUser.loginId,
        displayName: configuredUser.displayName,
        role: configuredUser.role,
        passwordHash
      }
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "ログイン処理に失敗しました。" }, { status: 500 });
  }
}
