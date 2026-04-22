import { FeeReportTable } from "@/components/fee-report-table";
import Link from "next/link";
import { ReportTable } from "@/components/report-table";
import { monthLabel, monthNavigation } from "@/lib/date";
import { getMonthlyFeeReport, getMonthlyReport } from "@/lib/schedule";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const now = new Date();
  const params = await searchParams;
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? now.getMonth() + 1);
  const [rows, feeRows] = await Promise.all([getMonthlyReport(year, month), getMonthlyFeeReport(year, month)]);
  const nav = monthNavigation(year, month);

  return (
    <>
      <section className="panel month-header">
        <div>
          <p className="eyebrow">月次集計</p>
          <h2>{monthLabel(year, month)}</h2>
        </div>
        <div className="month-actions">
          <Link className="secondary-button" href={`/reports?year=${nav.prev.year}&month=${nav.prev.month}`}>
            前月
          </Link>
          <Link className="secondary-button" href={`/reports?year=${nav.next.year}&month=${nav.next.month}`}>
            次月
          </Link>
        </div>
      </section>
      <ReportTable rows={rows} />
      <FeeReportTable rows={feeRows} />
    </>
  );
}
