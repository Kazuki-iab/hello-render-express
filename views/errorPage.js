function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function renderErrorPage(status, correlationId) {
  const title = status === 403 ? "操作を確認できませんでした" : status === 503 ? "ただいま接続しにくい状態です" : "問題が発生しました";
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} | Money Pace</title><link rel="stylesheet" href="/style.css"><main class="error-page"><span>Money Pace</span><h1>${title}</h1><p>時間をおいて、もう一度お試しください。</p><a href="/">ホームへ戻る</a><small>参照ID: ${escapeHtml(correlationId)}</small></main></html>`;
}

export { renderErrorPage };
