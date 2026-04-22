function formatYen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}

export function FeeReportTable({
  rows
}: {
  rows: Array<{
    memberId: number;
    memberName: string;
    boatStorageAmount: number;
    boatGoAmount: number;
    boatReturnAmount: number;
    engineStorageAmount: number;
    engineGoAmount: number;
    engineReturnAmount: number;
    grandTotalAmount: number;
  }>;
}) {
  return (
    <div className="panel table-panel">
      <p className="eyebrow">支払額集計</p>
      <h3>回数 × 単価 の金額表</h3>
      <p className="subtitle">ボート保管50円 / ボート行き300円 / ボート帰り300円 / エンジン保管50円 / エンジン行き200円 / エンジン帰り200円</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>担当部員</th>
              <th>ボート保管金額</th>
              <th>ボート行き金額</th>
              <th>ボート帰り金額</th>
              <th>エンジン保管金額</th>
              <th>エンジン行き金額</th>
              <th>エンジン帰り金額</th>
              <th>合計金額</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>この月の支払額集計データはまだありません。</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.memberId}>
                  <td>{row.memberName}</td>
                  <td>{formatYen(row.boatStorageAmount)}</td>
                  <td>{formatYen(row.boatGoAmount)}</td>
                  <td>{formatYen(row.boatReturnAmount)}</td>
                  <td>{formatYen(row.engineStorageAmount)}</td>
                  <td>{formatYen(row.engineGoAmount)}</td>
                  <td>{formatYen(row.engineReturnAmount)}</td>
                  <td>{formatYen(row.grandTotalAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
