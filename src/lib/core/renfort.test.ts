import { describe, expect, it } from 'vitest';
import { dec, type Dec } from './money';
import {
  amountForTarget,
  amountToInvest,
  breakEvenPrice,
  budgetScenarios,
  buy,
  cost,
  exposure,
  latentGain,
  limitPrice,
  maxPriceForTarget,
  netValue,
  position,
  targetCurve,
  targetScenarios,
} from './renfort';

const r = (d: Dec, places = 12) => d.toDecimalPlaces(places).toFixed();
const zero = dec(0);

describe('break-even et plus-value latente', () => {
  it('break-even = PMP ÷ (1 − frais de vente)', () => {
    expect(r(breakEvenPrice(dec(100), zero))).toBe('100');
    expect(r(breakEvenPrice(dec(100), dec('0.001')), 6)).toBe('100.1001');
    expect(r(breakEvenPrice(dec(80000), dec('0.002')), 2)).toBe('80160.32');
  });

  it('plus-value latente nulle exactement au break-even (D-010)', () => {
    const p = position('0.37', '91234.56');
    const fee = dec('0.0015');
    const be = breakEvenPrice(p.pmp, fee);
    expect(r(latentGain(p, be, fee), 30)).toBe('0');
    expect(latentGain(p, be.mul('1.01'), fee).gt(0)).toBe(true);
  });

  it('valeur nette et coût', () => {
    const p = position(2, 50);
    expect(r(cost(p))).toBe('100');
    expect(r(netValue(p, dec(60), dec('0.01')))).toBe('118.8');
    expect(r(latentGain(p, dec(40), zero))).toBe('-20');
  });

  it('refuse des frais hors de [0, 100 %[', () => {
    expect(() => breakEvenPrice(dec(100), dec(1))).toThrow(RangeError);
    expect(() => breakEvenPrice(dec(100), dec('-0.01'))).toThrow(RangeError);
  });
});

describe('achat', () => {
  it('sans frais : 50 € à 50 € sur 1 unité à 100 € → 2 unités à 75 €', () => {
    const res = buy(position(1, 100), dec(50), dec(50), zero);
    expect(r(res.quantityBought)).toBe('1');
    expect(r(res.after.quantity)).toBe('2');
    expect(r(res.after.pmp)).toBe('75');
    expect(res.raisesPmp).toBe(false);
  });

  it('frais inclus dans le montant décaissé et dans le PMP (D-002)', () => {
    const res = buy(position(0, 0), dec(1000), dec(100), dec('0.01'));
    expect(r(res.fees)).toBe('10');
    expect(r(res.quantityBought)).toBe('9.9');
    // PMP = 1000 / 9,9 = prix ÷ (1 − frais)
    expect(r(res.after.pmp, 10)).toBe('101.0101010101');
  });

  it('acheter au-dessus du PMP le fait monter', () => {
    const res = buy(position(1, 100), dec(150), dec(150), zero);
    expect(r(res.after.pmp)).toBe('125');
    expect(res.raisesPmp).toBe(true);
  });

  it('montant nul : position inchangée', () => {
    const res = buy(position('0.5', 100000), zero, dec(60000), dec('0.001'));
    expect(r(res.after.quantity)).toBe('0.5');
    expect(r(res.after.pmp)).toBe('100000');
  });

  it('refuse un prix nul ou un montant négatif', () => {
    expect(() => buy(position(1, 100), dec(10), zero, zero)).toThrow(RangeError);
    expect(() => buy(position(1, 100), dec(-10), dec(50), zero)).toThrow(RangeError);
  });
});

describe('montant pour atteindre un PMP cible', () => {
  it('sans frais : 1 unité à 100 €, achat à 50 €, cible 75 € → 50 €', () => {
    const res = amountForTarget(position(1, 100), dec(75), dec(50), zero);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(r(res.amount)).toBe('50');
    expect(r(res.buy.after.pmp)).toBe('75');
  });

  it('exemple BTC avec frais : 0,5 BTC à 100 000 €, achat à 60 000 €, cible 80 000 €, frais 0,1 %', () => {
    const res = amountForTarget(position('0.5', 100000), dec(80000), dec(60000), dec('0.001'));
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    // M = 0,5 × 20 000 ÷ (80 000 × 0,999 ÷ 60 000 − 1) = 10 000 ÷ 0,332
    expect(r(res.amount, 6)).toBe('30120.481928');
    expect(r(amountToInvest(res.amount))).toBe('30120.49');
    expect(r(res.limitPrice)).toBe('79920');
    // Le PMP obtenu est exactement la cible.
    expect(r(res.buy.after.pmp, 20)).toBe('80000');
  });

  it('le montant arrondi au centime supérieur atteint bien la cible', () => {
    const p = position('1.2345', '43210.98');
    const res = amountForTarget(p, dec(38000), dec('29876.5'), dec('0.0025'));
    if (res.status !== 'ok') throw new Error(res.status);
    const rounded = buy(p, amountToInvest(res.amount), dec('29876.5'), dec('0.0025'));
    expect(rounded.after.pmp.lte(38000)).toBe(true);
  });

  it('cible déjà atteinte (Y ≥ PMP)', () => {
    expect(amountForTarget(position(1, 100), dec(100), dec(50), zero).status).toBe('reached');
    expect(amountForTarget(position(1, 100), dec(120), dec(50), zero).status).toBe('reached');
  });

  it('inatteignable si le prix d’achat atteint Y × (1 − f)', () => {
    const atLimit = amountForTarget(position(1, 100), dec(80), dec('79.2'), dec('0.01'));
    expect(atLimit).toEqual({ status: 'unreachable', limitPrice: dec('79.2') });
    expect(amountForTarget(position(1, 100), dec(80), dec(90), zero).status).toBe('unreachable');
    // Juste sous la limite : possible, mais montant énorme.
    const near = amountForTarget(position(1, 100), dec(80), dec('79.19'), dec('0.01'));
    if (near.status !== 'ok') throw new Error(near.status);
    expect(near.amount.gt(150000)).toBe(true);
  });

  it('le montant explose à l’approche de la limite', () => {
    const p = position(1, 100);
    const a = (price: number) => {
      const res = amountForTarget(p, dec(80), dec(price), zero);
      if (res.status !== 'ok') throw new Error(res.status);
      return res.amount;
    };
    expect(r(a(40))).toBe('20');
    expect(r(a(60))).toBe('60');
    expect(r(a(76))).toBe('380');
    expect(r(a(79))).toBe('1580');
  });

  it('sans position : pas de PMP à faire baisser', () => {
    expect(amountForTarget(position(0, 0), dec(80), dec(50), zero).status).toBe('no-position');
    expect(amountForTarget(position(1, 0), dec(80), dec(50), zero).status).toBe('no-position');
  });

  it('refuse une cible ou un prix nuls', () => {
    expect(() => amountForTarget(position(1, 100), zero, dec(50), zero)).toThrow(RangeError);
    expect(() => amountForTarget(position(1, 100), dec(80), zero, zero)).toThrow(RangeError);
  });
});

describe('prix maximum avec un budget', () => {
  it('sans frais : budget 50 €, cible 75 € → prix maximum 50 €', () => {
    const res = maxPriceForTarget(position(1, 100), dec(75), dec(50), zero);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(r(res.price)).toBe('50');
  });

  it('cohérent avec le montant pour une cible (aller-retour)', () => {
    const p = position('0.5', 100000);
    const fee = dec('0.001');
    const max = maxPriceForTarget(p, dec(80000), dec(30000), fee);
    if (max.status !== 'ok') throw new Error(max.status);
    const back = amountForTarget(p, dec(80000), max.price, fee);
    if (back.status !== 'ok') throw new Error(back.status);
    expect(r(back.amount, 8)).toBe('30000');
  });

  it('tend vers la limite quand le budget grandit, sans l’atteindre', () => {
    const res = maxPriceForTarget(position(1, 100), dec(80), dec('1e12'), zero);
    if (res.status !== 'ok') throw new Error(res.status);
    expect(res.price.lt(80)).toBe(true);
    expect(res.price.gt('79.99')).toBe(true);
  });

  it('cible atteinte, sans position, budget nul', () => {
    expect(maxPriceForTarget(position(1, 100), dec(100), dec(50), zero).status).toBe('reached');
    expect(maxPriceForTarget(position(0, 0), dec(80), dec(50), zero).status).toBe('no-position');
    expect(() => maxPriceForTarget(position(1, 100), dec(80), zero, zero)).toThrow(RangeError);
  });
});

describe('prix limite', () => {
  it('Y × (1 − f)', () => {
    expect(r(limitPrice(dec(80000), dec('0.001')))).toBe('79920');
    expect(r(limitPrice(dec(80), zero))).toBe('80');
  });
});

describe('exposition (D-006)', () => {
  it('avant et après un renfort : capital engagé, perte à −20 %, hausse pour le break-even', () => {
    const before = position(1, 100);
    const after = buy(before, dec(50), dec(50), zero).after;
    const e1 = exposure(before, dec(50), zero);
    const e2 = exposure(after, dec(50), zero);
    expect(r(e1.engaged)).toBe('100');
    expect(r(e1.valueAfterShock)).toBe('40');
    expect(r(e1.gainAfterShock)).toBe('-60');
    expect(r(e1.riseToBreakEven)).toBe('1');
    expect(r(e2.engaged)).toBe('150');
    expect(r(e2.gainAfterShock)).toBe('-70');
    expect(r(e2.riseToBreakEven)).toBe('0.5');
  });

  it('frais de vente inclus dans le break-even ; hausse négative si déjà au-dessus', () => {
    const e = exposure(position(1, 100), dec(120), dec('0.01'), dec('0.1'));
    expect(r(e.breakEven, 8)).toBe('101.01010101');
    expect(e.riseToBreakEven.isNeg()).toBe(true);
    expect(r(e.valueAfterShock)).toBe('106.92');
  });
});

describe('scénarios', () => {
  it('cible : un montant par niveau de baisse, cases impossibles marquées', () => {
    const rows = targetScenarios(position(1, 100), dec(80), dec(80), zero, ['0', '0.25', '0.5']);
    expect(rows.map((x) => r(x.price))).toEqual(['80', '60', '40']);
    expect(rows[0].result.status).toBe('unreachable');
    expect(rows[1].result.status === 'ok' && r(rows[1].result.amount)).toBe('60');
    expect(rows[2].result.status === 'ok' && r(rows[2].result.amount)).toBe('20');
  });

  it('budget : un nouveau PMP par niveau de baisse', () => {
    const rows = budgetScenarios(position(1, 100), dec(50), dec(100), zero, ['0', '0.5']);
    expect(rows.map((x) => r(x.result.after.pmp))).toEqual(['100', '75']);
  });

  it('baisses par défaut : 0 à 50 %', () => {
    expect(budgetScenarios(position(1, 100), dec(50), dec(100), zero)).toHaveLength(7);
  });

  it('refuse une baisse de 100 % ou négative', () => {
    expect(() => budgetScenarios(position(1, 100), dec(50), dec(100), zero, ['1'])).toThrow(RangeError);
    expect(() => targetScenarios(position(1, 100), dec(80), dec(100), zero, ['-0.1'])).toThrow(RangeError);
  });
});

describe('courbe du montant nécessaire (D-007)', () => {
  it('points croissants jusqu’à 97 % du prix limite', () => {
    const pts = targetCurve(position(1, 100), dec(80), zero, dec(40), 5);
    expect(pts).toHaveLength(5);
    expect(r(pts[0].price)).toBe('40');
    expect(r(pts[4].price)).toBe('77.6');
    for (let i = 1; i < pts.length; i++) expect(pts[i].amount.gt(pts[i - 1].amount)).toBe(true);
  });

  it('vide si la cible est atteinte, sans position ou si le départ dépasse la limite', () => {
    expect(targetCurve(position(1, 100), dec(100), zero, dec(40))).toEqual([]);
    expect(targetCurve(position(0, 0), dec(80), zero, dec(40))).toEqual([]);
    expect(targetCurve(position(1, 100), dec(80), zero, dec(79))).toEqual([]);
  });
});
