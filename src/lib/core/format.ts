// Repris de dca-crypto (commit 9414232, src/lib/core/format.ts).
/**
 * Formatage à la française pour l'affichage (jamais pour les calculs).
 * Les décimaux passent à Intl sous forme de chaîne : aucune perte de précision.
 */
import { D, type Dec } from './money';

const eur2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const pct1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const int = new Intl.NumberFormat('fr-FR');

type Num = Intl.StringNumericLiteral;
const s = (d: Dec, places: number): Num => d.toDecimalPlaces(places, D.ROUND_HALF_UP).toFixed() as Num;

/** Montant au centime : « 1 234,56 € ». */
export function eur(d: Dec): string {
  return eur2.format(s(d, 2));
}

/** Montant à l'euro : « 1 235 € » (axes de graphiques). */
export function eurRound(d: Dec): string {
  return eur0.format(s(d, 0));
}

/** Montant signé : « +12,30 € », « −4,00 € ». */
export function eurSigned(d: Dec): string {
  const text = eur(d.abs());
  return d.isZero() ? text : d.isNeg() ? `−${text}` : `+${text}`;
}

/** Cours d'un actif : 2 décimales au-delà de 100 €, 4 au-delà de 1 €, 6 chiffres significatifs en dessous (comme pmpa D-030). */
export function eurPrice(d: Dec): string {
  const a = d.abs();
  if (a.gte(100)) return eur(d);
  const places = a.gte(1) ? 4 : Math.max(2, 6 - (a.isZero() ? 0 : Math.floor(Math.log10(a.toNumber())) + 1));
  const f = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: places });
  return f.format(s(d, places));
}

/** Quantité : jusqu'à 8 décimales, zéros inutiles retirés. */
export function qty(d: Dec, places = 8): string {
  const f = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: places });
  return f.format(d.toDecimalPlaces(places, D.ROUND_DOWN).toFixed() as Num);
}

/** Pourcentage signé : « +12,3 % ». */
export function pct(d: Dec): string {
  return `${pct1.format(s(d, 1))} %`.replace('-', '−');
}

export function integer(n: number): string {
  return int.format(n);
}

/** AAAA-MM-JJ → JJ/MM/AAAA. */
export function dateFr(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** AAAA-MM-JJ → « janv. 2024 ». */
export function monthYear(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/** Durée lisible entre deux dates : « 3 ans et 2 mois ». */
export function duration(from: string, to: string): string {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
  if (months < 1) {
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
    return `${days} jour${days > 1 ? 's' : ''}`;
  }
  const years = Math.floor(months / 12);
  months %= 12;
  const parts = [];
  if (years) parts.push(`${years} an${years > 1 ? 's' : ''}`);
  if (months) parts.push(`${months} mois`);
  return parts.join(' et ');
}
