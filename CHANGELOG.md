# Notes de version

## 0.2.0 — Interface

- Formulaire « Votre position » et « Votre objectif », calcul en direct, deux modes : atteindre un prix moyen ou investir un montant.
- Résultat : montant à investir ou nouveau prix moyen, quantité, nouveau break-even, prix limite, prix maximum avec un budget.
- Exposition avant et après le renfort : capital engagé, plus-value latente, résultat si le cours baisse encore de 20 %, hausse nécessaire pour revenir à l'équilibre.
- Tableau « Si le cours baisse » (0 à −50 %) et graphique lisible au clavier.
- Prix du jour via Binance, après consentement ; la crypto choisie n'est pas envoyée.
- Export CSV, résumé à copier, lien de partage ; dernier scénario gardé sur l'appareil.

## 0.1.0 — Moteur de calcul

- Spécification et décisions (docs/).
- Moteur de calcul testé : break-even, achat et nouveau PMP, montant pour atteindre un PMP cible, prix limite, prix maximum avec un budget, exposition avant/après, scénarios par niveau de baisse, courbe du montant nécessaire.
- Page d'attente : en-tête, thème clair/sombre, pied de page « Créé par Arnaud (Patart50) · Soutenir le projet ».
- Intégration continue et déploiement sur GitHub Pages.
