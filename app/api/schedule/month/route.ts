import { requireApiUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { getMonthSchedule } from "@/lib/schedule";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return jsonNoStore({ message: "ログインしてください。" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month) {
    return jsonNoStore({ message: "year と month を指定してください。" }, { status: 400 });
  }
  const days = await getMonthSchedule(year, month);
  return jsonNoStore({ days });
}
