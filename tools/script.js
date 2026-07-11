/* ============================================
   AI残業代ラボ - script.js (v1.0)
   計算ロジックは簡易的な仮実装です。
   概算手取りは一律の概算控除率を用いた簡易計算のため、
   実際の手取り額とは差が生じます。
   ============================================ */

/* ---------- 定数(簡易仮実装) ---------- */
const OVERTIME_NET_DEDUCTION_RATE = 0.20; // 概算控除率(社会保険料・所得税・住民税相当の一律概算)
const LEGAL_OVERTIME_LIMIT_HOURS = 45;    // 36協定における時間外労働の一般的な上限(月)
const KAROSHI_LINE_HOURS = 80;            // いわゆる「過労死ライン」の目安とされる時間数(月)
const TAX_IMPACT_MONTHLY_THRESHOLD = 100000; // この額(円)を超えたら税負担への言及コメントを出す基準

/* ---------- 初期化 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("zangyo-form");
  form.addEventListener("submit", onSubmit);

  const recalcBtn = document.getElementById("recalc-btn");
  recalcBtn.addEventListener("click", onRecalc);

  const rateHelpBtn = document.getElementById("rate-help-btn");
  rateHelpBtn.addEventListener("click", onToggleRateHelp);
});

/* ---------- イベントハンドラ ---------- */
function onSubmit(event) {
  event.preventDefault();

  const hoursInput = document.getElementById("hours");
  const rateInput = document.getElementById("rate");

  const hours = Number(hoursInput.value);
  const rate = Number(rateInput.value);

  const fields = [
    { input: hoursInput, value: hours, label: "月の残業時間", min: 0, max: 200 },
    { input: rateInput, value: rate, label: "残業単価", min: 1, max: 50000 }
  ];

  const errors = validateFields(fields);

  if (errors.length > 0) {
    showFormError(errors);
    return;
  }

  clearFormError();

  const inputs = { hours, rate };

  let result;
  try {
    result = calculateOvertimePay(inputs);
  } catch {
    showFormError(["入力値の計算中にエラーが発生しました。値を見直してもう一度お試しください。"]);
    return;
  }

  renderResult(result, inputs);

  document.getElementById("form-section").hidden = true;
  document.getElementById("result-section").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onRecalc() {
  document.getElementById("result-section").hidden = true;
  document.getElementById("form-section").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onToggleRateHelp() {
  const note = document.getElementById("rate-help-note");
  const btn = document.getElementById("rate-help-btn");
  const isHidden = note.hidden;

  note.hidden = !isHidden;
  btn.setAttribute("aria-expanded", String(isHidden));
}

/* ---------- バリデーション ---------- */
function validateFields(fields) {
  const errors = [];

  fields.forEach(({ input, value, label, min, max }) => {
    const isInvalid = Number.isNaN(value) || value < min || value > max;
    input.closest(".field").classList.toggle("field--invalid", isInvalid);

    if (Number.isNaN(value)) {
      errors.push(`${label}を入力してください。`);
    } else if (value < min || value > max) {
      errors.push(`${label}は${min}〜${max}の範囲で入力してください。`);
    }
  });

  return errors;
}

function showFormError(messages) {
  const errorEl = document.getElementById("form-error");
  errorEl.innerHTML = messages.map((msg) => `・${escapeHtml(msg)}`).join("<br>");
  errorEl.hidden = false;
}

function clearFormError() {
  const errorEl = document.getElementById("form-error");
  errorEl.hidden = true;
  errorEl.textContent = "";

  document.querySelectorAll(".field--invalid").forEach((field) => {
    field.classList.remove("field--invalid");
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 月の残業時間・残業単価から、残業代(月・年間・税引き前・概算手取り)を計算する。
 * 概算手取りは一律の概算控除率を掛けるだけの簡易実装(仮実装)。
 * @param {{hours:number, rate:number}} inputs
 * @returns {object} monthlyPay / annualPay / preTaxAnnual / netAnnual / netMonthly を含む結果オブジェクト
 * @throws {Error} 入力値が不正(NaN/Infinity/範囲外)な場合
 */
function calculateOvertimePay({ hours, rate }) {
  // 防御的ガード: 呼び出し元のバリデーションを通過していても、
  // 万一不正な値が渡された場合にNaN・Infinityを画面に表示しないための最終防波堤
  if (
    !Number.isFinite(hours) || hours < 0 ||
    !Number.isFinite(rate) || rate <= 0
  ) {
    throw new Error("calculateOvertimePay: 不正な入力値です");
  }

  const monthlyPay = hours * rate;
  const annualPay = monthlyPay * 12;
  const preTaxAnnual = annualPay; // 残業代は所得税・社会保険料が引かれる前の金額であることを明示する項目
  const netAnnual = annualPay * (1 - OVERTIME_NET_DEDUCTION_RATE);
  const netMonthly = netAnnual / 12;

  return { monthlyPay, annualPay, preTaxAnnual, netAnnual, netMonthly };
}

/**
 * 残業時間・残業代に応じたAI社員コメントを生成する(ルールベースの簡易実装)。
 * 外部APIは呼ばず、条件分岐で定型文を出し分ける。最大2件まで結合して返す。
 * 健康・法令に関わる注意喚起を最優先し、その後に税負担に関する言及を続ける。
 * @param {object} result calculateOvertimePayの戻り値
 * @param {{hours:number, rate:number}} inputs
 * @returns {string} 表示用コメント文字列
 */
function generateAiComment(result, inputs) {
  const comments = [];

  if (inputs.hours >= KAROSHI_LINE_HOURS) {
    comments.push(
      "月80時間を超える残業は、いわゆる「過労死ライン」の目安とされる水準です。心身の健康を第一に、業務量の見直しについて上司や産業医への相談も検討してください。"
    );
  } else if (inputs.hours >= LEGAL_OVERTIME_LIMIT_HOURS) {
    comments.push(
      `月${LEGAL_OVERTIME_LIMIT_HOURS}時間は、36協定における時間外労働の一般的な上限の目安です。継続的にこの水準を超える場合は、勤務先に相談してみましょう。`
    );
  }

  if (result.monthlyPay >= TAX_IMPACT_MONTHLY_THRESHOLD) {
    comments.push(
      "残業代が増えると、翌年の住民税や社会保険料にも影響します。年間の手取りを詳しく知りたい場合は「AI手取りラボ」と合わせて確認するのがおすすめです。"
    );
  }

  if (comments.length === 0) {
    comments.push(
      "残業時間が増えるほど、概算控除率の影響で手取りとの差も大きくなります。無理のない範囲で働き方を見直すきっかけにしてみてください。"
    );
  }

  return comments.slice(0, 2).join(" ");
}

/* ---------- 表示 ---------- */
function renderResult(result, inputs) {
  setText("overtime-monthly", toManYen(result.monthlyPay));
  setText("overtime-annual", toManYen(result.annualPay));
  setText("pretax-annual", toManYen(result.preTaxAnnual));
  setText("net-annual", toManYen(result.netAnnual));
  setText("net-monthly", toManYen(result.netMonthly));

  setText(
    "result-condition",
    `残業${inputs.hours}時間 × 単価${inputs.rate.toLocaleString()}円`
  );

  setText("ai-comment-text", generateAiComment(result, inputs));
}

/* ---------- ユーティリティ ---------- */
function toManYen(yen) {
  return (yen / 10000).toFixed(1);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}
