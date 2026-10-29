const test = require('node:test');
const assert = require('node:assert/strict');
const { BONUS_TIERS, roundMoney, getBonusDetails, calculateBonus, calculateRatio, estimateTarget } = require('../assets/trade-math.js');

test('70 site / 65 net cash: $6 site skin + $5 included charm returns $5.43 before fees', () => {
  const ratio = calculateRatio(70, 65, 0);
  const result = estimateTarget({ sitePrice: 6, weaponGross: 6, charmGross: 5, charmIncluded: true, ratio });

  assert.equal(result.grossMarket, 11);
  assert.equal(result.cashCost, 5.57);
  assert.equal(result.netMarket, 11);
  assert.equal(result.profit, 5.43);
});

test('sale fee is applied to weapon plus included charm before profit is calculated', () => {
  const ratio = calculateRatio(70, 65, 0);
  const result = estimateTarget({ sitePrice: 6, weaponGross: 6, charmGross: 5, charmIncluded: true, ratio, feePercent: 2 });

  assert.equal(result.fee, 0.22);
  assert.equal(result.netMarket, 10.78);
  assert.equal(result.profit, 5.21);
});

test('a charm excluded by the user contributes no market value', () => {
  const ratio = calculateRatio(70, 65, 0);
  const result = estimateTarget({ sitePrice: 6, weaponGross: 6, charmGross: 5, charmIncluded: false, ratio });

  assert.equal(result.grossMarket, 6);
  assert.equal(result.charmGross, 0);
  assert.equal(result.profit, 0.43);
});

test('SkinMonkey first-deposit reward uses fixed screenshot tiers, not a percentage', () => {
  assert.deepEqual(BONUS_TIERS, [
    { threshold: 10, bonus: 0.5 },
    { threshold: 50, bonus: 2.5 },
    { threshold: 100, bonus: 5 },
  ]);
  assert.equal(calculateBonus(21.45, true), 0.5);
  assert.equal(calculateBonus(50, true), 2.5);
  assert.equal(calculateBonus(100, true), 5);
  assert.equal(calculateBonus(70, false), 0);
  assert.equal(calculateBonus(9.99, true), 0);
});

test('21.45 deposit, 0.50 eligible bonus and 21.32 site spend leaves 0.63 site credit', () => {
  const depositSite = 21.45;
  const bonus = calculateBonus(depositSite, true);
  const targetSite = 21.32;
  const remainingSite = Math.round((depositSite + bonus - targetSite) * 100) / 100;

  assert.equal(bonus, 0.5);
  assert.equal(remainingSite, 0.63);
  assert.equal(calculateBonus(depositSite, false), 0);
});

test('remaining site credit is separate, and portfolio net profit reconciles to target net profit', () => {
  const depositSite = 21.45;
  const depositCash = 21.45;
  const bonus = calculateBonus(depositSite, true);
  const targetSite = 21.32;
  const ratio = calculateRatio(depositSite, depositCash, bonus);
  const result = estimateTarget({ sitePrice: targetSite, weaponGross: 21.32, ratio });
  const remainingSite = roundMoney(depositSite + bonus - targetSite);
  const remainingCash = roundMoney(remainingSite / ratio);
  const totalPortfolioProfit = result.netMarket + remainingCash - depositCash;

  assert.equal(remainingSite, 0.63);
  assert.equal(result.cashCost, 20.83);
  assert.equal(result.profit, 0.49);
  assert.equal(Math.round((totalPortfolioProfit + Number.EPSILON) * 100) / 100, result.profit);
});

test('bonus progress communicates the next fixed threshold and amount', () => {
  assert.deepEqual(getBonusDetails(21.45), {
    currentThreshold: 10,
    bonus: 0.5,
    nextThreshold: 50,
    nextBonus: 2.5,
    remainingToNext: 28.55,
    progress: 1 / 3 + (11.45 / 40) / 3,
  });
});

test('a target at the cash-equivalent cost is break-even after cent rounding', () => {
  const result = estimateTarget({ sitePrice: 6, weaponGross: 5.57, ratio: calculateRatio(70, 65, 0) });

  assert.equal(result.cashCost, 5.57);
  assert.equal(result.profit, 0);
});

test('zero cash basis returns no profit estimate until an investment ratio exists', () => {
  const result = estimateTarget({ sitePrice: 6, weaponGross: 11, ratio: 0 });

  assert.equal(result.cashCost, 0);
  assert.equal(result.profit, 0);
  assert.equal(result.margin, 0);
});
