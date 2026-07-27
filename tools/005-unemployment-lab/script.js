/* =========================================================
   AI失業保険ラボ - script.js
   Version 1.0.0
   ========================================================= */

   "use strict";

   const SYSTEM = Object.freeze({
     effectiveFrom: "2025-08-01",
     effectiveUntil: "2026-07-31",
     wageDailyMinimum: 3014,
     benefitDailyMinimum: 2411,
     lowerRateBoundary: 5340,
     standardMiddleUpperBoundary: 13140,
     seniorMiddleUpperBoundary: 11800,
     standardMiddleRange: 7800,
     seniorMiddleRange: 6460,
     seniorAlternativeConstant: 4720,
     caps: Object.freeze({
       under30: Object.freeze({ wageDaily: 14510, benefitDaily: 7255 }),
       age30to44: Object.freeze({ wageDaily: 16110, benefitDaily: 8055 }),
       age45to59: Object.freeze({ wageDaily: 17740, benefitDaily: 8870 }),
       age60to64: Object.freeze({ wageDaily: 16940, benefitDaily: 7623 })
     })
   });
   
   const PERIOD_LABELS = Object.freeze({
     "under6m": "6か月未満",
     "6m-under1y": "6か月以上1年未満",
     "1-under5": "1年以上5年未満",
     "5-under10": "5年以上10年未満",
     "10-under20": "10年以上20年未満",
     "20plus": "20年以上"
   });
   
   const SEPARATION_LABELS = Object.freeze({
     "general-self": "一般離職者",
     "specific-eligible": "特定受給資格者",
     "specific-reason": "特定理由離職者"
   });
   
   const SPECIFIC_ELIGIBLE_DAYS = Object.freeze({
     under30: Object.freeze({
       "6m-under1y": 90,
       "1-under5": 90,
       "5-under10": 120,
       "10-under20": 180,
       "20plus": null
     }),
     age30to34: Object.freeze({
       "6m-under1y": 90,
       "1-under5": 120,
       "5-under10": 180,
       "10-under20": 210,
       "20plus": 240
     }),
     age35to44: Object.freeze({
       "6m-under1y": 90,
       "1-under5": 150,
       "5-under10": 180,
       "10-under20": 240,
       "20plus": 270
     }),
     age45to59: Object.freeze({
       "6m-under1y": 90,
       "1-under5": 180,
       "5-under10": 240,
       "10-under20": 270,
       "20plus": 330
     }),
     age60to64: Object.freeze({
       "6m-under1y": 90,
       "1-under5": 150,
       "5-under10": 180,
       "10-under20": 210,
       "20plus": 240
     })
   });
   
   const dom = {};
   
   document.addEventListener("DOMContentLoaded", () => {
     cacheDom();
     bindEvents();
     applyCalculationMode("simple");
     updateSeparationOptions();
   });
   
   function cacheDom() {
     dom.form = document.getElementById("unemployment-form");
     dom.formError = document.getElementById("form-error");
     dom.modeInputs = Array.from(
       document.querySelectorAll('input[name="calculationMode"]')
     );
     dom.simpleIncomeField = document.getElementById("simple-income-field");
     dom.detailedIncomeFields = document.getElementById(
       "detailed-income-fields"
     );
     dom.age = document.getElementById("age");
     dom.averageMonthlyWage = document.getElementById(
       "average-monthly-wage"
     );
     dom.monthlyWages = Array.from(
       { length: 6 },
       (_, i) => document.getElementById(`wage-month-${i + 1}`)
     );
     dom.insuredPeriod = document.getElementById("insured-period");
     dom.separationType = document.getElementById("separation-type");
     dom.separationDate = document.getElementById("separation-date");
     dom.selfReasonOptions = document.getElementById(
       "self-reason-options"
     );
     dom.repeatSelfSeparation = document.getElementById(
       "repeat-self-separation"
     );
     dom.educationExemption = document.getElementById(
       "education-exemption"
     );
     dom.resultSection = document.getElementById("result-section");
     dom.recalculateButton = document.getElementById(
       "recalculate-button"
     );
     dom.totalBenefit = document.getElementById("total-benefit");
     dom.resultCondition = document.getElementById("result-condition");
     dom.dailyBenefit = document.getElementById("daily-benefit");
     dom.benefitDays = document.getElementById("benefit-days");
     dom.benefit28Days = document.getElementById("benefit-28-days");
     dom.wageDaily = document.getElementById("wage-daily");
     dom.sixMonthTotal = document.getElementById("six-month-total");
     dom.benefitRate = document.getElementById("benefit-rate");
     dom.capStatus = document.getElementById("cap-status");
     dom.restrictionPeriod = document.getElementById(
       "restriction-period"
     );
     dom.benefitExpiryDate = document.getElementById(
       "benefit-expiry-date"
     );
     dom.adviceText = document.getElementById("advice-text");
     dom.restrictionTimelineText = document.getElementById(
       "restriction-timeline-text"
     );
   }
   
   function bindEvents() {
     dom.form.addEventListener("submit", handleSubmit);
   
     dom.modeInputs.forEach((input) => {
       input.addEventListener("change", () => {
         applyCalculationMode(input.value);
         clearFormError();
       });
     });
   
     dom.separationType.addEventListener(
       "change",
       updateSeparationOptions
     );
   
     dom.recalculateButton.addEventListener("click", () => {
       document.getElementById("calculator").scrollIntoView({
         behavior: prefersReducedMotion() ? "auto" : "smooth",
         block: "start"
       });
   
       dom.age.focus({ preventScroll: true });
     });
   
     [
       dom.age,
       dom.averageMonthlyWage,
       ...dom.monthlyWages,
       dom.insuredPeriod,
       dom.separationType
     ].forEach((input) => {
       input.addEventListener("input", () =>
         clearInvalidState(input)
       );
       input.addEventListener("change", () =>
         clearInvalidState(input)
       );
     });
   }
   
   function getCalculationMode() {
     return (
       dom.modeInputs.find((input) => input.checked)?.value ||
       "simple"
     );
   }
   
   function applyCalculationMode(mode) {
     const isDetailed = mode === "detailed";
   
     dom.simpleIncomeField.hidden = isDetailed;
     dom.detailedIncomeFields.hidden = !isDetailed;
     dom.averageMonthlyWage.required = !isDetailed;
   
     dom.monthlyWages.forEach((input) => {
       input.required = isDetailed;
     });
   }
   
   function updateSeparationOptions() {
     const isGeneralSelf =
       dom.separationType.value === "general-self";
   
     dom.selfReasonOptions.hidden = !isGeneralSelf;
   
     if (!isGeneralSelf) {
       dom.repeatSelfSeparation.checked = false;
       dom.educationExemption.checked = false;
     }
   }
   
   function handleSubmit(event) {
     event.preventDefault();
     clearFormError();
   
     const inputResult = readAndValidateInputs();
   
     if (!inputResult.ok) {
       showFormError(inputResult.errors);
       focusFirstInvalidField();
       return;
     }
   
     try {
       const calculation = calculateUnemploymentBenefit(
         inputResult.value
       );
   
       renderResult(calculation, inputResult.value);
   
       sendAnalyticsEvent("calculate_unemployment", {
         calculation_mode: inputResult.value.mode,
         separation_type: inputResult.value.separationType,
         age_group: getAnalyticsAgeGroup(inputResult.value.age),
         insured_period: inputResult.value.insuredPeriod
       });
     } catch (error) {
       console.error(error);
   
       showFormError([
         error instanceof Error
           ? error.message
           : "計算中にエラーが発生しました。入力内容をご確認ください。"
       ]);
     }
   }
   
   function readAndValidateInputs() {
     const errors = [];
     const mode = getCalculationMode();
   
     const age = parseNumberValue(dom.age.value);
     const insuredPeriod = dom.insuredPeriod.value;
     const separationType = dom.separationType.value;
   
     validateRequiredNumber({
       input: dom.age,
       value: age,
       label: "離職時の年齢",
       min: 15,
       max: 64,
       integer: true,
       errors
     });
   
     if (!insuredPeriod) {
       markInvalid(dom.insuredPeriod);
       errors.push(
         "雇用保険の被保険者期間を選択してください。"
       );
     }
   
     if (!separationType) {
       markInvalid(dom.separationType);
       errors.push("離職区分を選択してください。");
     }
   
     let sixMonthWageTotal = 0;
     let averageMonthlyWage = 0;
   
     if (mode === "simple") {
       const averageWageMan = parseNumberValue(
         dom.averageMonthlyWage.value
       );
   
       validateRequiredNumber({
         input: dom.averageMonthlyWage,
         value: averageWageMan,
         label: "退職前6か月の平均月給",
         min: 0.1,
         max: 1000,
         integer: false,
         errors
       });
   
       if (Number.isFinite(averageWageMan)) {
         averageMonthlyWage = Math.round(
           averageWageMan * 10000
         );
         sixMonthWageTotal = averageMonthlyWage * 6;
       }
     } else {
       const wages = dom.monthlyWages.map(
         (input, index) => {
           const wageMan = parseNumberValue(input.value);
   
           validateRequiredNumber({
             input,
             value: wageMan,
             label: `${index + 1}か月目の賃金`,
             min: 0.1,
             max: 1000,
             integer: false,
             errors
           });
   
           return Number.isFinite(wageMan)
             ? Math.round(wageMan * 10000)
             : 0;
         }
       );
   
       sixMonthWageTotal = wages.reduce(
         (sum, wage) => sum + wage,
         0
       );
   
       averageMonthlyWage = Math.round(
         sixMonthWageTotal / 6
       );
     }
   
     if (
       insuredPeriod &&
       separationType &&
       !isEligibleByInsuredPeriod(
         separationType,
         insuredPeriod
       )
     ) {
       markInvalid(dom.insuredPeriod);
   
       if (separationType === "general-self") {
         errors.push(
           "一般離職者は、原則として離職前2年間に被保険者期間が通算12か月以上必要です。"
         );
       } else {
         errors.push(
           "特定受給資格者・特定理由離職者でも、原則として離職前1年間に被保険者期間が通算6か月以上必要です。"
         );
       }
     }
   
     const separationDate = dom.separationDate.value
       ? parseLocalDate(dom.separationDate.value)
       : null;
   
     if (
       dom.separationDate.value &&
       !separationDate
     ) {
       markInvalid(dom.separationDate);
       errors.push(
         "退職日を正しい日付で入力してください。"
       );
     }
   
     if (errors.length > 0) {
       return {
         ok: false,
         errors
       };
     }
   
     return {
        ok: true,
        value: {
          mode,
          age,
          insuredPeriod,
          separationType,
          averageMonthlyWage,
          sixMonthWageTotal,
          separationDate,
          repeatSelfSeparation:
            separationType === "general-self" &&
            dom.repeatSelfSeparation.checked,
          educationExemption:
            separationType === "general-self" &&
            dom.educationExemption.checked
        }
      };
    }
    
    function validateRequiredNumber({
      input,
      value,
      label,
      min,
      max,
      integer,
      errors
    }) {
      if (!Number.isFinite(value)) {
        markInvalid(input);
        errors.push(`${label}を入力してください。`);
        return;
      }
    
      if (value < min || value > max) {
        markInvalid(input);
        errors.push(
          `${label}は${min}〜${max}の範囲で入力してください。`
        );
        return;
      }
    
      if (integer && !Number.isInteger(value)) {
        markInvalid(input);
        errors.push(`${label}は整数で入力してください。`);
      }
    }
    
    function parseNumberValue(rawValue) {
      if (
        typeof rawValue !== "string" ||
        rawValue.trim() === ""
      ) {
        return NaN;
      }
    
      const value = Number(rawValue);
    
      return Number.isFinite(value)
        ? value
        : NaN;
    }
    
    function isEligibleByInsuredPeriod(
      separationType,
      insuredPeriod
    ) {
      if (separationType === "general-self") {
        return ![
          "under6m",
          "6m-under1y"
        ].includes(insuredPeriod);
      }
    
      return insuredPeriod !== "under6m";
    }
    
    function calculateUnemploymentBenefit(input) {
      const wageDailyRaw =
        input.sixMonthWageTotal / 180;
    
      if (
        !Number.isFinite(wageDailyRaw) ||
        wageDailyRaw <= 0
      ) {
        throw new Error(
          "退職前6か月の賃金合計が正しくありません。"
        );
      }
    
      const wageDaily = Math.floor(wageDailyRaw);
    
      const dailyCalculation =
        calculateBasicDailyBenefit(
          input.age,
          wageDaily
        );
    
      const benefitDaysResult =
        calculateBenefitDays({
          age: input.age,
          insuredPeriod: input.insuredPeriod,
          separationType: input.separationType
        });
    
      const totalBenefit =
        dailyCalculation.benefitDaily *
        benefitDaysResult.days;
    
      const benefit28Days =
        dailyCalculation.benefitDaily * 28;
    
      const restriction =
        calculateRestriction(input);
    
      const benefitExpiryDate =
        calculateBenefitExpiryDate({
          separationDate: input.separationDate,
          benefitDays: benefitDaysResult.days
        });
    
      return {
        wageDaily,
        ...dailyCalculation,
        ...benefitDaysResult,
        totalBenefit,
        benefit28Days,
        restriction,
        benefitExpiryDate
      };
    }
    
    function calculateBasicDailyBenefit(
      age,
      wageDaily
    ) {
      const cap = getAgeCap(age);
    
      let benefitBeforeCap;
      let calculationBand;
    
      if (
        wageDaily < SYSTEM.wageDailyMinimum
      ) {
        benefitBeforeCap =
          SYSTEM.benefitDailyMinimum;
    
        calculationBand = "minimum";
      } else if (
        wageDaily < SYSTEM.lowerRateBoundary
      ) {
        benefitBeforeCap =
          wageDaily * 0.8;
    
        calculationBand = "80percent";
      } else if (age <= 59) {
        if (
          wageDaily <=
          SYSTEM.standardMiddleUpperBoundary
        ) {
          benefitBeforeCap =
            0.8 * wageDaily -
            0.3 *
              (
                (
                  wageDaily -
                  SYSTEM.lowerRateBoundary
                ) /
                SYSTEM.standardMiddleRange
              ) *
              wageDaily;
    
          calculationBand =
            "standard-middle";
        } else {
          benefitBeforeCap =
            wageDaily * 0.5;
    
          calculationBand =
            "50percent";
        }
      } else {
        if (
          wageDaily <=
          SYSTEM.seniorMiddleUpperBoundary
        ) {
          const formulaA =
            0.8 * wageDaily -
            0.35 *
              (
                (
                  wageDaily -
                  SYSTEM.lowerRateBoundary
                ) /
                SYSTEM.seniorMiddleRange
              ) *
              wageDaily;
    
          const formulaB =
            0.05 * wageDaily +
            SYSTEM.seniorAlternativeConstant;
    
          benefitBeforeCap =
            Math.min(
              formulaA,
              formulaB
            );
    
          calculationBand =
            "senior-middle";
        } else {
          benefitBeforeCap =
            wageDaily * 0.45;
    
          calculationBand =
            "45percent";
        }
      }
    
      const flooredBenefit =
        Math.floor(benefitBeforeCap);
    
      const cappedBenefit =
        Math.min(
          flooredBenefit,
          cap.benefitDaily
        );
    
      const benefitDaily =
        Math.max(
          cappedBenefit,
          SYSTEM.benefitDailyMinimum
        );
    
      const capApplied =
        wageDaily > cap.wageDaily ||
        flooredBenefit > cap.benefitDaily;
    
      const effectiveRate =
        Math.min(
          100,
          (
            benefitDaily /
            wageDaily
          ) * 100
        );
    
      return {
        benefitDaily,
        effectiveRate,
        capApplied,
        wageDailyCap:
          cap.wageDaily,
        benefitDailyCap:
          cap.benefitDaily,
        calculationBand
      };
    }
    
    function getAgeCap(age) {
      if (age < 30) {
        return SYSTEM.caps.under30;
      }
    
      if (age < 45) {
        return SYSTEM.caps.age30to44;
      }
    
      if (age < 60) {
        return SYSTEM.caps.age45to59;
      }
    
      return SYSTEM.caps.age60to64;
    }
    
    function calculateBenefitDays({
      age,
      insuredPeriod,
      separationType
    }) {
      if (
        separationType ===
        "specific-eligible"
      ) {
        const ageGroup =
          getSpecificDaysAgeGroup(age);
    
        const days =
          SPECIFIC_ELIGIBLE_DAYS[
            ageGroup
          ][insuredPeriod];
    
        if (days === null) {
          return {
            days: 180,
            benefitDaysNote:
              "入力された年齢と被保険者期間の組合せは公表表上通常想定されないため、30歳未満の上限区分180日で概算しています。"
          };
        }
    
        return {
          days,
          benefitDaysNote: ""
        };
      }
    
      const days =
        calculateGeneralBenefitDays(
          insuredPeriod
        );
    
      return {
        days,
        benefitDaysNote:
          separationType ===
          "specific-reason"
            ? "特定理由離職者の一部は、特定受給資格者と同じ給付日数になる場合があります。本ツールでは過大表示を避け、一般離職者の日数表で概算しています。"
            : ""
      };
    }
    
    function calculateGeneralBenefitDays(
      insuredPeriod
    ) {
      switch (insuredPeriod) {
        case "6m-under1y":
        case "1-under5":
        case "5-under10":
          return 90;
    
        case "10-under20":
          return 120;
    
        case "20plus":
          return 150;
    
        default:
          throw new Error(
            "選択された被保険者期間では給付日数を計算できません。"
          );
      }
    }
    
    function getSpecificDaysAgeGroup(age) {
      if (age < 30) {
        return "under30";
      }
    
      if (age < 35) {
        return "age30to34";
      }
    
      if (age < 45) {
        return "age35to44";
      }
    
      if (age < 60) {
        return "age45to59";
      }
    
      return "age60to64";
    }
    
    function calculateRestriction(input) {
      if (
        input.separationType !==
        "general-self"
      ) {
        return {
          code: "none",
          label: "原則なし",
          timeline:
            "会社都合等では、通常は7日間の待期後に給付制限はありません。"
        };
      }
    
      if (input.educationExemption) {
        return {
          code: "education-exemption",
          label:
            "解除される可能性あり",
          timeline:
            "対象となる教育訓練等の要件を満たす場合、給付制限が解除されることがあります。"
        };
      }
    
      if (
        input.repeatSelfSeparation
      ) {
        return {
          code: "three-months",
          label: "3か月",
          timeline:
            "7日間の待期後、3か月の給付制限がある想定です。"
        };
      }
    
      if (
        input.separationDate &&
        input.separationDate <
          new Date(2025, 3, 1)
      ) {
        return {
          code:
            "two-months-old-rule",
          label:
            "原則2か月（旧制度）",
          timeline:
            "2025年3月31日以前の退職として、7日間の待期後、原則2か月の給付制限を表示しています。"
        };
      }
    
      return {
        code: "one-month",
        label: "原則1か月",
        timeline:
          "2025年4月1日以降の通常の自己都合退職として、7日間の待期後、原則1か月の給付制限を表示しています。"
      };
    }
    function calculateBenefitExpiryDate({
        separationDate,
        benefitDays
      }) {
        if (!separationDate) {
          return null;
        }
      
        let extensionDays = 0;
      
        if (benefitDays === 330) {
          extensionDays = 30;
        } else if (benefitDays === 360) {
          extensionDays = 60;
        }
      
        const expiry = new Date(
          separationDate.getFullYear() + 1,
          separationDate.getMonth(),
          separationDate.getDate()
        );
      
        if (extensionDays > 0) {
          expiry.setDate(
            expiry.getDate() + extensionDays
          );
        }
      
        return expiry;
      }
      
      function renderResult(
        result,
        input
      ) {
        setText(
          dom.totalBenefit,
          formatYen(result.totalBenefit)
        );
      
        setText(
          dom.dailyBenefit,
          formatYen(result.benefitDaily)
        );
      
        setText(
          dom.benefitDays,
          formatInteger(result.days)
        );
      
        setText(
          dom.benefit28Days,
          formatYen(result.benefit28Days)
        );
      
        setText(
          dom.wageDaily,
          formatYen(result.wageDaily)
        );
      
        setText(
          dom.sixMonthTotal,
          formatYen(input.sixMonthWageTotal)
        );
      
        setText(
          dom.benefitRate,
          formatPercent(result.effectiveRate)
        );
      
        setText(
          dom.capStatus,
          result.capApplied
            ? `あり（上限 ${formatYen(
                result.benefitDailyCap
              )}円）`
            : "なし"
        );
      
        setText(
          dom.restrictionPeriod,
          result.restriction.label
        );
      
        setText(
          dom.benefitExpiryDate,
          result.benefitExpiryDate
            ? `${formatDate(
                result.benefitExpiryDate
              )}頃`
            : "退職日を入力すると表示されます"
        );
      
        setText(
          dom.restrictionTimelineText,
          result.restriction.timeline
        );
      
        setText(
          dom.resultCondition,
          buildResultCondition(input)
        );
      
        setText(
          dom.adviceText,
          buildAdvice(result, input)
        );
      
        dom.resultSection.hidden = false;
      
        dom.resultSection.scrollIntoView({
          behavior: prefersReducedMotion()
            ? "auto"
            : "smooth",
          block: "start"
        });
      
        sendAnalyticsEvent(
          "view_unemployment_result",
          {
            separation_type:
              input.separationType,
            benefit_days: result.days,
            restriction_code:
              result.restriction.code,
            cap_applied:
              result.capApplied
                ? "yes"
                : "no"
          }
        );
      }
      
      function buildResultCondition(
        input
      ) {
        return [
          `${input.age}歳`,
          `平均月給 ${formatYen(
            input.averageMonthlyWage
          )}円`,
          PERIOD_LABELS[
            input.insuredPeriod
          ],
          SEPARATION_LABELS[
            input.separationType
          ]
        ].join(" ／ ");
      }
      
      function buildAdvice(
        result,
        input
      ) {
        const messages = [];
      
        if (
          input.separationType ===
          "general-self"
        ) {
          if (
            result.restriction.code ===
            "education-exemption"
          ) {
            messages.push(
              "教育訓練等による給付制限解除は、対象講座・受講時期・申出期限などの条件があります。必ずハローワークで確認してください。"
            );
          } else {
            messages.push(
              `自己都合退職として、給付制限は「${result.restriction.label}」で表示しています。`
            );
          }
        }
      
        if (
          input.separationType ===
          "specific-reason"
        ) {
          messages.push(
            "特定理由離職者は事情により受給資格や給付日数が異なります。初版では給付日数を保守的に一般離職者と同じ表で計算しています。"
          );
        }
      
        if (
          result.benefitDaysNote
        ) {
          messages.push(
            result.benefitDaysNote
          );
        }
      
        if (
          result.capApplied
        ) {
          messages.push(
            `基本手当日額は年齢区分の上限 ${formatYen(
              result.benefitDailyCap
            )}円が適用されています。`
          );
        }
      
        messages.push(
          "実際の離職区分・受給資格・日額・日数・支給時期はハローワークの決定が優先されます。"
        );
      
        return messages.join(" ");
      }
      function markInvalid(input) {
        input.setAttribute(
          "aria-invalid",
          "true"
        );
      
        input
          .closest(".field")
          ?.classList.add(
            "field--invalid"
          );
      }
      
      function clearInvalidState(input) {
        input.removeAttribute(
          "aria-invalid"
        );
      
        input
          .closest(".field")
          ?.classList.remove(
            "field--invalid"
          );
      }
      
      function clearFormError() {
        dom.formError.hidden = true;
        dom.formError.textContent = "";
      }
      
      function showFormError(messages) {
        dom.formError.textContent = "";
      
        const heading =
          document.createElement(
            "strong"
          );
      
        heading.textContent =
          "入力内容をご確認ください。";
      
        const list =
          document.createElement("ul");
      
        messages.forEach((message) => {
          const item =
            document.createElement("li");
      
          item.textContent = message;
          list.appendChild(item);
        });
      
        dom.formError.append(
          heading,
          list
        );
      
        dom.formError.hidden = false;
      }
      
      function focusFirstInvalidField() {
        const firstInvalid =
          dom.form.querySelector(
            '[aria-invalid="true"]'
          );
      
        if (firstInvalid) {
          firstInvalid.focus();
        }
      }
      
      function parseLocalDate(
        dateString
      ) {
        const match =
          /^(\d{4})-(\d{2})-(\d{2})$/
            .exec(dateString);
      
        if (!match) {
          return null;
        }
      
        const year =
          Number(match[1]);
      
        const month =
          Number(match[2]);
      
        const day =
          Number(match[3]);
      
        const date =
          new Date(
            year,
            month - 1,
            day
          );
      
        if (
          date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) {
          return null;
        }
      
        return date;
      }
      
      function formatDate(date) {
        return new Intl.DateTimeFormat(
          "ja-JP",
          {
            year: "numeric",
            month: "long",
            day: "numeric"
          }
        ).format(date);
      }
      
      function formatYen(value) {
        return new Intl.NumberFormat(
          "ja-JP",
          {
            maximumFractionDigits: 0
          }
        ).format(
          Math.round(value)
        );
      }
      
      function formatInteger(value) {
        return new Intl.NumberFormat(
          "ja-JP",
          {
            maximumFractionDigits: 0
          }
        ).format(value);
      }
      
      function formatPercent(value) {
        return new Intl.NumberFormat(
          "ja-JP",
          {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }
        ).format(value);
      }
      
      function setText(
        element,
        value
      ) {
        element.textContent =
          String(value);
      }
      
      function prefersReducedMotion() {
        return window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
      }
      
      function getAnalyticsAgeGroup(age) {
        if (age < 30) {
          return "under30";
        }
      
        if (age < 45) {
          return "30to44";
        }
      
        if (age < 60) {
          return "45to59";
        }
      
        return "60to64";
      }
      
      function sendAnalyticsEvent(
        eventName,
        parameters = {}
      ) {
        if (
          typeof window.gtag !==
          "function"
        ) {
          return;
        }
      
        window.gtag(
          "event",
          eventName,
          {
            tool_name:
              "AI失業保険ラボ",
            ...parameters
          }
        );
      }
      
      /* =========================================================
         開発者向けセルフテスト
      
         公開後、ブラウザの開発者ツールの
         Consoleで次を実行できます。
      
         runUnemploymentLabSelfTests()
         ========================================================= */
      
      window.runUnemploymentLabSelfTests =
        function runUnemploymentLabSelfTests() {
          const tests = [
            {
              name:
                "25歳・賃金日額3000円・最低額",
              actual:
                calculateBasicDailyBenefit(
                  25,
                  3000
                ).benefitDaily,
              expected: 2411
            },
            {
              name:
                "25歳・賃金日額4000円・80%",
              actual:
                calculateBasicDailyBenefit(
                  25,
                  4000
                ).benefitDaily,
              expected: 3200
            },
            {
              name:
                "29歳・高賃金・上限",
              actual:
                calculateBasicDailyBenefit(
                  29,
                  20000
                ).benefitDaily,
              expected: 7255
            },
            {
              name:
                "30歳・高賃金・上限",
              actual:
                calculateBasicDailyBenefit(
                  30,
                  20000
                ).benefitDaily,
              expected: 8055
            },
            {
              name:
                "45歳・高賃金・上限",
              actual:
                calculateBasicDailyBenefit(
                  45,
                  20000
                ).benefitDaily,
              expected: 8870
            },
            {
              name:
                "60歳・高賃金・上限",
              actual:
                calculateBasicDailyBenefit(
                  60,
                  20000
                ).benefitDaily,
              expected: 7623
            },
            {
              name:
                "一般離職者・10年以上20年未満",
              actual:
                calculateGeneralBenefitDays(
                  "10-under20"
                ),
              expected: 120
            },
            {
              name:
                "特定受給資格者・45歳・20年以上",
              actual:
                calculateBenefitDays({
                  age: 45,
                  insuredPeriod:
                    "20plus",
                  separationType:
                    "specific-eligible"
                }).days,
              expected: 330
            }
          ];
      
          let passed = 0;
      
          tests.forEach((test) => {
            const ok =
              test.actual ===
              test.expected;
      
            if (ok) {
              passed += 1;
            }
      
            console[
              ok
                ? "log"
                : "error"
            ](
              `${
                ok
                  ? "PASS"
                  : "FAIL"
              }: ${test.name}`,
              {
                actual:
                  test.actual,
                expected:
                  test.expected
              }
            );
          });
      
          console.log(
            `AI失業保険ラボ self test: ${passed}/${tests.length} passed`
          );
      
          return {
            passed,
            total: tests.length,
            allPassed:
              passed ===
              tests.length
          };
        };