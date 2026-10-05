<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/state/app.svelte';
  import ThemeToggle from './lib/ui/ThemeToggle.svelte';
  import Support from './lib/ui/Support.svelte';
  import { AUTHOR } from './lib/support';

  onMount(() => app.init());

  $effect(() => {
    const theme = app.settings.theme;
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  });
</script>

<a class="skip" href="#contenu">Aller au contenu</a>

<header class="top">
  <div class="top-inner">
    <div class="brand">
      <a class="brand-name" href="./" aria-label="renfort-crypto, accueil">renfort-crypto</a>
      <span class="brand-tag"
        ><span class="tagline">Calculateur de renfort et de break-even ·&nbsp;</span>par
        <a href={AUTHOR.url} target="_blank" rel="noopener author">{AUTHOR.name} ({AUTHOR.handle})</a></span
      >
    </div>
    <div class="top-actions">
      <span class="local" title="Aucune donnée n'est envoyée sur Internet">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"
          ><path d="M8 1.5 2.5 3.8v3.7c0 3.2 2.3 6 5.5 7 3.2-1 5.5-3.8 5.5-7V3.8L8 1.5Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /></svg
        >
        100 % local
      </span>
      <ThemeToggle />
    </div>
  </div>
</header>

<main id="contenu" tabindex="-1">
  <section class="intro" aria-labelledby="intro-title">
    <h1 id="intro-title">Combien investir pour ramener votre prix moyen à une cible ?</h1>
    <p>
      renfort-crypto répondra à deux questions : quel montant acheter, et à quel prix, pour faire descendre votre prix moyen pondéré (PMP) à la valeur visée ; et à
      quel prix vendre pour simplement rentrer dans vos frais.
    </p>
    <p>
      Il montrera aussi ce que coûte le renfort en exposition : capital engagé, perte si le cours baisse encore, hausse nécessaire pour revenir à l'équilibre. Tout
      le calcul se fait dans votre navigateur ; rien n'est envoyé.
    </p>
    <p class="notice" role="status">
      <span><strong>En construction.</strong> Le moteur de calcul est prêt et testé ; l'interface arrive avec la prochaine version.</span>
    </p>
  </section>
</main>

<footer class="foot">
  <p>
    Outil d'aide au calcul, pas un conseil en investissement. Pour la fiscalité (plus-values, formulaire 2086), voir
    <a href="https://patart50.github.io/pmpa-crypto/" target="_blank" rel="noopener">pmpa-crypto</a>. Code source libre (AGPL-3.0) sur
    <a href="https://github.com/Patart50/renfort-crypto" rel="noopener" target="_blank">GitHub</a> · v{__APP_VERSION__}
  </p>
  <p class="credit">
    Créé par <a href={AUTHOR.url} target="_blank" rel="noopener author">{AUTHOR.name} ({AUTHOR.handle})</a> · <Support />
  </p>
</footer>

<style>
  .skip {
    position: absolute;
    left: 1rem;
    top: -3rem;
    z-index: 100;
    background: var(--accent);
    color: var(--on-accent);
    padding: 0.5rem 0.8rem;
    border-radius: var(--radius);
    font-weight: 600;
  }
  .skip:focus {
    top: 0.5rem;
  }
  main:focus {
    outline: none;
  }
  .top {
    background: var(--surface);
    border-bottom: 1px solid var(--rule);
  }
  .top-inner,
  main,
  .foot {
    max-width: 74rem;
    margin: 0 auto;
    padding-inline: 1rem;
  }
  .top-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-block: 0.9rem;
  }
  .brand {
    display: grid;
  }
  .brand-name {
    text-decoration: none;
    color: var(--ink);
    width: fit-content;
    font-family: var(--font-doc);
    font-size: 1.45rem;
    font-weight: 650;
    letter-spacing: -0.01em;
  }
  .brand-tag {
    font-size: 0.82rem;
    color: var(--muted);
  }
  .top-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .local {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.82rem;
    color: var(--gain);
    padding-inline: 0.4rem;
  }
  main {
    padding-block: 2rem 3rem;
  }
  .intro {
    display: grid;
    gap: 0.9rem;
    max-width: 44rem;
  }
  .intro h1 {
    font-size: 1.7rem;
  }
  .foot {
    padding-block: 0 2.5rem;
    font-size: 0.82rem;
    color: var(--muted);
  }
  .foot p:first-child {
    border-top: 1px solid var(--rule);
    padding-top: 1.5rem;
  }
  .credit {
    margin-top: 0.4rem;
  }
  @media (max-width: 640px) {
    .tagline,
    .local {
      display: none;
    }
  }
</style>
