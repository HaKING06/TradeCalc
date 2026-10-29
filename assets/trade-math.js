(function (root) {
  'use strict';

  const roundMoney = (value) => {
    const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    return rounded === 0 ? 0 : rounded;
  };
  const nonNegative = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, nonNegative(value)));
  const BONUS_TIERS = Object.freeze([
    Object.freeze({ threshold: 10, bonus: 0.50 }),
    Object.freeze({ threshold: 50, bonus: 2.50 }),
    Object.freeze({ threshold: 100, bonus: 5.00 }),
  ]);

  function getBonusDetails(siteValue) {
    const site = nonNegative(siteValue);
    let current = { threshold: 0, bonus: 0 };
    BONUS_TIERS.forEach((tier) => { if (site >= tier.threshold) current = tier; });
    const next = BONUS_TIERS.find((tier) => site < tier.threshold) || null;
    let progress = 1;
    if (site < 10) progress = site / 10 / 3;
    else if (site < 50) progress = 1 / 3 + ((site - 10) / 40) / 3;
    else if (site < 100) progress = 2 / 3 + ((site - 50) / 50) / 3;
    return {
      currentThreshold: current.threshold,
      bonus: current.bonus,
      nextThreshold: next ? next.threshold : null,
      nextBonus: next ? next.bonus : current.bonus,
      remainingToNext: next ? roundMoney(next.threshold - site) : 0,
      progress: Math.max(0, Math.min(1, progress)),
    };
  }

  function calculateBonus(siteValue, eligible) {
    return eligible ? getBonusDetails(siteValue).bonus : 0;
  }

  function calculateRatio(siteValue, cashValue, bonus) {
    const cash = nonNegative(cashValue);
    return cash > 0 ? (nonNegative(siteValue) + nonNegative(bonus)) / cash : 0;
  }

  function estimateTarget({ sitePrice, weaponGross, charmGross = 0, charmIncluded = false, ratio, feePercent = 0 }) {
    const site = nonNegative(sitePrice);
    const weapon = nonNegative(weaponGross);
    const charm = charmIncluded ? nonNegative(charmGross) : 0;
    const grossMarket = roundMoney(weapon + charm);
    const feeRate = clamp(feePercent, 0, 50);
    const fee = roundMoney(grossMarket * feeRate / 100);
    const netMarket = roundMoney(grossMarket - fee);
    const siteCashRatio = Number.isFinite(Number(ratio)) && Number(ratio) > 0 ? Number(ratio) : 0;
    const cashCostExact = siteCashRatio > 0 ? site / siteCashRatio : 0;
    const cashCost = roundMoney(cashCostExact);
    const grossProfitExact = siteCashRatio > 0 ? grossMarket - cashCostExact : 0;
    const profitExact = siteCashRatio > 0 ? netMarket - cashCostExact : 0;

    return {
      weaponGross: roundMoney(weapon),
      charmGross: roundMoney(charm),
      grossMarket,
      fee,
      feePercent: feeRate,
      netMarket,
      cashCostExact,
      cashCost,
      grossProfitExact,
      grossProfit: roundMoney(grossProfitExact),
      profitExact,
      profit: roundMoney(profitExact),
      margin: cashCostExact > 0 ? profitExact / cashCostExact : 0,
    };
  }

  const api = Object.freeze({ BONUS_TIERS, roundMoney, getBonusDetails, calculateBonus, calculateRatio, estimateTarget });
  root.TradeMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
