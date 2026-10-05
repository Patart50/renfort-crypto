import { describe, expect, it } from 'vitest';
import { compute, defaultForm, parseForm, parseNumber, type Form } from './calc';

const form = (over: Partial<Form>): Form => ({ ...defaultForm(), quantity: '0,5', pmp: '100000', price: '60000', buyFee: '0,1', sellFee: '0,1', target: '80000', ...over });
const values = (over: Partial<Form>) => {
  const r = parseForm(form(over));
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.values;
};

describe('parseNumber', () => {
  it('formats français et anglais', () => {
    expect(parseNumber('1 234,56')!.toString()).toBe('1234.56');
    expect(parseNumber('1 234,5 €')!.toString()).toBe('1234.5');
    expect(parseNumber('1.234,56')!.toString()).toBe('1234.56');
    expect(parseNumber('1,234.56')!.toString()).toBe('1234.56');
    expect(parseNumber('0.25')!.toString()).toBe('0.25');
    expect(parseNumber(',5')!.toString()).toBe('0.5');
    expect(parseNumber('0,1 %')!.toString()).toBe('0.1');
  });

  it('vide → null, illisible → erreur', () => {
    expect(parseNumber('  ')).toBeNull();
    expect(() => parseNumber('abc')).toThrow(RangeError);
    expect(() => parseNumber('1,2,3')).toThrow(RangeError);
    expect(() => parseNumber('1..2')).toThrow(RangeError);
  });
});

describe('parseForm', () => {
  it('valeurs converties : frais en fraction, prix d’achat par défaut = prix actuel', () => {
    const v = values({});
    expect(v.asset).toBe('BTC');
    expect(v.buyFee.toString()).toBe('0.001');
    expect(v.buyPrice.toString()).toBe('60000');
    expect(v.buyPriceGiven).toBe(false);
  });

  it('champs obligatoires et messages nominatifs', () => {
    const r = parseForm(form({ quantity: '', price: '0', target: 'x' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.quantity).toMatch(/à renseigner/);
    expect(r.errors.price).toMatch(/supérieur à zéro/);
    expect(r.errors.target).toMatch(/invalide/);
  });

  it('frais ≥ 100 % et valeurs négatives refusés', () => {
    const r = parseForm(form({ buyFee: '100', sellFee: '-1' }));
    expect(!r.ok && r.errors.buyFee).toMatch(/inférieur à 100/);
    expect(!r.ok && r.errors.sellFee).toMatch(/négatif/);
  });

  it('mode cible sans position : renvoi vers le mode montant', () => {
    const r = parseForm(form({ quantity: '0', pmp: '' }));
    expect(!r.ok && r.errors.quantity).toMatch(/Investir un montant/);
  });

  it('mode montant sans position : PMP facultatif (premier achat)', () => {
    const v = values({ mode: 'budget', quantity: '0', pmp: '', budget: '1000', target: '' });
    expect(v.position.pmp.isZero()).toBe(true);
    expect(v.target).toBeNull();
  });

  it('quantité détenue sans PMP refusée', () => {
    const r = parseForm(form({ pmp: '' }));
    expect(!r.ok && r.errors.pmp).toMatch(/à renseigner/);
  });

  it('crypto : lettres et chiffres', () => {
    expect(values({ asset: ' eth ' }).asset).toBe('ETH');
    const r = parseForm(form({ asset: 'BTC/EUR' }));
    expect(!r.ok && r.errors.asset).toBeTruthy();
  });
});

describe('compute', () => {
  it('mode cible : montant, position après, exposition, scénarios, courbe', () => {
    const res = compute(values({}));
    expect(res.target?.status).toBe('ok');
    expect(res.buy!.amount.toDecimalPlaces(2).toString()).toBe('30120.48');
    expect(res.after!.position.pmp.toDecimalPlaces(8).toString()).toBe('80000');
    expect(res.before.cost.toString()).toBe('50000');
    expect(res.after!.cost.gt(res.before.cost)).toBe(true);
    expect(res.targetRows).toHaveLength(7);
    expect(res.budgetRows).toHaveLength(0);
    expect(res.chart.points.length).toBeGreaterThan(10);
    expect(res.chart.marker?.x.toString()).toBe('60000');
    expect(res.chart.vertical?.x.toString()).toBe('79920');
  });

  it('mode cible inatteignable au prix actuel : pas de position après, scénarios quand même', () => {
    const res = compute(values({ price: '85000' }));
    expect(res.target?.status).toBe('unreachable');
    expect(res.after).toBeNull();
    expect(res.targetRows.some((r) => r.result.status === 'ok')).toBe(true);
    expect(res.chart.marker).toBeNull();
  });

  it('mode cible déjà atteinte : pas de courbe', () => {
    const res = compute(values({ target: '120000' }));
    expect(res.target?.status).toBe('reached');
    expect(res.chart.points).toHaveLength(0);
  });

  it('mode montant : nouveau PMP, prix maximum si une cible est saisie', () => {
    const res = compute(values({ mode: 'budget', budget: '30000' }));
    expect(res.buy).not.toBeNull();
    expect(res.after!.position.pmp.lt(100000)).toBe(true);
    expect(res.maxPrice?.status).toBe('ok');
    expect(res.budgetRows).toHaveLength(7);
    expect(res.chart.reference?.y.toString()).toBe('100000');
    expect(res.chart.marker?.x.toString()).toBe('60000');
  });

  it('mode montant sans cible : pas de prix maximum', () => {
    const res = compute(values({ mode: 'budget', budget: '2000', target: '' }));
    expect(res.maxPrice).toBeNull();
  });

  it('prix d’achat saisi distinct du prix actuel', () => {
    const res = compute(values({ buyPrice: '50000' }));
    expect(res.buy!.price.toString()).toBe('50000');
    // Exposition et latent restent évalués au prix actuel.
    expect(res.after!.latent.toDecimalPlaces(2).toString()).toBe(
      res.after!.position.quantity.mul(60000).mul('0.999').minus(res.after!.cost).toDecimalPlaces(2).toString(),
    );
  });
});
