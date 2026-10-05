# Notes de version

## 1.0.1 — Code commun

- Le code partagé avec les autres outils du programme (calcul décimal, prix Binance, formules, thème, fenêtre de soutien, mode hors ligne) vient désormais du paquet commun-crypto. Aucun changement visible ; scénarios gardés sur l'appareil conservés.

## 1.0.0 — Première version stable

- Page « À propos et limites » : ce que fait l'outil, vos données, méthode et formules, limites connues, avertissement, contribuer, auteur et soutien.
- Un lien de partage collé dans un onglet déjà ouvert est pris en compte.
- Hors ligne vérifié : après une première visite, l'outil, la page À propos et les polices s'ouvrent sans réseau.
- Accessibilité : WCAG 2 AA vérifié avec axe-core sur tous les écrans et états, en clair et en sombre, sur bureau et à 375 px.

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
