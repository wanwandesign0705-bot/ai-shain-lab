/* ============================================
   AI手取りラボ - script.js (v1.0)
   計算ロジックは簡易的な仮実装です。
   実際の税額・保険料は勤務先や自治体により異なります。
   ============================================ */

/* ---------- 都道府県マスタ ----------
   healthRate: 協会けんぽ想定の健康保険"料率"(概算値・仮実装)
   本番では協会けんぽの公式最新データに置き換える想定
------------------------------------------------ */
const PREFECTURES = [
  { name: "北海道", healthRate: 0.1021 },
  { name: "青森県", healthRate: 0.0949 },
  { name: "岩手県", healthRate: 0.0964 },
  { name: "宮城県", healthRate: 0.1001 },
  { name: "秋田県", healthRate: 0.0983 },
  { name: "山形県", healthRate: 0.0984 },
  { name: "福島県", healthRate: 0.0955 },
  { name: "茨城県", healthRate: 0.0966 },
  { name: "栃木県", healthRate: 0.0976 },
  { name: "群馬県", healthRate: 0.0981 },
  { name: "埼玉県", healthRate: 0.0978 },
  { name: "千葉県", healthRate: 0.0977 },
  { name: "東京都", healthRate: 0.0991 },
  { name: "神奈川県", healthRate: 0.1002 },
  { name: "新潟県", healthRate: 0.0932 },
  { name: "富山県", healthRate: 0.0959 },
  { name: "石川県", healthRate: 0.0977 },
  { name: "福井県", healthRate: 0.1001 },
  { name: "山梨県", healthRate: 0.0993 },
  { name: "長野県", healthRate: 0.0955 },
  { name: "岐阜県", healthRate: 0.0991 },
  { name: "静岡県", healthRate: 0.0975 },
  { name: "愛知県", healthRate: 0.1002 },
  { name: "三重県", healthRate: 0.0996 },
  { name: "滋賀県", healthRate: 0.0989 },
  { name: "京都府", healthRate: 0.1024 },
  { name: "大阪府", healthRate: 0.1034 },
  { name: "兵庫県", healthRate: 0.1017 },
  { name: "奈良県", healthRate: 0.1014 },
  { name: "和歌山県", healthRate: 0.1006 },
  { name: "鳥取県", healthRate: 0.0996 },
  { name: "島根県", healthRate: 0.1021 },
  { name: "岡山県", healthRate: 0.1021 },
  { name: "広島県", healthRate: 0.0995 },
  { name: "山口県", healthRate: 0.1020 },
  { name: "徳島県", healthRate: 0.1039 },
  { name: "香川県", healthRate: 0.1033 },
  { name: "愛媛県", healthRate: 0.1022 },
  { name: "高知県", healthRate: 0.1013 },
  { name: "福岡県", healthRate: 0.1017 },
  { name: "佐賀県", healthRate: 0.1061 },
  { name: "長崎県", healthRate: 0.1017 },
  { name: "熊本県", healthRate: 0.1030 },
  { name: "大分県", healthRate: 0.1017 },
  { name: "宮崎県", healthRate: 0.0985 },
  { name: "鹿児島県", healthRate: 0.1013 },
  { name: "沖縄県", healthRate: 0.0968 }
];

/* ---------- 定数(簡易仮実装) ---------- */
const PENSION_RATE = 0.0915;          // 厚生年金 従業員負担分(概算)
const EMPLOYMENT_INSURANCE_RATE = 0.006; // 雇用保険 従業員負担分(概算)
const NURSING_CARE_ADD_ON = 0.0082;   // 40歳以上に上乗せする介護保険相当分(概算)

const BASIC_DEDUCTION_INCOME_TAX = 480000; // 所得税の基礎控除(概算・年収2400万円以下想定)
const BASIC_DEDUCTION_RESIDENT_TAX = 430000; // 住民税の基礎控除(概算)
const DEPENDENT_DEDUCTION_INCOME_TAX = 380000;
const DEPENDENT_DEDUCTION_RESIDENT_TAX = 330000;
const RESIDENT_TAX_RATE = 0.10;       // 住民税(所得割)概算
const RESIDENT_TAX_PER_CAPITA = 5000; // 住民税(均等割)概算

/* ---------- 初期化 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  populatePrefectureSelect();

  const form = document.getElementById("tedori-form");
  form.addEventListener("submit", onSubmit);

  const recalcBtn = document.getElementById("recalc-btn");
  recalcBtn.addEventListener("click", onRecalc);
});

function populatePrefectureSelect() {
  const select = document.getElementById("prefecture");
  PREFECTURES.forEach((pref, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = pref.name;
    if (pref.name === "東京都") {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

/* ---------- イベントハンドラ ---------- */
function onSubmit(event) {
  event.preventDefault();

  const incomeInput = document.getElementById("income");
  const ageInput = document.getElementById("age");
  const dependentsInput = document.getElementById("dependents");
  const prefectureSelect = document.getElementById("prefecture");

  const income = Number(incomeInput.value);
  const age = Number(ageInput.value);
  const dependents = Number(dependentsInput.value);
  const prefIndex = Number(prefectureSelect.value);

  const fields = [
    { input: incomeInput, value: income, label: "年収", min: 1, max: 100000 },
    { input: ageInput, value: age, label: "年齢", min: 15, max: 99 },
    { input: dependentsInput, value: dependents, label: "扶養人数", min: 0, max: 10 }
  ];

  const errors = validateFields(fields);

  if (Number.isNaN(prefIndex) || !PREFECTURES[prefIndex]) {
    errors.push("都道府県を選択してください。");
  }

  if (errors.length > 0) {
    showFormError(errors);
    return;
  }

  clearFormError();

  const prefecture = PREFECTURES[prefIndex];
  const inputs = { income, age, dependents, prefecture };

  let result;
  try {
    result = calculateTedori(inputs);
  } catch {
    showFormError(["入力値の計算中にエラーが発生しました。値を見直してもう一度お試しください。"]);
    return;
  }

  renderResult(result, inputs);

  document.getElementById("form-section").hidden = true;
  document.getElementById("result-section").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
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

function onRecalc() {
  document.getElementById("result-section").hidden = true;
  document.getElementById("form-section").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 計算ロジック(簡易仮実装) ---------- */
/**
 * 年収・年齢・扶養人数・都道府県から、手取り額の概算を計算する。
 * 計算ロジックはすべて簡易的な仮実装(概算値)。
 * @param {{income:number, age:number, dependents:number, prefecture:{name:string, healthRate:number}}} inputs
 * @returns {object} 手取り額・各種控除額を含む計算結果オブジェクト
 * @throws {Error} 入力値が不正(NaN/Infinity/範囲外)な場合
 */
function calculateTedori({ income, age, dependents, prefecture }) {
  // 防御的ガード: 呼び出し元のバリデーションを通過していても、
  // 万一不正な値が渡された場合にNaN・Infinityを画面に表示しないための最終防波堤
  if (
    !Number.isFinite(income) || income <= 0 ||
    !Number.isFinite(age) ||
    !Number.isFinite(dependents) ||
    !prefecture || !Number.isFinite(prefecture.healthRate)
  ) {
    throw new Error("calculateTedori: 不正な入力値です");
  }

  const grossAnnual = income * 10000; // 万円 -> 円

  /* 社会保険料(年間) */
  let healthRate = prefecture.healthRate / 2; // 労使折半のうち従業員負担分
  if (age >= 40) {
    healthRate += NURSING_CARE_ADD_ON / 2;
  }
  const healthInsuranceAnnual = grossAnnual * healthRate;
  const pensionAnnual = grossAnnual * PENSION_RATE;
  const employmentInsuranceAnnual = grossAnnual * EMPLOYMENT_INSURANCE_RATE;
  const socialInsuranceAnnual = healthInsuranceAnnual + pensionAnnual + employmentInsuranceAnnual;

  /* 給与所得控除(概算・簡易テーブル) */
  const salaryDeduction = calcSalaryDeduction(grossAnnual);
  const salaryIncome = Math.max(grossAnnual - salaryDeduction, 0);

  /* 所得税(概算) */
  const taxableIncomeForIncomeTax = Math.max(
    salaryIncome - BASIC_DEDUCTION_INCOME_TAX - dependents * DEPENDENT_DEDUCTION_INCOME_TAX - socialInsuranceAnnual,
    0
  );
  const incomeTaxAnnual = calcIncomeTax(taxableIncomeForIncomeTax);

  /* 住民税(概算) */
  const taxableIncomeForResidentTax = Math.max(
    salaryIncome - BASIC_DEDUCTION_RESIDENT_TAX - dependents * DEPENDENT_DEDUCTION_RESIDENT_TAX - socialInsuranceAnnual,
    0
  );
  const residentTaxAnnual =
    taxableIncomeForResidentTax > 0
      ? taxableIncomeForResidentTax * RESIDENT_TAX_RATE + RESIDENT_TAX_PER_CAPITA
      : 0;

  /* 手取り */
  const totalDeductionAnnual = socialInsuranceAnnual + incomeTaxAnnual + residentTaxAnnual;
  const netAnnual = grossAnnual - totalDeductionAnnual;
  const netMonthly = netAnnual / 12;
  const netRate = (netAnnual / grossAnnual) * 100;

  return {
    grossAnnual,
    netAnnual,
    netMonthly,
    netRate,
    healthInsuranceAnnual,
    pensionAnnual,
    employmentInsuranceAnnual,
    socialInsuranceAnnual,
    incomeTaxAnnual,
    residentTaxAnnual,
    totalDeductionAnnual
  };
}

function calcSalaryDeduction(grossAnnual) {
  // 給与所得控除額(概算・簡易テーブル)
  if (grossAnnual <= 1625000) return 550000;
  if (grossAnnual <= 1800000) return grossAnnual * 0.4 - 100000;
  if (grossAnnual <= 3600000) return grossAnnual * 0.3 + 80000;
  if (grossAnnual <= 6600000) return grossAnnual * 0.2 + 440000;
  if (grossAnnual <= 8500000) return grossAnnual * 0.1 + 1100000;
  return 1950000;
}

function calcIncomeTax(taxableIncome) {
  // 所得税速算表(概算・復興特別所得税込みの概算係数を掛ける)
  let tax = 0;
  if (taxableIncome <= 1950000) {
    tax = taxableIncome * 0.05;
  } else if (taxableIncome <= 3300000) {
    tax = taxableIncome * 0.10 - 97500;
  } else if (taxableIncome <= 6950000) {
    tax = taxableIncome * 0.20 - 427500;
  } else if (taxableIncome <= 9000000) {
    tax = taxableIncome * 0.23 - 636000;
  } else if (taxableIncome <= 18000000) {
    tax = taxableIncome * 0.33 - 1536000;
  } else if (taxableIncome <= 40000000) {
    tax = taxableIncome * 0.40 - 2796000;
  } else {
    tax = taxableIncome * 0.45 - 4796000;
  }
  tax = Math.max(tax, 0);
  return tax * 1.021; // 復興特別所得税(概算)
}

/* ---------- 表示 ---------- */
function renderResult(result, inputs) {
  setText("net-monthly", toManYen(result.netMonthly));
  setText("net-annual", toManYen(result.netAnnual));
  setText("net-rate", result.netRate.toFixed(1));

  setText(
    "result-condition",
    `年収${inputs.income}万円 / ${inputs.prefecture.name} / 扶養${inputs.dependents}人`
  );

  setText("d-health", toManYen(result.healthInsuranceAnnual));
  setText("d-pension", toManYen(result.pensionAnnual));
  setText("d-employment", toManYen(result.employmentInsuranceAnnual));
  setText("d-income-tax", toManYen(result.incomeTaxAnnual));
  setText("d-resident-tax", toManYen(result.residentTaxAnnual));

  renderBreakdownBar(result);
  setText("ai-comment-text", generateAiComment(result, inputs));
}

/**
 * 計算結果に応じたAI社員コメントを生成する(ルールベースの簡易実装)。
 * 外部APIは呼ばず、条件分岐で定型文を出し分ける。最大2件まで結合して返す。
 * 将来的に条件を増やす場合は、この関数内の分岐を追加していく想定。
 * @param {object} result calculateTedoriの戻り値
 * @param {{income:number, age:number, dependents:number}} inputs
 * @returns {string} 表示用コメント文字列
 */
function generateAiComment(result, inputs) {
  const comments = [];

  if (inputs.dependents === 0 && inputs.income >= 400) {
    comments.push(
      "扶養がない場合、ふるさと納税を活用すると実質2,000円の負担で返礼品を受け取れる余地があります。"
    );
  }

  if (inputs.age >= 40) {
    comments.push(
      "40歳以上は介護保険料が上乗せされるため、健康保険料がやや高めに出ています。"
    );
  }

  if (result.netRate < 75) {
    comments.push(
      "手取り率がやや低めです。社会保険料・税金の内訳バーで、どの項目の負担が大きいか確認してみましょう。"
    );
  } else if (result.netRate >= 82) {
    comments.push(
      "手取り率は高めの水準です。この年収帯では社会保険料・税負担の割合が比較的軽いケースです。"
    );
  }

  if (comments.length === 0) {
    comments.push(
      "この年収帯では、社会保険料が手取りに最も影響する項目です。内訳バーで割合を確認してみてください。"
    );
  }

  // 複数該当する場合も画面が縦に長くなりすぎないよう、最大2件までに絞る
  return comments.slice(0, 2).join(" ");
}

function renderBreakdownBar(result) {
  const total = result.grossAnnual;
  const netPct = (result.netAnnual / total) * 100;
  const socialPct = (result.socialInsuranceAnnual / total) * 100;
  const incomeTaxPct = (result.incomeTaxAnnual / total) * 100;
  const residentTaxPct = (result.residentTaxAnnual / total) * 100;

  document.getElementById("bar-net").style.width = netPct + "%";
  document.getElementById("bar-social").style.width = socialPct + "%";
  document.getElementById("bar-income-tax").style.width = incomeTaxPct + "%";
  document.getElementById("bar-resident-tax").style.width = residentTaxPct + "%";
}

/* ---------- ユーティリティ ---------- */
function toManYen(yen) {
  return (yen / 10000).toFixed(1);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}
