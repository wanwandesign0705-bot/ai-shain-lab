/* ============================================
   AI社員研究所 トップページ - script.js (v1.0)
   フッターリンク(運営者情報・プライバシーポリシー・お問い合わせ)は
   ページ本体が未作成のため、クリック時に準備中の案内を表示するのみ。
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  const noteEl = document.getElementById("footer-note");

  document.querySelectorAll("[data-footer-note]").forEach((button) => {
    button.addEventListener("click", () => {
      noteEl.textContent = button.dataset.footerNote;
      noteEl.hidden = false;
    });
  });
});
