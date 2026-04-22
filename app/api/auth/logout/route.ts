import { destroySession } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { SecurityError, verifySameOriginRequest } from "@/lib/security";

export async function POST(request: Request) {
  try {
    await verifySameOriginRequest(request);
    await destroySession();
    return jsonNoStore({ ok: true });
  } catch (error) {
    if (error instanceof SecurityError) {
      return jsonNoStore({ message: error.message }, { status: 403 });
    }
    return jsonNoStore({ message: "ログアウト処理に失敗しました。" }, { status: 500 });
  }
}
