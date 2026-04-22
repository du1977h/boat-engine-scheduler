import { requireApiUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { csvTextResponse } from "@/lib/csv";
import { buildScheduleCsv } from "@/lib/exporters";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return jsonNoStore({ message: "ログインしてください。" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const csv = await buildScheduleCsv(year, month);
  return csvTextResponse(`schedule-${year}-${String(month).padStart(2, "0")}.csv`, csv);
}
