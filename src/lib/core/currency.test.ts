import { describe, expect, it } from 'vitest';
import { dec } from 'commun-crypto/money';
import { convert, convertAmounts, eurUsdcRate, formatter, priceIn, priceUsdc, rateText, readAmount } from './currency';

const NBSP = /[  ]/g;
const plain = (s: string) => s.replace(NBSP, ' ');

const TICKER = new Map([
  ['BTCEUR', dec('60000')],
  ['BTCUSDC', dec('65100')],
  ['EURUSDC', dec('1.085')],
  ['EURUSDT', dec('1.08')],
  ['USDCUSDT', dec('0.9995')],
  ['SOLUSDT', dec('216')],
  ['ABCEUR', dec('2')],
  ['XYZBTC', dec('0.0001')],
] as [string, ReturnType<typeof dec> | null][]);

describe('affichage', () => {
  it('euro et dollar, symbole après le nombre', () => {
    expect(plain(formatter('EUR').money(dec('1234.5')))).toBe('1 234,50 €');
    expect(plain(formatter('USD').money(dec('1234.5')))).toBe('1 234,50 $');
    expect(plain(formatter('USD').signed(dec('-4')))).toBe('−4,00 $');
    expect(plain(formatter('USD').round(dec('65123.7')))).toBe('65 124 $');
  });

  it('cours : décimales selon le niveau (pmpa D-030)', () => {
    const f = formatter('USD');
    expect(plain(f.price(dec('65100.123')))).toBe('65 100,12 $');
    expect(plain(f.price(dec('2.34567')))).toBe('2,3457 $');
    expect(plain(f.price(dec('0.000123456')))).toBe('0,000123456 $');
  });

  it('taux', () => {
    expect(plain(rateText(dec('1.085')))).toBe('1 € = 1,0850 $');
  });
});

describe('saisie', () => {
  it('« $ » ignoré comme « € »', () => {
    expect(readAmount('65 100 $')!.toString()).toBe('65100');
    expect(readAmount('$1,234.5')!.toString()).toBe('1234.5');
    expect(readAmount('')).toBeNull();
  });
});

describe('conversion', () => {
  it('€ → $ multiplie, $ → € divise, aller-retour exact', () => {
    const rate = dec('1.085');
    expect(convert(dec('100'), 'EUR', 'USD', rate).toString()).toBe('108.5');
    expect(convert(dec('108.5'), 'USD', 'EUR', rate).toString()).toBe('100');
    expect(convert(dec('42'), 'EUR', 'EUR', rate).toString()).toBe('42');
    expect(() => convert(dec('1'), 'EUR', 'USD', dec(0))).toThrow(RangeError);
  });

  it('montants du formulaire : prix arrondis comme un cours, montant au centime, vides et illisibles laissés', () => {
    const form = { pmp: '100 000', price: '60000', target: '80 000,5', buyPrice: '', budget: '2 000', quantity: '0,5', other: 'abc' };
    const { form: out, converted } = convertAmounts({ ...form, buyPrice: 'x?' }, 'EUR', 'USD', dec('1.0853'));
    expect(converted).toBe(4);
    expect(out.pmp).toBe('108530');
    expect(out.price).toBe('65118');
    expect(out.target).toBe('86824,54');
    expect(out.budget).toBe('2170,6');
    expect(out.buyPrice).toBe('x?');
    expect(out.quantity).toBe('0,5');
  });

  it('petits cours : 6 chiffres significatifs', () => {
    const { form } = convertAmounts({ pmp: '0,000123', price: '1,5', target: '', buyPrice: '', budget: '' }, 'USD', 'EUR', dec('1.085'));
    expect(form.pmp).toBe('0,000113364');
    expect(form.price).toBe('1,3825');
  });

  it('même devise : rien ne change', () => {
    const f = { pmp: '1', price: '2', target: '', buyPrice: '', budget: '3' };
    expect(convertAmounts(f, 'USD', 'USD', dec('1.1'))).toEqual({ form: f, converted: 0 });
  });
});

describe('cours Binance en dollars (USDC)', () => {
  it('taux EUR/USDC', () => {
    expect(eurUsdcRate(TICKER)!.toString()).toBe('1.085');
    expect(eurUsdcRate(new Map())).toBeNull();
  });

  it('paire directe, via USDT, via l’euro', () => {
    expect(priceUsdc('btc', TICKER)).toEqual({ price: dec('65100'), route: 'BTCUSDC' });
    const sol = priceUsdc('SOL', TICKER)!;
    expect(sol.route).toBe('SOLUSDT ÷ USDCUSDT');
    expect(sol.price.toDecimalPlaces(4).toString()).toBe('216.1081');
    expect(priceUsdc('ABC', TICKER)).toEqual({ price: dec('2.17'), route: 'ABCEUR × EURUSDC' });
    expect(priceUsdc('XYZ', TICKER)!.route).toBe('XYZBTC × BTCEUR × EURUSDC');
    expect(priceUsdc('NOPE', TICKER)).toBeNull();
  });

  it('EUR et USDC', () => {
    expect(priceUsdc('EUR', TICKER)!.price.toString()).toBe('1.085');
    expect(priceUsdc('USDC', TICKER)!.price.toString()).toBe('1');
  });

  it('selon la devise du scénario', () => {
    expect(priceIn('EUR', 'BTC', TICKER)!.route).toBe('BTCEUR');
    expect(priceIn('USD', 'BTC', TICKER)!.route).toBe('BTCUSDC');
  });
});
