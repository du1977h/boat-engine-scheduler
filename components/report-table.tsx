export function ReportTable({
  rows
}: {
  rows: Array<{
    memberId: number;
    memberName: string;
    boatStorageCount: number;
    boatGoCount: number;
    boatReturnCount: number;
    engineStorageCount: number;
    engineGoCount: number;
    engineReturnCount: number;
    grandTotalCount: number;
  }>;
}) {
  return (
    <div className="panel table-panel">
      <p className="eyebrow">回数集計</p>
      <h3>担当回数の集計表</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>担当部員</th>
              <th>ボート保管回数</th>
              <th>ボート行き回数</th>
              <th>ボート帰り回数</th>
              <th>エンジン保管回数</th>
              <th>エンジン行き回数</th>
              <th>エンジン帰り回数</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>この月の担当実績はまだありません。</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.memberId}>
                  <td>{row.memberName}</td>
                  <td>{row.boatStorageCount}</td>
                  <td>{row.boatGoCount}</td>
                  <td>{row.boatReturnCount}</td>
                  <td>{row.engineStorageCount}</td>
                  <td>{row.engineGoCount}</td>
                  <td>{row.engineReturnCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
