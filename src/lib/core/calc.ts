/**
 * Saisie du formulaire → valeurs validées → résultat complet d'un scénario.
 * Logique pure : l'interface n'appelle que `parseForm` et `compute`.
 */
import { D, dec, type Dec } from './money';
import {
  amountForTarget,
  budgetScenarios,
  buy,
  cost,
  exposure,
  latentGain,
  maxPriceForTarget,
  breakEvenPrice,
  targetCurve,
  targetScenarios,
  type BudgetScenario,
  type BuyResult,
  type CurvePoint,
  type Exposure,
  type MaxPriceResult,
  type Position,
  type TargetResult,
  type TargetScenario,
} from './renfort';

export type Mode = 'target' | 'budget';

/** Champs du formulaire, tels que saisis (chaînes). Frais en pourcentage. */
export interface Form {
  asset: string;
  quantity: string;
  pmp: string;
  price: string;
  buyFee: string;
  sellFee: string;
  mode: Mode;
  target: string;
  budget: string;
  /** Vide : prix actuel. */
  buyPrice: string;
}

export type Field = keyof Omit<Form, 'mode'>;

export function defaultForm(): Form {
  return { asset: 'BTC', quantity: '', pmp: '', price: '', buyFee: '0,1', sellFee: '0,1', mode: 'target', target: '', budget: '', buyPrice: '' };
}

export interface Values {
  asset: string;
  position: Position;
  price: Dec;
  /** Fractions (0,001 = 0,1 %). */
  buyFee: Dec;
  sellFee: Dec;
  mode: Mode;
  target: Dec | null;
  budget: Dec | null;
  buyPrice: Dec;
  /** Prix d'achat saisi (sinon prix actuel). */
  buyPriceGiven: boolean;
}

export type ParseResult = { ok: true; values: Values } | { ok: false; errors: Partial<Record<Field, string>> };

/**
 * Nombre saisi à la française ou à l'anglaise. Espaces, « € » et « % » ignorés ;
 * avec virgule et point, le dernier séparateur est décimal (« 1.234,56 », « 1,234.56 ») ;
 * seul, l'un ou l'autre est décimal. Vide : null. Illisible : RangeError.
 */
export function parseNumber(raw: string): Dec | null {
  const s = raw.replace(/[\s\u00a0\u202f€%]/g, '');
  if (s === '') return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) normalized = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else normalized = s.replace(',', '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) throw new RangeError(`Nombre illisible : ${raw}`);
  return dec(normalized);
}

interface ReadOptions {
  required: boolean;
  /** Zéro refusé. */
  positive?: boolean;
  /** Pourcentage : strictement inférieur à 100. */
  percent?: boolean;
}

export function parseForm(form: Form): ParseResult {
  const errors: Partial<Record<Field, string>> = {};
  const read = (field: Field, label: string, opts: ReadOptions): Dec | null => {
    let v: Dec | null;
    try {
      v = parseNumber(form[field]);
    } catch {
      errors[field] = `${label} : nombre invalide.`;
      return null;
    }
    if (v === null) {
      if (opts.required) errors[field] = `${label} : à renseigner.`;
      return null;
    }
    if (v.isNeg()) errors[field] = `${label} : ne peut pas être négatif.`;
    else if (opts.positive && v.isZero()) errors[field] = `${label} : doit être supérieur à zéro.`;
    else if (opts.percent && v.gte(100)) errors[field] = `${label} : doit être inférieur à 100 %.`;
    return v;
  };

  const asset = form.asset.trim().toUpperCase();
  if (asset && !/^[A-Z0-9]{1,15}$/.test(asset)) errors.asset = 'Crypto : lettres et chiffres seulement (ex. BTC).';

  const quantity = read('quantity', 'Quantité détenue', { required: true });
  const holds = quantity !== null && quantity.gt(0);
  // Sans position, le prix moyen n'a pas de sens : facultatif.
  const pmp = read('pmp', 'Prix moyen actuel', { required: holds, positive: holds });
  const price = read('price', 'Prix actuel', { required: true, positive: true });
  const buyFee = read('buyFee', "Frais d'achat", { required: false, percent: true });
  const sellFee = read('sellFee', 'Frais de vente', { required: false, percent: true });
  const buyPrice = read('buyPrice', "Prix d'achat", { required: false, positive: true });

  let target: Dec | null = null;
  let budget: Dec | null = null;
  if (form.mode === 'target') {
    target = read('target', 'Prix moyen visé', { required: true, positive: true });
    if (quantity !== null && quantity.isZero() && !errors.quantity) {
      errors.quantity = 'Quantité détenue : sans position, il n’y a pas de prix moyen à faire baisser. Utilisez « Investir un montant ».';
    }
  } else {
    budget = read('budget', 'Montant à investir', { required: true, positive: true });
    target = read('target', 'Prix moyen visé', { required: false, positive: true });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    values: {
      asset,
      position: { quantity: quantity!, pmp: holds ? pmp! : new D(0) },
      price: price!,
      buyFee: (buyFee ?? new D(0)).div(100),
      sellFee: (sellFee ?? new D(0)).div(100),
      mode: form.mode,
      target,
      budget,
      buyPrice: buyPrice ?? price!,
      buyPriceGiven: buyPrice !== null,
    },
  };
}

export interface PositionSummary {
  position: Position;
  cost: Dec;
  breakEven: Dec;
  /** Plus-value latente au prix actuel, nette des frais de vente. */
  latent: Dec;
  exposure: Exposure;
}

export interface ChartData {
  /** Abscisse : prix d'achat. */
  points: { x: Dec; y: Dec }[];
  /** Ordonnée tracée : montant à investir (cible) ou nouveau PMP (budget). */
  yLabel: string;
  /** Point du scénario choisi, s'il est sur la courbe. */
  marker: { x: Dec; y: Dec } | null;
  /** Ligne horizontale de référence (PMP actuel en mode budget, PMP visé sinon). */
  reference: { y: Dec; label: string } | null;
  /** Ligne verticale : prix limite (cible) ou prix actuel. */
  vertical: { x: Dec; label: string } | null;
}

export interface Result {
  values: Values;
  before: PositionSummary;
  /** Absent si aucun achat (cible atteinte ou inatteignable). */
  after: PositionSummary | null;
  buy: BuyResult | null;
  target: TargetResult | null;
  maxPrice: MaxPriceResult | null;
  targetRows: TargetScenario[];
  budgetRows: BudgetScenario[];
  chart: ChartData;
}

function summarize(p: Position, v: Values): PositionSummary {
  return {
    position: p,
    cost: cost(p),
    breakEven: breakEvenPrice(p.pmp, v.sellFee),
    latent: latentGain(p, v.price, v.sellFee),
    exposure: exposure(p, v.price, v.sellFee),
  };
}

const CURVE_STEPS = 48;

function chartFor(v: Values, target: TargetResult | null): ChartData {
  if (v.mode === 'target' && v.target) {
    const limit = v.target.mul(new D(1).minus(v.buyFee));
    const from = D.min(v.price, v.buyPrice, limit).mul('0.4');
    const curve: CurvePoint[] = targetCurve(v.position, v.target, v.buyFee, from, CURVE_STEPS);
    const hi = curve.at(-1)?.price;
    const marker = target?.status === 'ok' && hi && v.buyPrice.lte(hi) ? { x: v.buyPrice, y: target.amount } : null;
    return {
      points: curve.map((c) => ({ x: c.price, y: c.amount })),
      yLabel: 'Montant à investir',
      marker,
      reference: null,
      vertical: curve.length ? { x: limit, label: 'Prix limite' } : null,
    };
  }
  // Mode budget : nouveau PMP selon le prix d'achat, de 40 % à 130 % du prix actuel.
  const budget = v.budget!;
  const lo = D.min(v.price, v.buyPrice).mul('0.4');
  const hi = D.max(v.price, v.buyPrice).mul('1.3');
  const step = hi.minus(lo).div(CURVE_STEPS - 1);
  const points = Array.from({ length: CURVE_STEPS }, (_, i) => {
    const x = i === CURVE_STEPS - 1 ? hi : lo.plus(step.mul(i));
    return { x, y: buy(v.position, budget, x, v.buyFee).after.pmp };
  });
  const after = buy(v.position, budget, v.buyPrice, v.buyFee).after.pmp;
  return {
    points,
    yLabel: 'Nouveau prix moyen',
    marker: { x: v.buyPrice, y: after },
    reference: v.position.quantity.gt(0) ? { y: v.position.pmp, label: 'Prix moyen actuel' } : null,
    vertical: { x: v.price, label: 'Prix actuel' },
  };
}

export function compute(v: Values): Result {
  const before = summarize(v.position, v);
  let buyResult: BuyResult | null = null;
  let target: TargetResult | null = null;
  let maxPrice: MaxPriceResult | null = null;
  let targetRows: TargetScenario[] = [];
  let budgetRows: BudgetScenario[] = [];

  if (v.mode === 'target') {
    target = amountForTarget(v.position, v.target!, v.buyPrice, v.buyFee);
    if (target.status === 'ok') buyResult = target.buy;
    targetRows = targetScenarios(v.position, v.target!, v.price, v.buyFee);
  } else {
    buyResult = buy(v.position, v.budget!, v.buyPrice, v.buyFee);
    budgetRows = budgetScenarios(v.position, v.budget!, v.price, v.buyFee);
    if (v.target) maxPrice = maxPriceForTarget(v.position, v.target, v.budget!, v.buyFee);
  }

  return {
    values: v,
    before,
    after: buyResult ? summarize(buyResult.after, v) : null,
    buy: buyResult,
    target,
    maxPrice,
    targetRows,
    budgetRows,
    chart: chartFor(v, target),
  };
}
