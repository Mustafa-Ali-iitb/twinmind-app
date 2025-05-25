export function renderSummaryHtml(summary) {
  return (
    <div className="summary-ui">
      <h3>📋 TL;DR — Summary</h3>

      {summary.overview?.length > 0 && (
        <>
          <h4>🔹 Meeting Overview</h4>
          <ul>{summary.overview.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </>
      )}

      {summary.actionables?.length > 0 && (
        <>
          <h4>✅ Action Items</h4>
          <ul>{summary.actionables.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </>
      )}

      {summary.notes && (
        <>
          <h4>📝 Your Notes</h4>
          <p>{summary.notes}</p>
        </>
      )}
    </div>
  );
}