<script lang="ts">
  import { app } from '../state/app.svelte';
  import type { Field } from '../core/calc';

  interface Props {
    /** Erreurs de format à afficher (les champs simplement vides n'en font pas partie). */
    errors: Partial<Record<Field, string>>;
  }
  let { errors }: Props = $props();

  const asset = $derived(app.form.asset.trim().toUpperCase() || 'crypto');
  const err = (f: Field) => errors[f];
  const describedBy = (f: Field, hint?: string) => [hint, errors[f] ? `${f}-err` : ''].filter(Boolean).join(' ') || undefined;

  function setMode(mode: 'target' | 'budget') {
    app.form.mode = mode;
  }

  function onModeKey(e: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const next = app.form.mode === 'target' ? 'budget' : 'target';
    setMode(next);
    document.getElementById(`mode-${next}`)?.focus();
  }
</script>

<form class="panel params" aria-labelledby="pos-title" onsubmit={(e) => e.preventDefault()} novalidate>
  <fieldset>
    <legend id="pos-title"><h2>Votre position</h2></legend>
    <div class="grid">
      <label class="field">
        <span>Crypto</span>
        <input
          bind:value={app.form.asset}
          oninput={() => (app.priceRoute = null)}
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          maxlength="15"
          placeholder="BTC"
          aria-invalid={!!err('asset')}
          aria-describedby={describedBy('asset')}
        />
        {#if err('asset')}<small id="asset-err" class="error">{err('asset')}</small>{/if}
      </label>
      <label class="field">
        <span>Quantité détenue</span>
        <input bind:value={app.form.quantity} inputmode="decimal" autocomplete="off" placeholder="0,5" aria-invalid={!!err('quantity')} aria-describedby={describedBy('quantity')} />
        {#if err('quantity')}<small id="quantity-err" class="error">{err('quantity')}</small>{/if}
      </label>
      <label class="field">
        <span>Prix moyen actuel (€)</span>
        <input bind:value={app.form.pmp} inputmode="decimal" autocomplete="off" placeholder="100 000" aria-invalid={!!err('pmp')} aria-describedby={describedBy('pmp', 'pmp-hint')} />
        <small id="pmp-hint">Frais d'achat inclus, comme dans pmpa-crypto.</small>
        {#if err('pmp')}<small id="pmp-err" class="error">{err('pmp')}</small>{/if}
      </label>
      <div class="field wide">
        <label for="price"><span class="label">Prix actuel (€)</span></label>
        <div class="with-btn">
          <input
            id="price"
            bind:value={app.form.price}
            oninput={() => (app.priceRoute = null)}
            inputmode="decimal"
            autocomplete="off"
            placeholder="60 000"
            aria-invalid={!!err('price')}
            aria-describedby={describedBy('price', 'price-hint')}
          />
          <button class="btn btn-small" type="button" onclick={() => app.requestPrice()} disabled={app.priceStatus === 'loading'}>
            {app.priceStatus === 'loading' ? 'Chargement…' : 'Prix du jour'}
          </button>
        </div>
        <small id="price-hint">
          {#if app.priceRoute}Cours Binance ({app.priceRoute}), modifiable.{:else}À saisir, ou « Prix du jour » via Binance.{/if}
        </small>
        {#if err('price')}<small id="price-err" class="error">{err('price')}</small>{/if}
        {#if app.priceStatus === 'error' && app.priceMessage}<small class="error" role="alert">{app.priceMessage}</small>{/if}
      </div>

      {#if app.priceStatus === 'consent'}
        <div class="consent wide" role="group" aria-labelledby="consent-title">
          <p id="consent-title"><strong>Récupérer le prix de {asset} sur Binance ?</strong></p>
          <p>
            L'outil demandera à l'API publique de Binance la liste de tous les cours. Rien d'autre n'est envoyé : ni la crypto choisie, ni quantité, ni montant. Votre adresse
            IP est visible de Binance, comme pour toute page web. Ce choix est mémorisé sur cet appareil.
          </p>
          <div class="actions">
            <button class="btn btn-primary btn-small" type="button" onclick={() => app.acceptAndFetch()}>Autoriser et récupérer</button>
            <button class="btn btn-small" type="button" onclick={() => app.cancelConsent()}>Saisir à la main</button>
          </div>
        </div>
      {/if}

      <label class="field">
        <span>Frais d'achat (%)</span>
        <input bind:value={app.form.buyFee} inputmode="decimal" autocomplete="off" placeholder="0,1" aria-invalid={!!err('buyFee')} aria-describedby={describedBy('buyFee')} />
        {#if err('buyFee')}<small id="buyFee-err" class="error">{err('buyFee')}</small>{/if}
      </label>
      <label class="field">
        <span>Frais de vente (%)</span>
        <input bind:value={app.form.sellFee} inputmode="decimal" autocomplete="off" placeholder="0,1" aria-invalid={!!err('sellFee')} aria-describedby={describedBy('sellFee')} />
        {#if err('sellFee')}<small id="sellFee-err" class="error">{err('sellFee')}</small>{/if}
      </label>
    </div>
    {#if app.settings.allowPriceFetch}
      <p class="revoke muted">
        Binance autorisé sur cet appareil.
        <button type="button" class="link" onclick={() => app.setConsent(false)}>Retirer l'autorisation</button>
      </p>
    {/if}
  </fieldset>

  <fieldset>
    <legend><h2>Votre objectif</h2></legend>
    <div class="modes" role="radiogroup" aria-label="Type de calcul">
      {#each [{ id: 'target', label: 'Atteindre un prix moyen' }, { id: 'budget', label: 'Investir un montant' }] as m (m.id)}
        <button
          id={`mode-${m.id}`}
          type="button"
          role="radio"
          aria-checked={app.form.mode === m.id}
          tabindex={app.form.mode === m.id ? 0 : -1}
          onclick={() => setMode(m.id as 'target' | 'budget')}
          onkeydown={onModeKey}>{m.label}</button
        >
      {/each}
    </div>

    <div class="grid">
      {#if app.form.mode === 'budget'}
        <label class="field">
          <span>Montant à investir (€)</span>
          <input bind:value={app.form.budget} inputmode="decimal" autocomplete="off" placeholder="2 000" aria-invalid={!!err('budget')} aria-describedby={describedBy('budget', 'budget-hint')} />
          <small id="budget-hint">Frais compris.</small>
          {#if err('budget')}<small id="budget-err" class="error">{err('budget')}</small>{/if}
        </label>
      {/if}
      <label class="field">
        <span>Prix moyen visé (€){app.form.mode === 'budget' ? ' — facultatif' : ''}</span>
        <input bind:value={app.form.target} inputmode="decimal" autocomplete="off" placeholder="80 000" aria-invalid={!!err('target')} aria-describedby={describedBy('target', app.form.mode === 'budget' ? 'target-hint' : undefined)} />
        {#if app.form.mode === 'budget'}<small id="target-hint">Donne le prix d'achat maximum pour l'atteindre avec ce montant.</small>{/if}
        {#if err('target')}<small id="target-err" class="error">{err('target')}</small>{/if}
      </label>
      <label class="field">
        <span>Prix d'achat (€)</span>
        <input
          bind:value={app.form.buyPrice}
          inputmode="decimal"
          autocomplete="off"
          placeholder={app.form.price || 'prix actuel'}
          aria-invalid={!!err('buyPrice')}
          aria-describedby={describedBy('buyPrice', 'buyPrice-hint')}
        />
        <small id="buyPrice-hint">Vide : prix actuel. Pour un ordre limite plus bas, indiquez son prix.</small>
        {#if err('buyPrice')}<small id="buyPrice-err" class="error">{err('buyPrice')}</small>{/if}
      </label>
    </div>
  </fieldset>

  <p class="reset">
    <button type="button" class="link muted" onclick={() => app.resetForm()}>Effacer le formulaire</button>
  </p>
</form>

<style>
  .params {
    padding: 1.1rem 1.1rem 0.9rem;
    display: grid;
    gap: 1.25rem;
    align-content: start;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
    display: grid;
    gap: 0.8rem;
  }
  legend {
    padding: 0;
    margin-bottom: 0.8rem;
  }
  h2 {
    font-size: 1.15rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem 0.9rem;
    align-items: start;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .field .label {
    font-size: 0.85rem;
    font-weight: 550;
  }
  .with-btn {
    display: flex;
    gap: 0.4rem;
  }
  .with-btn input {
    flex: 1;
  }
  .consent {
    display: grid;
    gap: 0.5rem;
    padding: 0.8rem 0.9rem;
    border-radius: var(--radius);
    background: var(--accent-soft);
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .revoke {
    font-size: 0.82rem;
  }
  .modes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius);
    padding: 3px;
    gap: 3px;
    background: var(--surface-2);
  }
  .modes button {
    font: inherit;
    font-size: 0.9rem;
    font-weight: 550;
    border: 0;
    border-radius: calc(var(--radius) - 2px);
    padding: 0.45rem 0.5rem;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .modes button[aria-checked='true'] {
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 0 0 1px var(--rule-strong);
  }
  .link {
    font: inherit;
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
  }
  .reset {
    font-size: 0.85rem;
    border-top: 1px solid var(--rule);
    padding-top: 0.7rem;
  }
  .reset .link {
    color: var(--muted);
  }
  @media (max-width: 420px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
