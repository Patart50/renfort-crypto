<script lang="ts">
  import type { Result } from '../core/calc';
  import { scenarioCsv, scenarioText, shareFragment } from '../export/scenario';
  import { app } from '../state/app.svelte';

  interface Props {
    result: Result;
  }
  let { result }: Props = $props();

  let shareUrl = $state<string | null>(null);
  let shareInput: HTMLInputElement | undefined = $state();

  // Le lien ne vaut que pour le scénario affiché au moment où il a été créé.
  $effect(() => {
    JSON.stringify(app.form);
    shareUrl = null;
  });

  function download() {
    const blob = new Blob([scenarioCsv(result)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `renfort-${(result.values.asset || 'crypto').toLowerCase()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copy(text: string, done: string, fallback?: HTMLInputElement) {
    try {
      await navigator.clipboard.writeText(text);
      app.notify(done);
    } catch {
      if (fallback) {
        fallback.select();
        app.notify('Copie automatique impossible : le texte est sélectionné, copiez-le (Ctrl+C).');
      } else app.notify('Copie automatique impossible dans ce navigateur.');
    }
  }

  function createLink() {
    shareUrl = location.origin + location.pathname + shareFragment(app.form);
    void copy(shareUrl, 'Lien copié.', shareInput);
  }
</script>

<section class="panel export" aria-labelledby="export-title">
  <h2 id="export-title">Garder ou partager ce scénario</h2>
  <div class="actions">
    <button class="btn" type="button" onclick={download}>Télécharger en CSV</button>
    <button class="btn" type="button" onclick={() => copy(scenarioText(result), 'Résumé copié.')}>Copier le résumé</button>
  </div>
  <p class="muted small">Le dernier scénario reste aussi sur cet appareil, dans ce navigateur.</p>

  <div class="share">
    <h3>Lien de partage</h3>
    <p class="small">
      Le lien contient votre position (quantité, prix moyen, objectif) : toute personne qui le reçoit la verra. Les paramètres sont placés après le « # » de l'adresse,
      une partie qui n'est jamais envoyée au serveur.
    </p>
    {#if shareUrl}
      <label class="field">
        <span>Lien du scénario</span>
        <input bind:this={shareInput} readonly value={shareUrl} onfocus={(e) => (e.currentTarget as HTMLInputElement).select()} />
      </label>
      <div class="actions">
        <button class="btn btn-small" type="button" onclick={() => copy(shareUrl!, 'Lien copié.', shareInput)}>Copier le lien</button>
      </div>
    {:else}
      <div class="actions">
        <button class="btn btn-small" type="button" onclick={createLink}>Créer un lien de partage</button>
      </div>
    {/if}
  </div>
</section>

<style>
  .export {
    padding: 1.1rem;
    display: grid;
    gap: 0.75rem;
  }
  h2 {
    font-size: 1.15rem;
  }
  h3 {
    font-size: 1rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .small {
    font-size: 0.85rem;
  }
  .share {
    display: grid;
    gap: 0.6rem;
    border-top: 1px solid var(--rule);
    padding-top: 0.8rem;
  }
  .share input {
    font-size: 0.82rem;
  }
</style>
