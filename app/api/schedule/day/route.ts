import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getDaySchedule, updateAssignment } from "@/lib/schedule";
import { scheduleUpdateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ message: "ログインしてください。" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ message: "date を指定してください。" }, { status: 400 });
  }
  const day = await getDaySchedule(date);
  return NextResponse.json({ day });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ message: "ログインしてください。" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = scheduleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "入力内容が不正です。" }, { status: 400 });
    }

    const day = await updateAssignment({
      dateKey: parsed.data.date,
      itemType: parsed.data.itemType,
      roleType: parsed.data.roleType,
      memberId: parsed.data.memberId,
      userId: user.id
    });

    return NextResponse.json({ message: "保存しました。", day });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存に失敗しました。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
