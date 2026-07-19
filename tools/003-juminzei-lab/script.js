/* ============================================
   AI住民税ラボ - script.js (v2.1 令和8年度対応版)
   給与年収850万円以下の会社員を対象とした、
   個人住民税（所得割・調整控除）の概算ツール。
   均等割・森林環境税は非課税判定を行わず、
   「課税される場合の参考額」として表示する。
   ============================================ */

const MAX_INCOME_MAN = 850;
const MIN_INCOME_MAN = 1;
const MAX_DEPENDENT_COUNT = 10;

const BASIC_DEDUCTION = 430000;
const BASIC_DEDUCTION_DIFF = 50000;

const SPOUSE_DEDUCTION_GENERAL = 330000;
const SPOUSE_DEDUCTION_ELDERLY = 380000;
const SPOUSE_DIFF_GENERAL = 50000;
const SPOUSE_DIFF_ELDERLY = 100000;

const GENERAL_DEPENDENT_DEDUCTION = 330000;
const GENERAL_DEPENDENT_DIFF = 50000;

const SPECIFIC_DEPENDENT_DEDUCTION = 450000;
const SPECIFIC_DEPENDENT_DIFF = 180000;

const ELDERLY_DEPENDENT_DEDUCTION = 380000;
const ELDERLY_DEPENDENT_DIFF = 100000;

const ELDERLY_COHABITING_DEDUCTION = 450000;
const ELDERLY_COHABITING_DIFF = 130000;

const SOCIAL_INSURANCE_ESTIMATE_RATE = 0.15;
const RESIDENT_TAX_RATE = 0.10;
const KINTOUWARI_REFERENCE = 4000;
const SHINRIN_REFERENCE = 1000;
const REFERENCE_FLAT_ADD = KINTOUWARI_REFERENCE + SHINRIN_REFERENCE;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("juminzei-form").addEventListener("submit", onSubmit);
  document.getElementById("recalc-btn").addEventListener("click", onRecalc);
  document.getElementById("toggle-detail-btn").addEventListener("click", onToggleDetail);
  document.getElementById("spouse-check").addEventListener("change", onSpouseCheckChange);
});

function onToggleDetail() {
  const button = document.getElementById("toggle-detail-btn");
  const fields = document.getElementById("detail-fields");
  const willOpen = fields.hidden;

  fields.hidden = !willOpen;
  button.setAttribute("aria-expanded", String(willOpen));
  button.textContent = willOpen
    ? "詳しく計算する(配偶者控除・扶養控除を追加) −"
    : "詳しく計算する(配偶者控除・扶養控除を追加) ＋";
}

function onSpouseCheckChange() {
  const spouseChecked = document.getElementById("spouse-check").checked;
  const elderlyField = document.getElementById("spouse-elderly-field");

  elderlyField.hidden = !spouseChecked;

  if (!spouseChecked) {
    document.getElementById("spouse-elderly-check").checked = false;
  }
}

function onSubmit(event) {
  event.preventDefault();

  const errors = [];
  clearAllFieldErrors();

  const incomeInput = document.getElementById("income");
  const socialInput = document.getElementById("social-insurance");

  const incomeRaw = incomeInput.value.trim();
  const socialRaw = socialInput.value.trim();

  let incomeMan = NaN;
  let socialMan = null;
  const hasSocialInput = socialRaw !== "";

  if (incomeRaw === "") {
    errors.push("前年の給与年収を入力してください。");
    toggleFieldError(incomeInput, true);
  } else {
    incomeMan = Number(incomeRaw);

    if (!Number.isFinite(incomeMan)) {
      errors.push("前年の給与年収は数値で入力してください。");
      toggleFieldError(incomeInput, true);
    } else if (incomeMan < MIN_INCOME_MAN) {
      errors.push(`給与年収は${MIN_INCOME_MAN}万円以上で入力してください。`);
      toggleFieldError(incomeInput, true);
    } else if (incomeMan > MAX_INCOME_MAN) {
      errors.push(
        "本ツール初版は給与年収850万円以下に対応しています。850万円を超える場合に適用されることがある所得金額調整控除には対応していません。"
      );
      toggleFieldError(incomeInput, true);
    }
  }

  if (hasSocialInput) {
    socialMan = Number(socialRaw);

    if (!Number.isFinite(socialMan) || socialMan < 0) {
      errors.push("年間社会保険料は0以上の数値で入力してください。");
      toggleFieldError(socialInput, true);
    } else if (Number.isFinite(incomeMan) && socialMan > incomeMan) {
      errors.push("年間社会保険料は給与年収以下で入力してください。");
      toggleFieldError(socialInput, true);
    }
  }

  const generalDependents = parseDependentCount(
    document.getElementById("general-dependents"),
    "一般扶養親族の人数",
    errors
  );
  const specificDependents = parseDependentCount(
    document.getElementById("specific-dependents"),
    "特定扶養親族の人数",
    errors
  );
  const elderlyDependents = parseDependentCount(
    document.getElementById("elderly-dependents"),
    "老人扶養親族（その他）の人数",
    errors
  );
  const elderlyCohabitingDependents = parseDependentCount(
    document.getElementById("elderly-cohabiting-dependents"),
    "老人扶養親族（同居老親等）の人数",
    errors
  );

  if (errors.length > 0) {
    showFormError(errors);
    return;
  }

  clearFormError();

  const inputs = {
    incomeMan,
    socialMan,
    hasSocialInput,
    spouseChecked: document.getElementById("spouse-check").checked,
    spouseElderlyChecked: document.getElementById("spouse-elderly-check").checked,
    generalDependents,
    specificDependents,
    elderlyDependents,
    elderlyCohabitingDependents
  };

  try {
    const result = calculateJuminzei(inputs);
    renderResult(result, inputs);

    document.getElementById("form-section").hidden = true;
    document.getElementById("result-section").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error(error);
    showFormError([
      "入力値の計算中にエラーが発生しました。値を見直してもう一度お試しください。"
    ]);
  }
}

function onRecalc() {
  document.getElementById("result-section").hidden = true;
  document.getElementById("form-section").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function parseDependentCount(input, label, errors) {
  const raw = input.value.trim();

  if (raw === "") {
    toggleFieldError(input, false);
    return 0;
  }

  const value = Number(raw);

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_DEPENDENT_COUNT
  ) {
    errors.push(`${label}は0〜${MAX_DEPENDENT_COUNT}の整数で入力してください。`);
    toggleFieldError(input, true);
    return 0;
  }

  toggleFieldError(input, false);
  return value;
}

function toggleFieldError(input, isInvalid) {
  const field = input.closest(".field");
  if (field) {
    field.classList.toggle("field--invalid", isInvalid);
  }
}

function clearAllFieldErrors() {
  document
    .querySelectorAll(".field--invalid")
    .forEach((field) => field.classList.remove("field--invalid"));
}

function showFormError(messages) {
  const errorElement = document.getElementById("form-error");
  errorElement.innerHTML = messages
    .map((message) => `・${escapeHtml(message)}`)
    .join("<br>");
  errorElement.hidden = false;
}

function clearFormError() {
  const errorElement = document.getElementById("form-error");
  errorElement.hidden = true;
  errorElement.textContent = "";
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

/**
 * 給与収入から給与所得を直接計算する。
 * 190万円超660万円未満は、所得税法別表第五に対応するため、
 * 4,000円単位の基準額を使う。
 */
function calcSalaryIncome(incomeYen) {
  if (!Number.isFinite(incomeYen) || incomeYen < 0) {
    throw new TypeError("給与収入が不正です。");
  }

  if (incomeYen <= 650000) {
    return 0;
  }

  if (incomeYen <= 1900000) {
    return incomeYen - 650000;
  }

  if (incomeYen < 6600000) {
    const base = Math.floor(incomeYen / 4000) * 4000;

    if (incomeYen <= 3600000) {
      return Math.max(base * 0.7 - 80000, 0);
    }

    return Math.max(base * 0.8 - 440000, 0);
  }

  return Math.max(incomeYen - (incomeYen * 0.1 + 1100000), 0);
}

function calculateJuminzei(inputs) {
  const incomeYen = inputs.incomeMan * 10000;
  const salaryIncome = calcSalaryIncome(incomeYen);

  const socialInsuranceYen = inputs.hasSocialInput
    ? inputs.socialMan * 10000
    : incomeYen * SOCIAL_INSURANCE_ESTIMATE_RATE;

  let otherDeduction = 0;
  let personalDiff = BASIC_DEDUCTION_DIFF;

  if (inputs.spouseChecked) {
    if (inputs.spouseElderlyChecked) {
      otherDeduction += SPOUSE_DEDUCTION_ELDERLY;
      personalDiff += SPOUSE_DIFF_ELDERLY;
    } else {
      otherDeduction += SPOUSE_DEDUCTION_GENERAL;
      personalDiff += SPOUSE_DIFF_GENERAL;
    }
  }

  otherDeduction +=
    inputs.generalDependents * GENERAL_DEPENDENT_DEDUCTION;
  personalDiff +=
    inputs.generalDependents * GENERAL_DEPENDENT_DIFF;

  otherDeduction +=
    inputs.specificDependents * SPECIFIC_DEPENDENT_DEDUCTION;
  personalDiff +=
    inputs.specificDependents * SPECIFIC_DEPENDENT_DIFF;

  otherDeduction +=
    inputs.elderlyDependents * ELDERLY_DEPENDENT_DEDUCTION;
  personalDiff +=
    inputs.elderlyDependents * ELDERLY_DEPENDENT_DIFF;

  otherDeduction +=
    inputs.elderlyCohabitingDependents * ELDERLY_COHABITING_DEDUCTION;
  personalDiff +=
    inputs.elderlyCohabitingDependents * ELDERLY_COHABITING_DIFF;

  const deductionTotal =
    BASIC_DEDUCTION +
    socialInsuranceYen +
    otherDeduction;

  let taxableIncome = Math.max(
    salaryIncome - deductionTotal,
    0
  );
  taxableIncome = Math.floor(taxableIncome / 1000) * 1000;

  let choseiKoujo = 0;

  if (taxableIncome <= 2000000) {
    choseiKoujo =
      Math.min(personalDiff, taxableIncome) * 0.05;
  } else {
    const adjustmentBase = Math.max(
      personalDiff - (taxableIncome - 2000000),
      50000
    );
    choseiKoujo = adjustmentBase * 0.05;
  }

  if (choseiKoujo > 0 && choseiKoujo < 2500) {
    choseiKoujo = 2500;
  }

  let shotokuwari = Math.max(
    taxableIncome * RESIDENT_TAX_RATE - choseiKoujo,
    0
  );
  shotokuwari = Math.floor(shotokuwari / 100) * 100;

  const referenceAnnual =
    shotokuwari + REFERENCE_FLAT_ADD;
  const referenceMonthly =
    referenceAnnual / 12;

  return {
    salaryIncome,
    socialInsuranceYen,
    otherDeduction,
    deductionTotal,
    taxableIncome,
    personalDiff,
    choseiKoujo,
    shotokuwari,
    referenceAnnual,
    referenceMonthly
  };
}

function generateAiComment(result, inputs) {
  if (result.shotokuwari === 0) {
    return "所得割の概算は0円ですが、本ツールでは非課税の確定判定は行っていません。詳しくはお住まいの市区町村にご確認ください。";
  }

  if (
    inputs.specificDependents > 0 ||
    inputs.elderlyCohabitingDependents > 0
  ) {
    return "特定扶養親族や同居老親等がいる場合、人的控除差が大きくなるため調整控除額も増える傾向があります。";
  }

  return "扶養親族や配偶者控除の有無によって、所得控除・調整控除の金額が変わります。条件を変えて比較してみてください。";
}

function renderResult(result, inputs) {
  setText("shotokuwari", formatYen(result.shotokuwari));
  setText("reference-annual", formatYen(result.referenceAnnual));
  setText(
    "reference-monthly",
    formatYen(Math.round(result.referenceMonthly))
  );

  setText("d-salary-income", formatYen(result.salaryIncome));
  setText(
    "d-social-insurance",
    formatYen(Math.round(result.socialInsuranceYen))
  );
  setText(
    "d-other-deduction",
    formatYen(result.otherDeduction)
  );
  setText(
    "d-deduction-total",
    formatYen(Math.round(result.deductionTotal))
  );
  setText(
    "d-taxable-income",
    formatYen(result.taxableIncome)
  );
  setText(
    "d-personal-diff",
    formatYen(result.personalDiff)
  );
  setText(
    "d-chosei",
    formatYen(Math.round(result.choseiKoujo))
  );

  setText(
    "result-condition",
    `給与年収${inputs.incomeMan}万円`
  );
  setText(
    "ai-comment-text",
    generateAiComment(result, inputs)
  );

  document.getElementById(
    "social-estimate-notice"
  ).hidden = inputs.hasSocialInput;
}

function formatYen(value) {
  return Math.round(value).toLocaleString("ja-JP");
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`表示先が見つかりません: ${id}`);
  }

  element.textContent = value;
}

/* ============================================
   主な期待値（第4版仕様書）
   #1 100万円・社保未入力:
     給与所得350,000 / 所得割0 / 参考年額5,000
   #2 106万円・社保未入力:
     給与所得410,000 / 所得割0 / 参考年額5,000
   #3 200万円・扶養なし:
     給与所得1,320,000 / 所得割56,500 / 参考年額61,500
   #4 450万円・扶養なし:
     給与所得3,160,000 / 所得割202,500 / 参考年額207,500
   #6 450万円・一般扶養1人:
     所得割165,000 / 参考年額170,000
   #7 450万円・特定扶養1人:
     所得割148,500 / 参考年額153,500
   #8 450万円・同居老親等1人:
     所得割151,500 / 参考年額156,500
   #9 450万円・配偶者控除（一般）:
     所得割165,000 / 参考年額170,000
   #10 450万円・社会保険料実額60万円:
     所得割210,500 / 参考年額215,500
   ============================================ */
