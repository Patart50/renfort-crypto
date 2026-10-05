# Spécification — renfort-crypto v1.0

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

## 4. Saisie et calcul complet

Code : `src/lib/core/calc.ts`.
- `parseForm` : chaînes du formulaire → valeurs validées, ou erreurs par champ (D-012). Quantité obligatoire ; prix moyen obligatoire si la quantité est positive ; prix actuel > 0 ; frais dans [0, 100 %[, vides = 0 ; mode cible : prix moyen visé obligatoire, quantité > 0 ; mode montant : montant > 0, prix moyen visé facultatif ; prix d'achat facultatif (prix actuel par défaut).
- `compute` : position avant et après (coût, break-even, plus-value latente, exposition, D-016), achat, statut de la cible, prix maximum, scénarios, données du graphique (D-007, D-015).

## 5. Interface (J2)

Une page, deux colonnes sur grand écran (formulaire à gauche, résultats à droite), une seule en dessous de 900 px. État : `src/lib/state/app.svelte.ts`.

- **Votre position** (`PositionForm.svelte`) : crypto, quantité, prix moyen, prix actuel avec « Prix du jour » (Binance, consentement D-013), frais d'achat et de vente. **Votre objectif** : bascule « Atteindre un prix moyen » / « Investir un montant » (groupe radio, flèches au clavier), champs du mode, prix d'achat. « Effacer le formulaire ».
- **Résultat** (`Results.svelte`) : chiffre principal (montant à investir ou nouveau prix moyen), quantité achetée, nouvelle quantité, nouveau break-even ; prix limite ; prix maximum avec un budget ; messages pour cible atteinte, inatteignable, achat au-dessus du prix moyen.
- **Exposition** (D-006) : tableau avant / après (quantité, capital engagé, plus-value latente, résultat si −20 %, break-even, hausse nécessaire) et phrase de synthèse.
- **Si le cours baisse** (D-004) : tableau des scénarios, cases impossibles en clair.
- **Graphique** (`XYChart.svelte`, D-007, D-015) : courbe, repère de votre scénario, réticule et info-bulle au survol comme au clavier.
- **Garder ou partager** (`ExportPanel.svelte`, D-008) : CSV, résumé copiable, lien de partage (D-014).
- Formulaire gardé sur l'appareil à chaque saisie ; avertissement si le stockage est bloqué.
- Annonce du résultat principal aux lecteurs d'écran (`aria-live`).
- En-tête avec auteur, thème, pied de page « Créé par Arnaud (Patart50) · Soutenir le projet ».
- **À propos et limites** (`About.svelte`, `#a-propos`, D-017) : fonctions, données, méthode et formules, limites, avertissement, contribuer, auteur et soutien. Lien d'évitement, focus sur le titre.

Principes communs : thème auto / clair / sombre, hors ligne (service worker), 375 px sans débordement, WCAG 2 AA vérifié avec axe-core.

## 6. Prix et export

- **Binance** (`src/lib/prices/binance.ts`, D-004, D-013) : `loadTicker` (deux hôtes, erreur claire), `priceEur` (paire EUR, puis USDT, USDC, BTC), `roundPrice`.
- **Export** (`src/lib/export/scenario.ts`, D-008) : `scenarioCsv` (« ; », virgule décimale, BOM : paramètres, résultat, exposition, scénarios), `scenarioText`, `shareFragment` / `readShareFragment`.

## 7. Jalons

- **J1** ✅ Spec, décisions, squelette, moteur de calcul testé, CI et déploiement (page d'attente).
- **J2** ✅ Interface complète : saisie, deux modes, résultats, exposition, scénarios, graphique, prix Binance, sauvegarde, export, partage.
- **J3** ✅ v1.0 : page « À propos et limites », hors ligne vérifié, accessibilité (D-017).

## 8. Hors périmètre v1.0

Calcul d'impôt, achats échelonnés en plusieurs tranches, plusieurs cryptos, frais fixes, import de positions depuis pmpa-crypto (lien envisagé en v1.1), connexion à une plateforme.
