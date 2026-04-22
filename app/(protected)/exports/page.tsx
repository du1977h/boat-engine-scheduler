import Link from "next/link";
import { monthLabel, monthNavigation } from "@/lib/date";

export default async function ExportsPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const now = new Date();
  const params = await searchParams;
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? now.getMonth() + 1);
  const nav = monthNavigation(year, month);

  return (
    <>
      <section className="panel month-header">
        <div>
          <p className="eyebrow">CSV出力</p>
          <h2>{monthLabel(year, month)}</h2>
          <p className="subtitle">月担当表CSV、担当回数集計CSV、支払額集計CSVをこの画面から出力できます。</p>
        </div>
        <div className="month-actions">
          <Link className="secondary-button" href={`/exports?year=${nav.prev.year}&month=${nav.prev.month}`}>
            前月
          </Link>
          <Link className="secondary-button" href={`/exports?year=${nav.next.year}&month=${nav.next.month}`}>
            次月
          </Link>
        </div>
      </section>

      <section className="summary-grid">
        <section className="panel summary-card">
          <p className="eyebrow">月担当表CSV</p>
          <h3>月担当表を出力</h3>
          <p className="subtitle">対象月の担当詳細をCSVでダウンロードします。</p>
          <div className="download-actions">
            <a className="primary-button" href={`/api/exports/schedule?year=${year}&month=${month}`}>
              月担当表CSVをダウンロード
            </a>
          </div>
        </section>
        <section className="panel summary-card">
          <p className="eyebrow">担当回数集計CSV</p>
          <h3>担当回数集計を出力</h3>
          <p className="subtitle">対象月の担当回数集計をCSVでダウンロードします。</p>
          <div className="download-actions">
            <a className="primary-button" href={`/api/exports/report?year=${year}&month=${month}`}>
              担当回数集計CSVをダウンロード
            </a>
          </div>
        </section>
        <section className="panel summary-card">
          <p className="eyebrow">支払額集計CSV</p>
          <h3>支払額集計を出力</h3>
          <p className="subtitle">対象月の支払額集計をCSVでダウンロードします。</p>
          <div className="download-actions">
            <a className="primary-button" href={`/api/exports/fee-report?year=${year}&month=${month}`}>
              支払額集計CSVをダウンロード
            </a>
          </div>
        </section>
      </section>
    </>
  );
}
