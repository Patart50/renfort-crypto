import { describe, expect, it } from 'vitest';
import { compute, defaultForm, parseForm, type Form } from '../core/calc';
import { readShareFragment, scenarioCsv, scenarioText, shareFragment } from './scenario';

const form = (over: Partial<Form> = {}): Form => ({ ...defaultForm(), quantity: '0,5', pmp: '100000', price: '60000', target: '80000', ...over });
const result = (over: Partial<Form> = {}) => {
  const r = parseForm(form(over));
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return compute(r.values);
};

describe('export CSV', () => {
  it('BOM, séparateur « ; », virgule décimale, montant arrondi au centime supérieur', () => {
    const csv = scenarioCsv(result());
    expect(csv.startsWith('﻿renfort-crypto;')).toBe(true);
    expect(csv).toContain('Montant à investir, frais compris (€);30120,49');
    expect(csv).toContain('Nouveau prix moyen (€);80000,00');
    expect(csv).toContain("Prix d'achat limite (€);79920,00");
    expect(csv).toContain('Exposition;Avant;Après');
    // 7 lignes de scénarios : à 60 000 € et moins, la cible reste atteignable (prix limite 79 920 €).
    expect(csv.match(/^\d+,\d{2};\d+,\d{2};\d+,\d{2};/gm)?.length).toBe(7);
  });

  it('cases impossibles écrites en clair', () => {
    const csv = scenarioCsv(result({ price: '90000' }));
    expect(csv).toContain('0,00;90000,00;Inatteignable');
    expect(csv).toContain('Statut;Inatteignable');
  });

  it('mode montant sans position : pas de colonne « Avant »', () => {
    const csv = scenarioCsv(result({ mode: 'budget', quantity: '0', pmp: '', budget: '1000', target: '' }));
    expect(csv).toContain('Exposition;Après');
    expect(csv).not.toContain('Prix moyen actuel');
  });
});

describe('texte copiable', () => {
  it('résume la position, l’objectif et l’exposition', () => {
    const t = scenarioText(result());
    expect(t).toContain('0,5 BTC');
    expect(t).toMatch(/Investir 30\s120,49\s€/);
    expect(t).toContain('Prix limite');
    expect(t).toContain('baisse de 20 %');
    expect(t).toContain('Pas un conseil en investissement.');
  });

  it('mode montant avec prix maximum', () => {
    const t = scenarioText(result({ mode: 'budget', budget: '30000' }));
    expect(t).toContain('nouveau prix moyen');
    expect(t).toContain('acheter à');
  });
});

describe('lien de partage', () => {
  it('aller-retour sans perte', () => {
    const f = form({ asset: 'ETH', mode: 'budget', budget: '2 000', buyFee: '', buyPrice: '1800' });
    const hash = shareFragment(f);
    expect(hash.startsWith('#partage?mode=montant')).toBe(true);
    expect(readShareFragment(hash)).toEqual({ ...f, budget: '2 000' });
  });

  it('frais vides conservés vides, autres fragments ignorés', () => {
    const back = readShareFragment(shareFragment(form({ buyFee: '', sellFee: '' })));
    expect(back?.buyFee).toBe('');
    expect(readShareFragment('#a-propos')).toBeNull();
    expect(readShareFragment('')).toBeNull();
  });

  it('valeurs tronquées à 40 caractères', () => {
    const back = readShareFragment('#partage?mode=cible&q=' + '1'.repeat(500));
    expect(back?.quantity.length).toBe(40);
    expect(back?.mode).toBe('target');
  });
});

describe('devise (D-019)', () => {
  const usd = { currency: 'USD' as const, pmp: '108500', price: '65100', target: '86800', fx: '1,085' };

  it('CSV en dollars : devise, taux et unités', () => {
    const csv = scenarioCsv(result(usd));
    expect(csv).toContain('Devise;Dollar, USDC ($)');
    expect(csv).toContain('Taux EUR/USDC ($ pour 1 €);1,085');
    expect(csv).toContain('Prix moyen actuel ($);108500,00');
    expect(csv).toContain('Montant à investir, frais compris ($);');
    expect(csv).not.toContain('(€);');
  });

  it('CSV en euros sans taux : pas de ligne de taux', () => {
    const csv = scenarioCsv(result());
    expect(csv).toContain('Devise;Euro (€)');
    expect(csv).not.toContain('Taux EUR/USDC');
  });

  it('texte en dollars avec le taux', () => {
    const t = scenarioText(result(usd)).replace(/[  ]/g, ' ');
    expect(t).toContain('108 500,00 $ de prix moyen');
    expect(t).toContain('Taux EUR/USDC : 1 € = 1,0850 $.');
  });

  it('lien de partage : devise et taux, aller-retour ; anciens liens lus en euros', () => {
    const f = form(usd);
    const hash = shareFragment(f);
    expect(hash).toContain('d=usd');
    expect(hash).toContain('fx=1%2C085');
    expect(readShareFragment(hash)).toEqual(f);
    expect(readShareFragment('#partage?mode=cible&q=1&pmp=100&c=50&y=75')?.currency).toBe('EUR');
    expect(readShareFragment('#partage?mode=cible&d=gbp&q=1')?.currency).toBe('EUR');
  });
});
