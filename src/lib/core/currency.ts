/**
 * Devise du scénario (D-019) : euro ou dollar, le dollar étant celui de Binance,
 * c'est-à-dire l'USDC. Le calcul de renfort ne dépend pas de la devise, pourvu
 * que tous les montants soient dans la même : ce module s'occupe seulement de
 * l'affichage, du taux EUR/USDC et de la conversion des montants saisis.
 */
import { D, type Dec } from 'commun-crypto/money';
import { parseNumber } from 'commun-crypto/parse';
import { priceEur, roundPrice, type PriceQuote } from 'commun-crypto/binance';

export type Currency = 'EUR' | 'USD';
export const CURRENCIES: readonly Currency[] = ['EUR', 'USD'];

export function isCurrency(v: unknown): v is Currency {
  return v === 'EUR' || v === 'USD';
}

export const SYMBOL: Record<Currency, string> = { EUR: '€', USD: '$' };

/** Paire spot Binance du taux : cours de 1 € en USDC. */
export const FX_PAIR = 'EURUSDC';

/** Lecture d'un nombre saisi : comme `parseNumber` du paquet commun, « $ » ignoré en plus. */
export function readAmount(raw: string): Dec | null {
  return parseNumber(raw.replace(/\$/g, ''));
}

// ---------- Affichage ----------

type Num = Intl.StringNumericLiteral;
const s = (d: Dec, places: number): Num => d.toDecimalPlaces(places, D.ROUND_HALF_UP).toFixed() as Num;

export interface Fmt {
  currency: Currency;
  symbol: string;
  /** Montant au centime : « 1 234,56 € », « 1 234,56 $ ». */
  money(d: Dec): string;
  /** Montant à l'unité (axes de graphiques). */
  round(d: Dec): string;
  /** Montant signé : « +12,30 $ », « −4,00 € ». */
  signed(d: Dec): string;
  /** Cours : 2 décimales au-delà de 100, 4 au-delà de 1, 6 chiffres significatifs en dessous (pmpa D-030). */
  price(d: Dec): string;
}

const cache = new Map<string, Intl.NumberFormat>();
function nf(currency: Currency, min: number, max: number): Intl.NumberFormat {
  const key = `${currency}:${min}:${max}`;
  let f = cache.get(key);
  if (!f) {
    // « narrowSymbol » : « $ » plutôt que « $US » en français.
    f = new Intl.NumberFormat('fr-FR', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

const formatters = new Map<Currency, Fmt>();

export function formatter(currency: Currency): Fmt {
  let f = formatters.get(currency);
  if (f) return f;
  const money = (d: Dec) => nf(currency, 2, 2).format(s(d, 2));
  f = {
    currency,
    symbol: SYMBOL[currency],
    money,
    round: (d) => nf(currency, 0, 0).format(s(d, 0)),
    signed: (d) => {
      const text = money(d.abs());
      return d.isZero() ? text : d.isNeg() ? `−${text}` : `+${text}`;
    },
    price: (d) => {
      const a = d.abs();
      if (a.gte(100)) return money(d);
      const places = a.gte(1) ? 4 : Math.max(2, 6 - (a.isZero() ? 0 : Math.floor(Math.log10(a.toNumber())) + 1));
      return nf(currency, 2, places).format(s(d, places));
    },
  };
  formatters.set(currency, f);
  return f;
}

/** Taux affiché : « 1 € = 1,0850 $ ». */
export function rateText(rate: Dec): string {
  const f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return `1 € = ${f.format(rate.toDecimalPlaces(6, D.ROUND_HALF_UP).toFixed() as Num)} $`;
}

// ---------- Conversion ----------

/** Convertit un montant d'une devise à l'autre ; `rate` = USDC pour 1 €. */
export function convert(value: Dec, from: Currency, to: Currency, rate: Dec): Dec {
  if (from === to) return value;
  if (!rate.gt(0)) throw new RangeError(`Taux EUR/USDC invalide : ${rate.toString()}`);
  return from === 'EUR' ? value.mul(rate) : value.div(rate);
}

/** Champs de montant du formulaire : les prix, et le montant à investir. Quantités et frais ne changent pas. */
export const PRICE_FIELDS = ['pmp', 'price', 'target', 'buyPrice'] as const;
export const AMOUNT_FIELDS = ['budget'] as const;
type MoneyField = (typeof PRICE_FIELDS)[number] | (typeof AMOUNT_FIELDS)[number];

const toInput = (d: Dec) => d.toFixed().replace('.', ',');

/**
 * Convertit les montants saisis vers `to`. Les prix sont arrondis comme un cours
 * (pmpa D-030), le montant à investir au centime. Un champ vide ou illisible est
 * laissé tel quel. Renvoie les nouvelles valeurs et le nombre de champs convertis.
 */
export function convertAmounts<F extends Record<MoneyField, string>>(form: F, from: Currency, to: Currency, rate: Dec): { form: F; converted: number } {
  const out = { ...form };
  let converted = 0;
  if (from === to) return { form: out, converted };
  for (const field of [...PRICE_FIELDS, ...AMOUNT_FIELDS]) {
    let v: Dec | null;
    try {
      v = readAmount(form[field]);
    } catch {
      continue;
    }
    if (v === null || v.isNeg()) continue;
    const c = convert(v, from, to, rate);
    out[field] = toInput(field === 'budget' ? c.toDecimalPlaces(2, D.ROUND_HALF_UP) : roundPrice(c)) as F[typeof field];
    converted++;
  }
  return { form: out, converted };
}

// ---------- Cours Binance ----------

/** Taux EUR/USDC (USDC pour 1 €) dans la table des cours ; null si la paire manque. */
export function eurUsdcRate(ticker: Map<string, Dec | null>): Dec | null {
  return ticker.get(FX_PAIR) ?? null;
}

/**
 * Prix d'un actif en dollars (USDC). Ordre : paire directe XUSDC ; XUSDT ÷ USDCUSDT ;
 * sinon prix en euros (chemins de commun D-006) × EURUSDC.
 */
export function priceUsdc(asset: string, ticker: Map<string, Dec | null>): PriceQuote | null {
  const a = asset.toUpperCase();
  const get = (symbol: string) => ticker.get(symbol) ?? null;
  if (a === 'USDC' || a === 'USD') return { price: new D(1), route: 'USDC' };
  const fx = eurUsdcRate(ticker);
  if (a === 'EUR') return fx ? { price: fx, route: FX_PAIR } : null;

  const direct = get(`${a}USDC`);
  if (direct) return { price: direct, route: `${a}USDC` };

  const viaUsdt = get(`${a}USDT`);
  const usdcUsdt = get('USDCUSDT');
  if (viaUsdt && usdcUsdt) return { price: viaUsdt.dividedBy(usdcUsdt), route: `${a}USDT ÷ USDCUSDT` };

  const eur = priceEur(a, ticker);
  if (eur && fx) return { price: eur.price.times(fx), route: `${eur.route} × ${FX_PAIR}` };
  return null;
}

/** Prix d'un actif dans la devise du scénario. */
export function priceIn(currency: Currency, asset: string, ticker: Map<string, Dec | null>): PriceQuote | null {
  return currency === 'EUR' ? priceEur(asset, ticker) : priceUsdc(asset, ticker);
}
