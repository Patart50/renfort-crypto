/**
 * Moteur de calcul de renfort : logique pure, sans dépendance navigateur.
 *
 * Conventions (docs/DECISIONS.md) :
 * - D-002 : le PMP inclut les frais d'achat ; un montant investi est un montant
 *   décaissé, frais compris. Quantité achetée = montant × (1 − frais) ÷ prix.
 * - D-010 : valeur et plus-value latente nettes des frais de vente, si bien que
 *   la plus-value latente est nulle exactement au prix de break-even.
 * - Taux de frais exprimés en fraction (0,001 = 0,1 %), dans [0, 1[.
 *
 * Notations : Q quantité détenue, PMP prix moyen, P prix d'achat, f frais d'achat,
 * Y PMP cible, M montant investi.
 */
import { D, ZERO, dec, type Dec, type DecInput } from './money';

export interface Position {
  /** Quantité détenue (≥ 0). */
  quantity: Dec;
  /** Prix moyen pondéré, frais d'achat inclus (≥ 0). */
  pmp: Dec;
}

export function position(quantity: DecInput, pmp: DecInput): Position {
  return { quantity: dec(quantity), pmp: dec(pmp) };
}

/** Coût total de la position (capital engagé) : Q × PMP. */
export function cost(p: Position): Dec {
  return p.quantity.mul(p.pmp);
}

function checkRate(rate: Dec, label: string): void {
  if (rate.isNeg() || rate.gte(1)) throw new RangeError(`${label} hors de [0 %, 100 %[ : ${rate.toString()}`);
}

function checkPositive(value: Dec, label: string): void {
  if (!value.gt(0)) throw new RangeError(`${label} doit être strictement positif : ${value.toString()}`);
}

/** Prix de vente pour lequel le produit net de frais égale le coût : PMP ÷ (1 − frais de vente). */
export function breakEvenPrice(pmp: Dec, sellFee: Dec): Dec {
  checkRate(sellFee, 'Frais de vente');
  return pmp.div(new D(1).minus(sellFee));
}

/** Produit net d'une vente totale au prix donné : Q × prix × (1 − frais de vente). */
export function netValue(p: Position, price: Dec, sellFee: Dec): Dec {
  checkRate(sellFee, 'Frais de vente');
  return p.quantity.mul(price).mul(new D(1).minus(sellFee));
}

/** Plus-value (ou moins-value) latente nette des frais de vente. */
export function latentGain(p: Position, price: Dec, sellFee: Dec): Dec {
  return netValue(p, price, sellFee).minus(cost(p));
}

export interface BuyResult {
  /** Montant décaissé, frais compris. */
  amount: Dec;
  price: Dec;
  /** Frais payés sur l'achat. */
  fees: Dec;
  /** Quantité achetée, nette des frais. */
  quantityBought: Dec;
  before: Position;
  after: Position;
  /** L'achat fait monter le PMP (prix effectif au-dessus du PMP actuel). */
  raisesPmp: boolean;
}

/** Achat d'un montant M au prix P : nouvelle quantité et nouveau PMP. */
export function buy(before: Position, amount: Dec, price: Dec, buyFee: Dec): BuyResult {
  checkRate(buyFee, "Frais d'achat");
  checkPositive(price, "Prix d'achat");
  if (amount.isNeg()) throw new RangeError(`Montant négatif : ${amount.toString()}`);
  const fees = amount.mul(buyFee);
  const quantityBought = amount.minus(fees).div(price);
  const quantity = before.quantity.plus(quantityBought);
  const totalCost = cost(before).plus(amount);
  const pmp = quantity.isZero() ? ZERO : totalCost.div(quantity);
  return {
    amount,
    price,
    fees,
    quantityBought,
    before,
    after: { quantity, pmp },
    raisesPmp: pmp.gt(before.pmp),
  };
}

/**
 * Prix d'achat limite pour atteindre un PMP cible : Y × (1 − f).
 * À ce prix ou au-dessus, la cible est inatteignable quel que soit le montant ;
 * en s'en approchant, le montant nécessaire tend vers l'infini.
 */
export function limitPrice(target: Dec, buyFee: Dec): Dec {
  checkRate(buyFee, "Frais d'achat");
  return target.mul(new D(1).minus(buyFee));
}

export type TargetResult =
  | { status: 'ok'; amount: Dec; buy: BuyResult; limitPrice: Dec }
  /** PMP actuel déjà inférieur ou égal à la cible : aucun achat nécessaire. */
  | { status: 'reached' }
  /** Prix d'achat au-dessus de la limite : aucun montant ne suffit. */
  | { status: 'unreachable'; limitPrice: Dec }
  /** Aucune position détenue : la notion de PMP à faire baisser n'a pas de sens. */
  | { status: 'no-position' };

/**
 * Montant à investir au prix P pour ramener le PMP à Y :
 * M = Q × (PMP − Y) ÷ (Y × (1 − f) ÷ P − 1).
 */
export function amountForTarget(p: Position, target: Dec, price: Dec, buyFee: Dec): TargetResult {
  checkPositive(target, 'PMP cible');
  checkPositive(price, "Prix d'achat");
  if (!p.quantity.gt(0) || !p.pmp.gt(0)) return { status: 'no-position' };
  if (target.gte(p.pmp)) return { status: 'reached' };
  const limit = limitPrice(target, buyFee);
  if (price.gte(limit)) return { status: 'unreachable', limitPrice: limit };
  const amount = p.quantity.mul(p.pmp.minus(target)).div(limit.div(price).minus(1));
  return { status: 'ok', amount, buy: buy(p, amount, price, buyFee), limitPrice: limit };
}

export type MaxPriceResult =
  | { status: 'ok'; price: Dec; limitPrice: Dec }
  | { status: 'reached' }
  | { status: 'no-position' };

/**
 * Prix d'achat maximum pour atteindre Y avec un budget M :
 * P = Y × (1 − f) × M ÷ (M + Q × (PMP − Y)).
 */
export function maxPriceForTarget(p: Position, target: Dec, budget: Dec, buyFee: Dec): MaxPriceResult {
  checkPositive(target, 'PMP cible');
  checkPositive(budget, 'Budget');
  if (!p.quantity.gt(0) || !p.pmp.gt(0)) return { status: 'no-position' };
  if (target.gte(p.pmp)) return { status: 'reached' };
  const limit = limitPrice(target, buyFee);
  const price = limit.mul(budget).div(budget.plus(p.quantity.mul(p.pmp.minus(target))));
  return { status: 'ok', price, limitPrice: limit };
}

export interface Exposure {
  /** Capital engagé (coût de la position). */
  engaged: Dec;
  /** Valeur nette si le cours baisse de `shock` depuis le prix de référence. */
  valueAfterShock: Dec;
  /** Résultat latent après cette baisse (négatif = perte). */
  gainAfterShock: Dec;
  /** Hausse du cours nécessaire pour atteindre le break-even (≤ 0 : déjà au-dessus). */
  riseToBreakEven: Dec;
  breakEven: Dec;
}

/** Exposition d'une position au prix de référence, avec une baisse hypothétique (20 % par défaut). */
export function exposure(p: Position, price: Dec, sellFee: Dec, shock: Dec = new D('0.2')): Exposure {
  checkPositive(price, 'Prix de référence');
  checkRate(shock, 'Baisse simulée');
  const engaged = cost(p);
  const shocked = price.mul(new D(1).minus(shock));
  const valueAfterShock = netValue(p, shocked, sellFee);
  const breakEven = breakEvenPrice(p.pmp, sellFee);
  return {
    engaged,
    valueAfterShock,
    gainAfterShock: valueAfterShock.minus(engaged),
    riseToBreakEven: breakEven.div(price).minus(1),
    breakEven,
  };
}

/** Baisses par défaut du tableau de scénarios (D-004). */
export const DEFAULT_DROPS: readonly string[] = ['0', '0.05', '0.1', '0.2', '0.3', '0.4', '0.5'];

export interface TargetScenario {
  drop: Dec;
  price: Dec;
  result: TargetResult;
}

export interface BudgetScenario {
  drop: Dec;
  price: Dec;
  result: BuyResult;
}

function scenarioPrices(currentPrice: Dec, drops: readonly DecInput[]): { drop: Dec; price: Dec }[] {
  checkPositive(currentPrice, 'Prix actuel');
  return drops.map((d) => {
    const drop = dec(d);
    if (drop.isNeg() || drop.gte(1)) throw new RangeError(`Baisse hors de [0 %, 100 %[ : ${drop.toString()}`);
    return { drop, price: currentPrice.mul(new D(1).minus(drop)) };
  });
}

/** Montant nécessaire pour atteindre Y si l'on achète à chaque niveau de baisse du cours actuel. */
export function targetScenarios(p: Position, target: Dec, currentPrice: Dec, buyFee: Dec, drops: readonly DecInput[] = DEFAULT_DROPS): TargetScenario[] {
  return scenarioPrices(currentPrice, drops).map(({ drop, price }) => ({ drop, price, result: amountForTarget(p, target, price, buyFee) }));
}

/** Nouveau PMP avec un budget M investi à chaque niveau de baisse du cours actuel. */
export function budgetScenarios(p: Position, budget: Dec, currentPrice: Dec, buyFee: Dec, drops: readonly DecInput[] = DEFAULT_DROPS): BudgetScenario[] {
  return scenarioPrices(currentPrice, drops).map(({ drop, price }) => ({ drop, price, result: buy(p, budget, price, buyFee) }));
}

export interface CurvePoint {
  price: Dec;
  amount: Dec;
}

/**
 * Courbe « montant nécessaire en fonction du prix d'achat » pour le graphique (D-007) :
 * `steps` points régulièrement espacés de `from` à `upTo` × prix limite (97 % par défaut,
 * le montant tendant vers l'infini à la limite). Vide si la cible est déjà atteinte
 * ou sans position.
 */
export function targetCurve(p: Position, target: Dec, buyFee: Dec, from: Dec, steps = 40, upTo: Dec = new D('0.97')): CurvePoint[] {
  checkPositive(target, 'PMP cible');
  if (!p.quantity.gt(0) || !p.pmp.gt(0) || target.gte(p.pmp)) return [];
  if (!Number.isInteger(steps) || steps < 2) throw new RangeError(`Nombre de points invalide : ${steps}`);
  const hi = limitPrice(target, buyFee).mul(upTo);
  if (!from.gt(0) || from.gte(hi)) return [];
  const step = hi.minus(from).div(steps - 1);
  const points: CurvePoint[] = [];
  for (let i = 0; i < steps; i++) {
    const price = i === steps - 1 ? hi : from.plus(step.mul(i));
    const r = amountForTarget(p, target, price, buyFee);
    if (r.status === 'ok') points.push({ price, amount: r.amount });
  }
  return points;
}

/** Montant à investir affiché : arrondi au centime supérieur pour que la cible soit bien atteinte (D-009). */
export function amountToInvest(amount: Dec): Dec {
  return amount.toDecimalPlaces(2, D.ROUND_UP);
}
