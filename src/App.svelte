<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { app } from './lib/state/app.svelte';
  import { compute, parseForm, type Field } from './lib/core/calc';
  import PositionForm from './lib/ui/PositionForm.svelte';
  import Results from './lib/ui/Results.svelte';
  import ThemeToggle from './lib/ui/ThemeToggle.svelte';
  import About from './lib/ui/About.svelte';
  import Support from './lib/ui/Support.svelte';
  import { AUTHOR } from './lib/support';
  import { eur, eurPrice } from './lib/core/format';
  import { amountToInvest } from './lib/core/renfort';

  // Deux vues : le calculateur et la page « À propos et limites » (#a-propos).
  const readView = () => (location.hash === '#a-propos' ? 'a-propos' : 'calculateur');
  let view = $state<'calculateur' | 'a-propos'>(readView());

  onMount(() => {
    app.init();
    const onHash = () => {
      // Un lien de partage collé dans un onglet déjà ouvert.
      if (app.openShare(location.hash)) {
        view = 'calculateur';
        return;
      }
      view = readView();
      if (view === 'a-propos') {
        scrollTo(0, 0);
        void tick().then(() => document.getElementById('about-title')?.focus());
      }
    };
    addEventListener('hashchange', onHash);
    if (view === 'a-propos') void tick().then(() => document.getElementById('about-title')?.focus());
    return () => removeEventListener('hashchange', onHash);
  });

  $effect(() => {
    const theme = app.settings.theme;
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  });

  // Le formulaire est gardé sur l'appareil à chaque modification (D-008).
  $effect(() => {
    JSON.stringify(app.form);
    app.saveForm();
  });

  const parsed = $derived(parseForm(app.form));
  const result = $derived(parsed.ok ? compute(parsed.values) : null);

  const LABELS: Record<Field, string> = {
    asset: 'la crypto',
    quantity: 'la quantité détenue',
    pmp: 'votre prix moyen',
    price: 'le prix actuel',
    buyFee: "les frais d'achat",
    sellFee: 'les frais de vente',
    target: 'le prix moyen visé',
    budget: 'le montant à investir',
    buyPrice: "le prix d'achat",
  };

  // Champs vides : listés dans « Pour commencer » plutôt qu'affichés en erreur.
  const isEmpty = (f: Field) => app.form[f].trim() === '';
  const errors = $derived(parsed.ok ? {} : Object.fromEntries(Object.entries(parsed.errors).filter(([f]) => !isEmpty(f as Field))));
  const missing = $derived(parsed.ok ? [] : (Object.keys(parsed.errors) as Field[]).filter(isEmpty));

  const announce = $derived.by(() => {
    if (!result) return '';
    if (result.target?.status === 'ok' && result.buy) return `Montant à investir : ${eur(amountToInvest(result.buy.amount))}.`;
    if (result.values.mode === 'budget' && result.buy) return `Nouveau prix moyen : ${eurPrice(result.buy.after.pmp)}.`;
    return result.target?.status === 'unreachable' ? 'Cible inatteignable à ce prix d’achat.' : '';
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
  {#if !app.persistent}
    <p class="notice" role="status">
      <span><strong>Stockage indisponible.</strong> Ce navigateur bloque le stockage local (navigation privée ?) : le scénario sera perdu à la fermeture.</span>
    </p>
  {/if}
  {#if app.fromShare}
    <p class="notice" role="status">
      <span><strong>Scénario ouvert depuis un lien de partage.</strong> Il remplace votre dernier scénario sur cet appareil.</span>
      <button class="btn btn-small btn-quiet" type="button" onclick={() => (app.fromShare = false)} aria-label="Fermer ce message">×</button>
    </p>
  {/if}

  <p class="sr-only" aria-live="polite">{announce}</p>

  {#if view === 'a-propos'}
    <About />
  {:else}
  <div class="layout">
    <PositionForm {errors} />

    {#if result}
      <Results {result} />
    {:else}
      <section class="start" aria-labelledby="start-title">
        <h1 id="start-title">Combien investir pour ramener votre prix moyen à une cible ?</h1>
        <p>
          Indiquez votre position et votre objectif : l'outil calcule le montant à investir et le prix d'achat à ne pas dépasser, ou votre nouveau prix moyen pour un
          montant donné, ainsi que votre prix de break-even. Il montre aussi ce que le renfort change à votre exposition.
        </p>
        {#if missing.length}
          <p class="muted">Reste à renseigner : {missing.map((f) => LABELS[f]).join(', ')}.</p>
        {/if}
        <p class="muted small">Tout le calcul se fait dans votre navigateur : rien n'est envoyé. Méthode, formules et limites : <a href="#a-propos">À propos et limites</a>.</p>
      </section>
    {/if}
  </div>
  {/if}
</main>

<footer class="foot">
  <p>
    Outil d'aide au calcul, pas un conseil en investissement. Pour la fiscalité (plus-values, formulaire 2086), voir
    <a href="https://patart50.github.io/pmpa-crypto/" target="_blank" rel="noopener">pmpa-crypto</a>. Code source libre (AGPL-3.0) sur
    <a href="https://github.com/Patart50/renfort-crypto" rel="noopener" target="_blank">GitHub</a> ·
    <a href="#a-propos">À propos et limites</a> · v{__APP_VERSION__}
  </p>
  <p class="credit">
    Créé par <a href={AUTHOR.url} target="_blank" rel="noopener author">{AUTHOR.name} ({AUTHOR.handle})</a> · <Support />
  </p>
</footer>

{#if app.toast}
  <div class="toast" role="status" aria-live="polite">{app.toast}</div>
{/if}

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
    padding-block: 1.5rem 3rem;
    display: grid;
    gap: 1rem;
    min-width: 0;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 24rem) minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
  }
  .start {
    display: grid;
    gap: 0.9rem;
    max-width: 40rem;
    padding: 0.5rem 0;
  }
  .start h1 {
    font-size: 1.7rem;
  }
  .small {
    font-size: 0.85rem;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
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
  .toast {
    position: fixed;
    left: 50%;
    bottom: 1.25rem;
    transform: translateX(-50%);
    background: var(--ink);
    color: var(--paper);
    padding: 0.6rem 1rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow-pop);
    font-size: 0.92rem;
    z-index: 50;
    max-width: calc(100vw - 2rem);
  }
  @media (max-width: 640px) {
    .tagline,
    .local {
      display: none;
    }
  }
</style>
