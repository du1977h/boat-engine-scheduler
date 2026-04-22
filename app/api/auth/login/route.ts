import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { applyRateLimit, getRequestClientIp, SecurityError, verifySameOriginRequest } from "@/lib/security";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    await verifySameOriginRequest(request);
    const payload = await request.json();
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonNoStore({ message: parsed.error.issues[0]?.message ?? "入力内容が不正です。" }, { status: 400 });
    }

    const clientIp = await getRequestClientIp();
    const ipLimit = applyRateLimit({
      key: `login-ip:${clientIp}`,
      limit: 10,
      windowMs: 15 * 60 * 1000
    });
    const loginIdLimit = applyRateLimit({
      key: `login-id:${parsed.data.loginId.toLowerCase()}`,
      limit: 5,
      windowMs: 15 * 60 * 1000
    });

    if (!ipLimit.allowed || !loginIdLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, loginIdLimit.retryAfterSeconds);
      return jsonNoStore(
        { message: `ログイン試行回数が上限に達しました。${retryAfter}秒ほど待ってから再度お試しください。` },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter)
          }
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        loginId: parsed.data.loginId
      }
    });

    const verified = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !verified) {
      return jsonNoStore({ message: "ログインIDまたはパスワードが正しくありません。" }, { status: 401 });
    }

    await createSession(user.id);
    return jsonNoStore({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonNoStore({ message: "入力内容が不正です。" }, { status: 400 });
    }
    if (error instanceof SecurityError) {
      return jsonNoStore({ message: error.message }, { status: 403 });
    }
    return jsonNoStore({ message: "ログイン処理に失敗しました。" }, { status: 500 });
  }
}
