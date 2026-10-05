<script lang="ts">
  /**
   * Page « À propos et limites » : ce que fait l'outil, ce qu'il envoie, sa méthode et ses limites.
   * Structure reprise de dca-crypto (commit 9414232, About.svelte).
   */
  import { AUTHOR, SPONSORS_URL } from '../support';
  import Support from './Support.svelte';

  const version = __APP_VERSION__;
  const repo = 'https://github.com/Patart50/renfort-crypto';
</script>

<article class="about" aria-labelledby="about-title">
  <header>
    <h1 id="about-title" tabindex="-1">À propos et limites</h1>
    <p class="muted">renfort-crypto {version} · logiciel libre (AGPL-3.0)</p>
  </header>

  <section>
    <h2>Ce que fait l'outil</h2>
    <ul>
      <li>
        <strong>Atteindre un prix moyen</strong> : il calcule le montant à investir, et la quantité à acheter, pour ramener votre prix moyen pondéré (PMP) au
        niveau visé, au prix d'achat de votre choix. Il donne aussi le <strong>prix limite</strong> au-delà duquel la cible est inatteignable.
      </li>
      <li>
        <strong>Investir un montant</strong> : il donne votre nouveau prix moyen et, si vous indiquez une cible, le prix d'achat maximum pour l'atteindre avec ce
        montant.
      </li>
      <li>Il donne votre <strong>prix de break-even</strong> : le prix de vente qui vous fait rentrer exactement dans vos frais.</li>
      <li>
        Il montre ce que le renfort change à votre <strong>exposition</strong> : capital engagé, plus-value latente, résultat si le cours baisse encore de 20 %,
        hausse nécessaire pour revenir à l'équilibre.
      </li>
    </ul>
  </section>

  <section>
    <h2>Vos données</h2>
    <ul>
      <li>
        Tout est calculé et gardé dans ce navigateur, sur cet appareil. Pas de compte, pas de serveur, pas de mesure d'audience. L'outil marche hors ligne une
        fois chargé.
      </li>
      <li>
        <strong>Une seule exception, avec votre accord :</strong> « Prix du jour » télécharge la liste publique des cours de Binance. L'outil ne transmet ni la
        crypto choisie, ni quantité, ni montant ; il cherche le cours dans la réponse. Binance voit votre adresse IP, comme pour toute page web. L'autorisation
        se retire d'un clic, et le prix se saisit aussi à la main.
      </li>
      <li>
        Le <strong>lien de partage</strong> place vos paramètres après le « # » de l'adresse : cette partie n'est jamais envoyée au serveur, mais toute personne
        qui reçoit le lien voit votre position.
      </li>
    </ul>
  </section>

  <section>
    <h2>Méthode de calcul</h2>
    <p>Notations : Q quantité détenue, PMP prix moyen, P prix d'achat, f frais d'achat, f<sub>v</sub> frais de vente, Y prix moyen visé, M montant investi.</p>
    <ul>
      <li>
        Votre prix moyen inclut les frais d'achat, et un montant investi est ce que vous décaissez, frais compris (même convention que pmpa-crypto) : quantité
        achetée = M × (1 − f) ÷ P.
      </li>
      <li>Nouveau prix moyen = (Q × PMP + M) ÷ (Q + M × (1 − f) ÷ P).</li>
      <li>
        Montant pour atteindre Y : M = Q × (PMP − Y) ÷ (Y × (1 − f) ÷ P − 1). Il n'existe que si P &lt; Y × (1 − f), le <strong>prix limite</strong> ; il
        grimpe sans fin à l'approche de ce prix.
      </li>
      <li>Prix d'achat maximum pour Y avec un montant M : P = Y × (1 − f) × M ÷ (M + Q × (PMP − Y)).</li>
      <li>Break-even = PMP ÷ (1 − f<sub>v</sub>). Valeur et plus-value latente sont nettes des frais de vente : la plus-value est nulle au break-even.</li>
      <li>L'exposition et la plus-value « après » sont évaluées au prix actuel, même si vous indiquez un prix d'achat plus bas.</li>
      <li>
        Calculs en décimal exact ; montant à investir arrondi au centime supérieur pour que la cible soit atteinte. Chaque choix est publié dans le
        <a href={`${repo}/blob/main/docs/DECISIONS.md`} target="_blank" rel="noopener">journal des décisions</a>.
      </li>
    </ul>
  </section>

  <section>
    <h2>Limites connues</h2>
    <ul>
      <li>
        <strong>Baisser son prix moyen n'est pas gagner.</strong> Le résultat ne dépend que du prix futur et de la quantité détenue. Renforcer augmente la somme
        exposée : si le cours continue de baisser, la perte grossit. L'outil le montre, il ne le juge pas.
      </li>
      <li>
        <strong>Le prix moyen par crypto n'est pas votre base fiscale.</strong> En France, la plus-value imposable se calcule sur l'ensemble de votre portefeuille
        (art. 150 VH bis du CGI). Le break-even affiché ignore l'impôt. Pour la fiscalité, utilisez
        <a href="https://patart50.github.io/pmpa-crypto/" target="_blank" rel="noopener">pmpa-crypto</a>.
      </li>
      <li><strong>Frais en pourcentage seulement</strong> : un frais fixe par ordre n'est pas pris en compte.</li>
      <li>
        <strong>Un seul achat</strong> par scénario : les achats échelonnés en plusieurs paliers ne sont pas simulés ; le tableau « Si le cours baisse » montre
        chaque palier séparément.
      </li>
      <li>
        <strong>Prix du jour indicatif</strong> : dernier prix Binance converti en euros (paire EUR, sinon via USDT, USDC ou BTC), pas le prix que vous obtiendrez
        sur votre plateforme.
      </li>
      <li><strong>Une seule crypto</strong> à la fois.</li>
    </ul>
  </section>

  <section>
    <h2>Avertissement</h2>
    <p>
      Outil d'aide au calcul, à but d'information. Ce n'est ni un conseil en investissement ni une recommandation d'achat. Les cryptos sont des actifs très
      volatils : n'investissez que ce que vous pouvez vous permettre de perdre.
    </p>
  </section>

  <section>
    <h2>Contribuer</h2>
    <p>
      Une erreur de calcul, une idée, une question : <a href={`${repo}/issues`} target="_blank" rel="noopener">ouvrez une discussion sur GitHub</a>. Le code
      source est libre (<a href={`${repo}/blob/main/LICENSE`} target="_blank" rel="noopener">AGPL-3.0</a>).
    </p>
  </section>

  <section>
    <h2>Auteur et soutien</h2>
    <p>
      Créé et maintenu par <a href={AUTHOR.url} target="_blank" rel="noopener author">{AUTHOR.name} ({AUTHOR.handle})</a>, sur son temps libre. L'outil est
      gratuit et le restera. Pour le soutenir : <a href={SPONSORS_URL} target="_blank" rel="noopener">GitHub Sponsors</a>, ou en crypto, <Support />.
    </p>
  </section>

  <p><a href="#calculateur">← Retour au calculateur</a></p>
</article>

<style>
  .about {
    display: grid;
    gap: 1.4rem;
    max-width: 46rem;
  }
  header {
    display: grid;
    gap: 0.3rem;
  }
  h1 {
    font-size: clamp(1.6rem, 3.5vw, 2.1rem);
  }
  h1:focus {
    outline: none;
  }
  h2 {
    font-size: 1.2rem;
    margin-bottom: 0.4rem;
  }
  ul {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.45rem;
  }
  section > p + ul {
    margin-top: 0.5rem;
  }
</style>
