/**
 * Prix du jour en euros via l'API publique de Binance (D-004).
 * Repris de pmpa-crypto (commit 37e9dc9, src/lib/prices/binance.ts) : liste
 * des paires et dernier prix en une requête (/api/v3/ticker/price, pmpa D-028
 * et D-030), hôtes et chemins de conversion en euros identiques. Seule la
 * partie « prix actuel » est reprise.
 *
 * Seule fonction de l'outil qui contacte un service extérieur, uniquement après
 * le consentement de l'utilisateur. Rien n'est envoyé : la requête demande la
 * liste publique de tous les cours, l'actif est cherché dans la réponse.
 */
import { D, dec, type Dec } from '../core/money';

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com'];

export class PriceFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PriceFetchError';
  }
}

export interface PriceQuote {
  price: Dec;
  /** Chemin utilisé, ex. « SOLUSDT ÷ EURUSDT ». */
  route: string;
}

/** Toutes les paires listées avec leur dernier prix (null s'il est illisible). */
export async function loadTicker(fetcher: Fetcher = (url) => fetch(url)): Promise<Map<string, Dec | null>> {
  for (const host of HOSTS) {
    try {
      const res = await fetcher(`${host}/api/v3/ticker/price`);
      if (!res.ok) continue;
      const data = (await res.json()) as { symbol: string; price: string }[];
      if (!Array.isArray(data) || data.length === 0) continue;
      const map = new Map<string, Dec | null>();
      for (const d of data) {
        let price: Dec | null = null;
        try {
          const p = dec(String(d.price));
          if (p.gt(0)) price = p;
        } catch {
          // prix illisible : la paire reste connue, sans cours
        }
        map.set(d.symbol, price);
      }
      return map;
    } catch {
      // hôte suivant
    }
  }
  throw new PriceFetchError('Impossible de joindre Binance (connexion coupée ou accès bloqué par le navigateur).');
}

/** Prix en euros d'un actif : paire directe, via USDT, USDC ou BTC (chemins de pmpa D-026). */
export function priceEur(asset: string, ticker: Map<string, Dec | null>): PriceQuote | null {
  const get = (symbol: string) => ticker.get(symbol) ?? null;
  const a = asset.toUpperCase();
  if (a === 'EUR') return { price: new D(1), route: 'EUR' };

  const direct = get(`${a}EUR`);
  if (direct) return { price: direct, route: `${a}EUR` };

  const eurUsdt = get('EURUSDT');
  if (!eurUsdt || eurUsdt.isZero()) return null;
  if (a === 'USDT' || a === 'USD') return { price: new D(1).dividedBy(eurUsdt), route: '1 ÷ EURUSDT' };

  const viaUsdt = get(`${a}USDT`);
  if (viaUsdt) return { price: viaUsdt.dividedBy(eurUsdt), route: `${a}USDT ÷ EURUSDT` };

  const viaUsdc = get(`${a}USDC`);
  const usdcUsdt = get('USDCUSDT');
  if (viaUsdc && usdcUsdt) return { price: viaUsdc.times(usdcUsdt).dividedBy(eurUsdt), route: `${a}USDC × USDCUSDT ÷ EURUSDT` };

  const viaBtc = get(`${a}BTC`);
  const btcEur = get('BTCEUR');
  if (viaBtc && btcEur) return { price: viaBtc.times(btcEur), route: `${a}BTC × BTCEUR` };
  return null;
}

/** Arrondi d'un cours à l'enregistrement (pmpa D-030) : 2 décimales au-delà de 100 €, 4 au-delà de 1 €, 6 chiffres significatifs en dessous. */
export function roundPrice(price: Dec): Dec {
  if (price.gte(100)) return price.toDecimalPlaces(2, D.ROUND_HALF_UP);
  if (price.gte(1)) return price.toDecimalPlaces(4, D.ROUND_HALF_UP);
  return price.toSignificantDigits(6, D.ROUND_HALF_UP);
}
