import { itemOptions, roleOptions } from "@/lib/constants";
import { getMonthSchedule, getMonthlyFeeReport, getMonthlyReport } from "@/lib/schedule";

function csvEscape(value: string | number | null) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export async function buildScheduleCsv(year: number, month: number) {
  const monthSchedule = await getMonthSchedule(year, month);
  const lines = [
    ["year", "month", "target_date", "item_type", "role_type", "member_name", "updated_by", "updated_at"]
      .map(csvEscape)
      .join(",")
  ];

  for (const day of monthSchedule) {
    for (const itemType of itemOptions) {
      for (const roleType of roleOptions) {
        const assignment = day.assignments.find((entry) => entry.itemType === itemType && entry.roleType === roleType);
        lines.push(
          [
            year,
            month,
            day.date,
            itemType.toLowerCase(),
            roleType.toLowerCase(),
            assignment?.memberName ?? "",
            assignment?.updatedBy ?? day.lastUpdatedBy ?? "",
            assignment?.updatedAt ?? day.lastUpdatedAt ?? ""
          ]
            .map(csvEscape)
            .join(",")
        );
      }
    }
  }

  return `\ufeff${lines.join("\n")}`;
}

export async function buildReportCsv(year: number, month: number) {
  const report = await getMonthlyReport(year, month);
  const lines = [
    [
      "member_name",
      "boat_storage_count",
      "boat_go_count",
      "boat_return_count",
      "engine_storage_count",
      "engine_go_count",
      "engine_return_count"
    ]
      .map(csvEscape)
      .join(",")
  ];

  for (const row of report) {
    lines.push(
      [
        row.memberName,
        row.boatStorageCount,
        row.boatGoCount,
        row.boatReturnCount,
        row.engineStorageCount,
        row.engineGoCount,
        row.engineReturnCount
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return `\ufeff${lines.join("\n")}`;
}

export async function buildFeeReportCsv(year: number, month: number) {
  const report = await getMonthlyFeeReport(year, month);
  const lines = [
    [
      "member_name",
      "boat_storage_amount",
      "boat_go_amount",
      "boat_return_amount",
      "engine_storage_amount",
      "engine_go_amount",
      "engine_return_amount",
      "grand_total_amount"
    ]
      .map(csvEscape)
      .join(",")
  ];

  for (const row of report) {
    lines.push(
      [
        row.memberName,
        row.boatStorageAmount,
        row.boatGoAmount,
        row.boatReturnAmount,
        row.engineStorageAmount,
        row.engineGoAmount,
        row.engineReturnAmount,
        row.grandTotalAmount
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return `\ufeff${lines.join("\n")}`;
}
