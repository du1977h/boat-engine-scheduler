import { requireApiUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { getDaySchedule, updateAssignment } from "@/lib/schedule";
import { SecurityError, verifySameOriginRequest } from "@/lib/security";
import { scheduleUpdateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return jsonNoStore({ message: "ログインしてください。" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return jsonNoStore({ message: "date を指定してください。" }, { status: 400 });
  }
  const day = await getDaySchedule(date);
  return jsonNoStore({ day });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return jsonNoStore({ message: "ログインしてください。" }, { status: 401 });
  }

  try {
    await verifySameOriginRequest(request);
    const body = await request.json();
    const parsed = scheduleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonNoStore({ message: parsed.error.issues[0]?.message ?? "入力内容が不正です。" }, { status: 400 });
    }

    const day = await updateAssignment({
      dateKey: parsed.data.date,
      itemType: parsed.data.itemType,
      roleType: parsed.data.roleType,
      memberId: parsed.data.memberId,
      userId: user.id
    });

    return jsonNoStore({ message: "保存しました。", day });
  } catch (error) {
    if (error instanceof SecurityError) {
      return jsonNoStore({ message: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "保存に失敗しました。";
    return jsonNoStore({ message }, { status: 400 });
  }
}
