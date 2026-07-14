import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(__dirname, "..", "public", "index.html");

function renderSignedOutPage(message = "") {
  const content = `<main class="auth-page">
    <a class="auth-brand" href="/" aria-label="Money Pace ホーム">
      <span class="auth-logo" aria-hidden="true"><svg viewBox="0 0 32 32"><rect width="32" height="32" rx="8"></rect><path d="M9 20.5V11l7 7 7-7v9.5"></path></svg></span>
      <strong>Money Pace</strong>
    </a>
    <section class="auth-intro" aria-labelledby="auth-title">
      <span class="eyebrow">YOUR MONEY, AT YOUR PACE</span>
      <h1 id="auth-title">使える金額が、<br>すぐ分かる。</h1>
      <p>支出はひとこと送るだけ。Money Paceが、今日と今月のお金のペースを整えます。</p>
      ${message ? `<p class="auth-notice" role="alert">${String(message).replace(/[<>&"]/g, "")}</p>` : ""}
      <a class="auth-primary" href="/login">Money Paceを始める <span aria-hidden="true">→</span></a>
      <small>Googleまたはメールアドレスでログインできます。</small>
    </section>
    <aside class="auth-preview" aria-label="Money Paceの画面イメージ">
      <div class="preview-top"><span>7月のペース</span><i></i></div>
      <p>今月あと使える金額</p><strong>27,300<small>円</small></strong>
      <div class="preview-rule"></div>
      <dl><div><dt>今日の目安</dt><dd>1,750円</dd></div><div><dt>月末の見込み</dt><dd>+8,400円</dd></div></dl>
      <div class="preview-message"><span>ラーメン 950</span><b>送信済み</b></div>
    </aside>
  </main>`;
  return fs.readFileSync(templatePath, "utf8").replace("{{content}}", content);
}

export { renderSignedOutPage };
