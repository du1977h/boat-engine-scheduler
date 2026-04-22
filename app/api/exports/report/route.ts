import { requireApiUser } from "@/lib/auth";
import { csvTextResponse } from "@/lib/csv";
import { buildReportCsv } from "@/lib/exporters";
import { jsonNoStore } from "@/lib/http";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return jsonNoStore({ message: "ログインしてください。" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const csv = await buildReportCsv(year, month);
  return csvTextResponse(`report-${year}-${String(month).padStart(2, "0")}.csv`, csv);
}
