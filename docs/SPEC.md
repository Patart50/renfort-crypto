# Spécification — renfort-crypto v0.1

Calculateur de renfort et de break-even, 100 % local, en français. Projet frère de [pmpa-crypto](https://github.com/Patart50/pmpa-crypto) et [dca-crypto](https://github.com/Patart50/dca-crypto). Toute convention de calcul est consignée dans [DECISIONS.md](DECISIONS.md).

## 1. Objectif

Répondre à deux questions :
- « Mon prix moyen est à X €. Combien dois-je encore investir, et à quel prix, pour le faire descendre à Y € ? »
- « À quel prix dois-je vendre pour simplement rentrer dans mes frais ? » (break-even)

Et montrer, sans jugement, ce que le renfort change à l'exposition (D-006). L'outil **ne calcule aucun impôt** (D-005).

## 2. Données d'entrée

| Champ | Détail |
|---|---|
| Quantité détenue | > 0 (sans position, seul le mode « montant » a un sens : premier achat) |
| PMP actuel | En euros, frais d'achat inclus (D-002) |
| Prix actuel | Saisi, ou récupéré sur Binance en opt-in (D-004) |
| Frais d'achat, frais de vente | En %, dans [0, 100[ |
| Mode « atteindre un PMP » | PMP cible Y ; prix d'achat (par défaut : prix actuel) |
| Mode « investir un montant » | Montant M ; prix d'achat (par défaut : prix actuel) ; PMP cible facultatif |

## 3. Calcul

Code : `src/lib/core/renfort.ts` (logique pure, testée). Notations : Q quantité, PMP prix moyen, P prix d'achat, f frais d'achat, f_v frais de vente, Y cible, M montant.

| Résultat | Formule | Fonction |
|---|---|---|
| Coût (capital engagé) | Q × PMP | `cost` |
| Break-even à la vente | PMP ÷ (1 − f_v) | `breakEvenPrice` |
| Plus-value latente (D-010) | Q × cours × (1 − f_v) − Q × PMP | `latentGain` |
| Achat de M au prix P | quantité = M(1 − f)/P ; nouveau PMP = (Q·PMP + M) / (Q + M(1 − f)/P) | `buy` |
| Prix limite pour Y | Y × (1 − f) | `limitPrice` |
| Montant pour atteindre Y | M = Q(PMP − Y) / (Y(1 − f)/P − 1) | `amountForTarget` |
| Prix maximum pour Y avec M | P = Y(1 − f)·M / (M + Q(PMP − Y)) | `maxPriceForTarget` |
| Exposition (D-006) | coût ; valeur et résultat si le cours baisse de 20 % ; break-even ÷ cours − 1 | `exposure` |
| Scénarios (D-004) | montant (mode cible) ou nouveau PMP (mode montant) pour chaque baisse du prix actuel | `targetScenarios`, `budgetScenarios` |
| Courbe (D-007) | montant nécessaire de P = départ à 97 % du prix limite | `targetCurve` |

Cas limites, chacun signalé par un statut, jamais par une erreur silencieuse :
- **Cible déjà atteinte** (Y ≥ PMP) : `reached`, aucun achat nécessaire.
- **Cible inatteignable** (P ≥ Y(1 − f)) : `unreachable`, avec le prix limite. Le montant tend vers l'infini quand P s'en approche.
- **Sans position** (Q = 0 ou PMP = 0) : `no-position` pour le mode cible.
- **Achat au-dessus du PMP** : le PMP monte (`raisesPmp`).
- Entrées invalides (prix, cible ou budget ≤ 0, frais hors de [0, 100 %[, baisse hors de [0, 100 %[) : `RangeError`, à intercepter par la validation du formulaire.

Arrondis (D-009) : calcul exact ; montant à investir affiché au centime supérieur (`amountToInvest`).

## 4. Interface (J2)

Une page, trois blocs :
1. **Votre position** : quantité, PMP, prix actuel (champ + « Prix du jour via Binance »), frais d'achat et de vente.
2. **Votre objectif** : bascule « Atteindre un PMP » / « Investir un montant », champs du mode.
3. **Résultats** : chiffres clés (montant à investir ou nouveau PMP, quantité, nouveau break-even), bloc exposition avant/après (D-006), tableau de scénarios, graphique (D-007), plus-value latente avant/après. Export CSV, texte copiable, lien de partage opt-in (D-008).

Page « À propos et limites » (J3). Pied de page : « Créé par Arnaud (Patart50) · Soutenir le projet » (`Support.svelte`, `support.ts`).

Principes communs : thème auto / clair / sombre, hors ligne (service worker), 375 px sans débordement, WCAG 2 AA vérifié avec axe-core.

## 5. Jalons

- **J1** ✅ Spec, décisions, squelette, moteur de calcul testé, CI et déploiement (page d'attente).
- **J2** Interface complète : saisie, deux modes, résultats, exposition, scénarios, graphique, prix Binance, sauvegarde, export, partage.
- **J3** v1.0 : page « À propos et limites », hors ligne vérifié, accessibilité.

## 6. Hors périmètre v1.0

Calcul d'impôt, achats échelonnés en plusieurs tranches, plusieurs cryptos, frais fixes, import de positions depuis pmpa-crypto (lien envisagé en v1.1), connexion à une plateforme.
