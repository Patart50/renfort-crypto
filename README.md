# renfort-crypto

Calculateur de renfort crypto, **100 % local**, en français.

- Mon prix moyen est à 100 000 € sur le BTC : combien investir, et à quel prix, pour le ramener à 80 000 € ?
- J'ai 2 000 € à investir : quel sera mon nouveau prix moyen ?
- À quel prix vendre pour simplement rentrer dans mes frais (break-even) ?
- Et surtout : que change le renfort à mon exposition (capital engagé, perte si le cours baisse encore) ?

**Utiliser l'outil : https://patart50.github.io/renfort-crypto/** (rien à installer, fonctionne aussi hors ligne une fois chargé).

## En trois étapes

1. **Votre position** : la crypto, la quantité détenue, votre prix moyen (frais compris), le prix actuel (saisi, ou « Prix du jour » via Binance si vous l'autorisez) et vos frais.
2. **Votre objectif** : « Atteindre un prix moyen » (le montant à investir et le prix limite) ou « Investir un montant » (votre nouveau prix moyen, et le prix maximum pour atteindre une cible).
3. **Lire le résultat** : chiffres clés, exposition avant et après, tableau si le cours baisse, graphique. Export CSV, résumé à copier ou lien de partage.

La page « À propos et limites » (lien en pied de page) détaille les formules et ce que l'outil ne fait pas.

## Principes

- Aucune donnée ne quitte le navigateur. Pas de compte, pas de serveur.
- Le prix du jour peut être récupéré sur l'API publique de Binance **sur demande explicite** : l'outil télécharge la liste publique des cours, sans envoyer la crypto choisie. Sinon, il se saisit à la main.
- Le lien de partage place les paramètres après le « # » de l'adresse, jamais envoyé au serveur ; il révèle votre position à qui le reçoit.
- Aucun impôt n'est calculé : un renfort est un achat. Pour la fiscalité, voir [pmpa-crypto](https://github.com/Patart50/pmpa-crypto).
- Outil d'aide au calcul, pas un conseil en investissement. Baisser son prix moyen ne change pas, à lui seul, le résultat : il dépend du prix futur et de la quantité détenue.

## Développement

```sh
npm install
npm run dev          # serveur de développement
npm test             # tests
npm run check        # vérification des types
npm run build        # site statique dans dist/
```

Spécification : [docs/SPEC.md](docs/SPEC.md) · Décisions : [docs/DECISIONS.md](docs/DECISIONS.md)

## Auteur et soutien

Créé par Arnaud ([Patart50](https://github.com/Patart50)).

L'outil est gratuit, sans publicité ni compte. Pour soutenir son développement :

- [GitHub Sponsors](https://github.com/sponsors/Patart50) (carte bancaire, ponctuel ou mensuel) ;
- Bitcoin, réseau Bitcoin uniquement : `bc1qd5j0yrrxp6wrk5ds0xne97hdrz5fvxjl8q22p4`
- Ethereum et réseaux EVM (Arbitrum, Optimism, Base…) : `0x7e4b6bad06813506b724b5ea3cc9545a7b97eba4`

Les mêmes adresses, avec QR codes, sont dans l'outil (« Soutenir le projet », en pied de page). Vérifiez les premiers et derniers caractères de l'adresse collée avant d'envoyer.

## Licence

[AGPL-3.0](LICENSE).
