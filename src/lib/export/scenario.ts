/**
 * Export d'un scénario (D-008) : CSV pour tableur, texte copiable, lien de partage.
 */
import { D, type Dec } from 'commun-crypto/money';
import { amountToInvest } from 'commun-crypto/renfort';
import { defaultForm, type Form, type Result } from '../core/calc';
import { pct, qty } from 'commun-crypto/format';
import { formatter, isCurrency, rateText, SYMBOL } from '../core/currency';

// ---------- CSV (dca D-015 : « ; », virgule décimale, BOM) ----------

/** Nombre pour tableur réglé en français : virgule décimale, sans séparateur de milliers. */
function n(d: Dec, places: number, rounding = D.ROUND_HALF_UP): string {
  return d.toFixed(places, rounding).replace('.', ',');
}
const money = (d: Dec) => n(d, 2);
const quantity = (d: Dec) => d.toDecimalPlaces(8, D.ROUND_DOWN).toFixed().replace('.', ',');
const rate = (d: Dec) => d.mul(100).toDecimalPlaces(4).toFixed().replace('.', ',');

function cell(v: string): string {
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function rows(lines: string[][]): string {
  return lines.map((l) => l.map(cell).join(';')).join('\r\n');
}

export function scenarioCsv(r: Result): string {
  const v = r.values;
  const asset = v.asset || 'crypto';
  const holds = v.position.quantity.gt(0);
  const c = `(${SYMBOL[v.currency]})`;
  const out: string[][] = [['renfort-crypto', 'Scénario de renfort'], [], ['Paramètre', 'Valeur']];
  out.push(['Devise', v.currency === 'EUR' ? `Euro ${c}` : 'Dollar, USDC ($)']);
  if (v.fx) out.push(['Taux EUR/USDC ($ pour 1 €)', v.fx.toDecimalPlaces(6).toFixed().replace('.', ',')]);
  out.push(['Crypto', asset], ['Quantité détenue', quantity(v.position.quantity)]);
  if (holds) out.push([`Prix moyen actuel ${c}`, money(v.position.pmp)]);
  out.push([`Prix actuel ${c}`, money(v.price)], ["Frais d'achat (%)", rate(v.buyFee)], ['Frais de vente (%)', rate(v.sellFee)]);
  out.push(['Mode', v.mode === 'target' ? 'Atteindre un prix moyen' : 'Investir un montant']);
  if (v.target) out.push([`Prix moyen visé ${c}`, money(v.target)]);
  if (v.budget) out.push([`Montant à investir ${c}`, money(v.budget)]);
  out.push([`Prix d'achat ${c}`, money(v.buyPrice)]);

  out.push([], ['Résultat', 'Valeur']);
  if (r.target && r.target.status !== 'ok') out.push(['Statut', targetStatusText(r)]);
  if (r.buy) {
    out.push([`Montant à investir, frais compris ${c}`, money(r.target?.status === 'ok' ? amountToInvest(r.buy.amount) : r.buy.amount)]);
    out.push([`Frais ${c}`, money(r.buy.fees)], ['Quantité achetée', quantity(r.buy.quantityBought)]);
    out.push(['Nouvelle quantité', quantity(r.buy.after.quantity)], [`Nouveau prix moyen ${c}`, money(r.buy.after.pmp)]);
  }
  if (r.target && r.target.status !== 'reached' && r.target.status !== 'no-position') out.push([`Prix d'achat limite ${c}`, money(r.target.limitPrice)]);
  if (r.maxPrice?.status === 'ok') out.push([`Prix d'achat maximum pour le prix moyen visé ${c}`, money(r.maxPrice.price)]);

  out.push([], ['Exposition', ...(holds ? ['Avant'] : []), ...(r.after ? ['Après'] : [])]);
  const sides = [...(holds ? [r.before] : []), ...(r.after ? [r.after] : [])];
  const line = (label: string, f: (s: Result['before']) => string) => out.push([label, ...sides.map(f)]);
  line(`Capital engagé ${c}`, (s) => money(s.cost));
  line(`Plus-value latente au prix actuel, nette ${c}`, (s) => money(s.latent));
  line(`Résultat si le cours baisse de 20 % ${c}`, (s) => money(s.exposure.gainAfterShock));
  line(`Prix de break-even ${c}`, (s) => money(s.breakEven));
  line('Hausse nécessaire pour le break-even (%)', (s) => n(s.exposure.riseToBreakEven.mul(100), 2));

  out.push([]);
  if (v.mode === 'target') {
    out.push(['Baisse (%)', `Prix d'achat ${c}`, `Montant à investir ${c}`, 'Quantité achetée', `Capital engagé après ${c}`]);
    for (const s of r.targetRows) {
      const base = [n(s.drop.mul(100), 2), money(s.price)];
      if (s.result.status === 'ok') out.push([...base, money(amountToInvest(s.result.amount)), quantity(s.result.buy.quantityBought), money(s.result.buy.before.quantity.mul(s.result.buy.before.pmp).plus(s.result.amount))]);
      else out.push([...base, s.result.status === 'unreachable' ? 'Inatteignable' : 'Déjà atteint', '', '']);
    }
  } else {
    out.push(['Baisse (%)', `Prix d'achat ${c}`, 'Quantité achetée', `Nouveau prix moyen ${c}`, `Capital engagé après ${c}`]);
    for (const s of r.budgetRows) {
      out.push([n(s.drop.mul(100), 2), money(s.price), quantity(s.result.quantityBought), money(s.result.after.pmp), money(s.result.after.quantity.mul(s.result.after.pmp))]);
    }
  }
  return '﻿' + rows(out) + '\r\n';
}

// ---------- Texte copiable ----------

export function targetStatusText(r: Result): string {
  const t = r.target;
  const f = formatter(r.values.currency);
  if (!t) return '';
  if (t.status === 'reached') return 'Votre prix moyen est déjà au niveau visé ou en dessous : aucun achat nécessaire.';
  if (t.status === 'no-position') return 'Aucune position : pas de prix moyen à faire baisser.';
  if (t.status === 'unreachable')
    return `Inatteignable à ce prix d'achat : il faut acheter sous ${f.price(t.limitPrice)} (prix limite), quel que soit le montant.`;
  return '';
}

export function scenarioText(r: Result): string {
  const v = r.values;
  const f = formatter(v.currency);
  const a = v.asset || 'crypto';
  const L: string[] = [];
  const holds = v.position.quantity.gt(0);
  L.push(
    holds
      ? `Position : ${qty(v.position.quantity)} ${a} à ${f.price(v.position.pmp)} de prix moyen (capital engagé ${f.money(r.before.cost)}).`
      : `Aucune position en ${a}.`,
  );
  L.push(`Prix actuel : ${f.price(v.price)}. Frais : ${pct(v.buyFee.mul(100)).replace('+', '')} à l'achat, ${pct(v.sellFee.mul(100)).replace('+', '')} à la vente.`);
  if (holds) L.push(`Break-even actuel : ${f.price(r.before.breakEven)}.`);
  if (v.mode === 'target') {
    L.push(`Objectif : prix moyen à ${f.price(v.target!)}, achat à ${f.price(v.buyPrice)}.`);
    if (r.target?.status === 'ok') {
      L.push(`→ Investir ${f.money(amountToInvest(r.buy!.amount))} (frais compris) pour ${qty(r.buy!.quantityBought)} ${a}.`);
      L.push(`→ Prix limite : ${f.price(r.target.limitPrice)} ; au-delà, la cible est inatteignable.`);
    } else L.push(`→ ${targetStatusText(r)}`);
  } else {
    L.push(`Objectif : investir ${f.money(v.budget!)} à ${f.price(v.buyPrice)}.`);
    L.push(`→ ${qty(r.buy!.quantityBought)} ${a} achetés, nouveau prix moyen ${f.price(r.buy!.after.pmp)}.`);
    if (r.maxPrice?.status === 'ok') L.push(`→ Pour un prix moyen à ${f.price(v.target!)} avec ce montant : acheter à ${f.price(r.maxPrice.price)} au plus.`);
  }
  if (r.after) {
    L.push(
      `Après : ${qty(r.after.position.quantity)} ${a}, capital engagé ${f.money(r.after.cost)}, break-even ${f.price(r.after.breakEven)}, ` +
        `résultat si le cours baisse de 20 % : ${f.money(r.after.exposure.gainAfterShock)}${holds ? ` (avant : ${f.money(r.before.exposure.gainAfterShock)})` : ''}.`,
    );
  }
  if (v.fx) L.push(`Taux EUR/USDC : ${rateText(v.fx)}.`);
  L.push('Calculé avec renfort-crypto (https://patart50.github.io/renfort-crypto/). Pas un conseil en investissement.');
  return L.join('\n');
}

// ---------- Lien de partage (fragment, jamais envoyé au serveur) ----------

type TextField = Exclude<keyof Form, 'mode' | 'currency'>;

const KEYS: Record<TextField, string> = {
  asset: 'a',
  quantity: 'q',
  pmp: 'pmp',
  price: 'c',
  buyFee: 'fa',
  sellFee: 'fv',
  target: 'y',
  budget: 'm',
  buyPrice: 'pa',
  fx: 'fx',
};

export const SHARE_PREFIX = '#partage?';

/** Fragment d'URL contenant les paramètres du scénario (champs vides omis, sauf les frais : vide = 0 %). */
export function shareFragment(form: Form): string {
  const p = new URLSearchParams();
  p.set('mode', form.mode === 'target' ? 'cible' : 'montant');
  // Devise (D-019) : absente des liens d'avant la 1.1, qui sont en euros.
  if (form.currency === 'USD') p.set('d', 'usd');
  for (const [field, key] of Object.entries(KEYS) as [TextField, string][]) {
    const value = form[field].trim();
    if (value || field === 'buyFee' || field === 'sellFee') p.set(key, value);
  }
  return SHARE_PREFIX + p.toString();
}

/** Lit un fragment de partage ; null s'il n'en est pas un. Champs inconnus ignorés, longueur bornée. */
export function readShareFragment(hash: string): Form | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  const p = new URLSearchParams(hash.slice(SHARE_PREFIX.length));
  const form = defaultForm();
  form.mode = p.get('mode') === 'montant' ? 'budget' : 'target';
  const d = p.get('d')?.toUpperCase();
  form.currency = isCurrency(d) ? d : 'EUR';
  for (const [field, key] of Object.entries(KEYS) as [TextField, string][]) {
    form[field] = (p.get(key) ?? (field === 'buyFee' || field === 'sellFee' ? form[field] : '')).slice(0, 40);
  }
  return form;
}
