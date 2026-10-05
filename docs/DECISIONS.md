# Journal des décisions — renfort-crypto

Chaque décision est numérotée et ne se réécrit pas : on en ajoute une nouvelle qui remplace l'ancienne. Statut : ✅ actée · ⚠️ à vérifier · 🔁 remplacée. Dans les échanges entre projets, préfixer : « renfort D-003 ».

## D-001 ✅ Nom, dépôt, licence, outil séparé
`renfort-crypto` (« renforcer » est le mot du public français pour « moyenner à la baisse »), dépôt `Patart50/renfort-crypto`, AGPL-3.0 (le fichier GPL-3.0 proposé par GitHub a été remplacé). Outil séparé plutôt que module de pmpa-crypto (choix d'Arnaud, 5 oct. 2026) : il répond en quatre champs, sans import d'historique. pmpa-crypto calcule déjà un prix d'équilibre par actif (pmpa D-014) ; un lien « Simuler un renfort » depuis pmpa, valeurs préremplies, est envisagé en v1.1.

## D-002 ✅ Frais inclus dans le PMP et dans le montant investi
Comme pmpa D-009 et dca D-003 : le PMP saisi inclut les frais d'achat, et un montant investi est le montant décaissé, frais compris. Quantité achetée = montant × (1 − frais d'achat) ÷ prix. Frais d'achat et frais de vente distincts, en pourcentage, dans [0 %, 100 %[. Pas de frais fixe en v1.0 (un frais fixe rend le montant pour une cible non linéaire pour un gain marginal).

## D-003 ✅ Deux modes, break-even toujours affiché
- « Atteindre un PMP » : montant à investir au prix choisi pour ramener le PMP à la cible Y, quantité achetée, nouvelle quantité, PMP obtenu, prix limite.
- « Investir un montant » : nouveau PMP, quantité achetée, nouveau break-even ; si une cible est saisie, prix d'achat maximum pour l'atteindre avec ce budget.
- Le break-even à la vente, PMP ÷ (1 − frais de vente), est affiché dans les deux modes, avant et après renfort.
Formules et cas limites : SPEC § 3.

## D-004 ✅ Prix du jour : saisie ou Binance en opt-in ; scénarios par niveau de baisse
Le prix actuel se saisit à la main, ou se récupère sur l'API publique de Binance après consentement explicite et mémorisé (code et conventions repris de pmpa D-028 et D-030 : une requête `/api/v3/ticker/price`, chemins de conversion en euros, seuls des noms de paires sont envoyés). Le tableau de scénarios applique des baisses de 0, 5, 10, 20, 30, 40 et 50 % au prix actuel ; les cases impossibles (cible inatteignable à ce prix) sont marquées comme telles, jamais laissées vides.

## D-005 ✅ Aucun calcul d'impôt
Un renfort est un achat, sans fait générateur. Le break-even par actif n'est pas le seuil fiscal : en France, la plus-value imposable se calcule sur l'ensemble du portefeuille (art. 150 VH bis). Mention et renvoi vers pmpa-crypto, comme dca D-005.

## D-006 ✅ Bloc « exposition » obligatoire
Baisser son PMP ne change pas, à lui seul, le résultat économique : le gain ou la perte ne dépend que du prix futur et de la quantité détenue. Renforcer augmente l'exposition. L'outil affiche donc toujours, avant et après le renfort et sans jugement : capital engagé, valeur et perte si le cours baisse encore de 20 % (depuis le prix actuel), hausse nécessaire pour atteindre le break-even. Bloc non repliable (choix d'Arnaud, 5 oct. 2026).

## D-007 ✅ Graphique : montant nécessaire en fonction du prix d'achat
Plutôt qu'une flèche « PMP actuel → PMP cible », une courbe du montant à investir selon le prix d'achat, jusqu'à 97 % du prix limite : elle montre que le montant explose à l'approche de la cible. SVG maison, sans bibliothèque (comme dca D-006), couleurs et lecture au clavier selon dca D-014.

## D-008 ✅ Sauvegarde locale, export, partage en opt-in
Le dernier scénario est gardé dans le localStorage (repli en mémoire si le stockage est bloqué). Export CSV (séparateur « ; », virgule décimale, BOM, comme dca D-015) et texte copiable. Lien de partage avec les paramètres dans le fragment `#…` (jamais envoyé au serveur), proposé en opt-in : il révèle la position à qui le reçoit, ce que l'interface rappelle.

## D-009 ✅ Arrondis
Calculs exacts en décimal (decimal.js, précision 50), jamais en `number`. Le montant à investir affiché est arrondi au **centime supérieur**, pour que la cible soit atteinte (vérifié par test) ; les autres montants au centime le plus proche ; les quantités tronquées à 8 décimales ; les cours selon pmpa D-030.

## D-010 ✅ Plus-value latente nette des frais de vente
Valeur d'une position = quantité × cours × (1 − frais de vente). La plus-value latente (valeur − coût) est ainsi nulle exactement au prix de break-even, ce qui garde les deux notions cohérentes à l'écran.

## D-011 ✅ Code repris par copie
Depuis dca-crypto (commit `9414232`), qui les tient lui-même de pmpa-crypto : `money.ts`, thème (`app.css`, `ThemeToggle.svelte`), plugin de service worker, polices, stockage local. `support.ts` et son test tels quels (pmpa `37e9dc9`) ; `Support.svelte` repris de dca, correctif de l'espace parasite compris, texte d'introduction adapté. Origine notée en tête de chaque fichier.

## D-012 ✅ Calcul en direct, champs vides sans message d'erreur
Pas de bouton « Calculer » : le résultat se met à jour à chaque saisie (`parseForm` puis `compute`, `src/lib/core/calc.ts`). Un champ vide n'est pas affiché en erreur : la liste « Reste à renseigner » le rappelle tant que le calcul est impossible. Seules les valeurs illisibles ou hors limites sont signalées sous le champ. Nombres acceptés à la française ou à l'anglaise (« 100 000 », « 1.234,56 », « 1,234.56 », « 0,1 % ») ; avec un seul séparateur, il est décimal.

## D-013 ✅ Prix du jour : la crypto n'est pas envoyée à Binance
Précise D-004 : l'outil télécharge la liste publique de tous les cours (`/api/v3/ticker/price`, sans paramètre) et cherche la crypto dans la réponse. Binance ne voit que l'adresse IP. L'encart de consentement le dit avant le premier appel ; « Saisir à la main » le referme sans rien envoyer ; l'autorisation se retire d'un clic sous le formulaire. Cours arrondi comme pmpa D-030, chemin de conversion affiché sous le champ, effacé dès que l'utilisateur modifie le prix ou la crypto.

## D-014 ✅ Ouverture d'un lien de partage
Un lien `#partage?…` remplace le scénario gardé sur l'appareil, avec un bandeau qui le signale. Le fragment est retiré de la barre d'adresse dès la lecture (il contient la position) ; il n'est jamais envoyé au serveur. Valeurs lues comme du texte, champs inconnus ignorés, 40 caractères au plus par champ. Le lien affiché est effacé dès que le formulaire change, pour ne pas partager un scénario périmé.

## D-015 ✅ Graphique du mode « Investir un montant »
Complète D-007 : en mode montant, la courbe montre le nouveau prix moyen selon le prix d'achat (de 40 % à 130 % du prix actuel), avec le prix moyen actuel en référence et le prix actuel en repère vertical. Axe resserré sur les données (un axe depuis zéro écrasait la courbe) ; en mode cible, l'axe des montants part de zéro.

## D-016 ✅ Exposition au prix actuel
Le bloc exposition (D-006) et la plus-value latente « après » sont évalués au prix actuel, même quand un prix d'achat plus bas est saisi (ordre limite) : on compare ce que vaudrait la position aujourd'hui, pas au moment hypothétique de l'achat. La baisse de 20 % part aussi du prix actuel.

## D-017 ✅ Version 1.0
Page « À propos et limites » (`#a-propos`, lien en pied de page et sous l'écran d'accueil) : ce que fait l'outil, vos données, méthode et formules, limites (renforcer n'est pas gagner, PMP par crypto ≠ base fiscale, frais en % seulement, un seul achat, prix du jour indicatif, une crypto), avertissement, contribuer, auteur et soutien (D-011). Focus déplacé sur le titre à l'ouverture. Un lien de partage collé dans un onglet déjà ouvert est lu au changement de fragment (complète D-014). Vérifié dans Chromium : lien d'évitement, hors ligne (service worker, calcul, page À propos et polices sans réseau), axe-core (WCAG 2.0/2.1 A et AA) sans violation sur tous les écrans et états, fenêtre de soutien comprise, en clair 1 280 px et en sombre 375 px ; aucune requête externe sans consentement. Release `v1.0.0` à créer par Arnaud.
