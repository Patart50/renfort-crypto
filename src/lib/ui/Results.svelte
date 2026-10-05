<script lang="ts">
  import type { PositionSummary, Result } from '../core/calc';
  import { eur, eurPrice, eurSigned, pct, qty } from '../core/format';
  import { amountToInvest } from '../core/renfort';
  import { targetStatusText } from '../export/scenario';
  import XYChart from './XYChart.svelte';
  import ExportPanel from './ExportPanel.svelte';

  interface Props {
    result: Result;
  }
  let { result }: Props = $props();

  const v = $derived(result.values);
  const a = $derived(v.asset || 'crypto');
  const holds = $derived(v.position.quantity.gt(0));
  const t = $derived(result.target);
  const b = $derived(result.buy);

  const sides = $derived<{ label: string; s: PositionSummary }[]>([
    ...(holds ? [{ label: 'Avant', s: result.before }] : []),
    ...(result.after ? [{ label: holds ? 'Après renfort' : 'Après achat', s: result.after }] : []),
  ]);

  function rise(s: PositionSummary): string {
    const r = s.exposure.riseToBreakEven;
    return r.lte(0) ? 'Déjà au-dessus' : pct(r.mul(100));
  }

  const exposureSentence = $derived.by(() => {
    if (!holds || !result.after) return '';
    const extra = result.after.cost.minus(result.before.cost);
    const share = extra.div(result.before.cost).mul(100);
    return `Ce renfort augmente votre capital engagé de ${eur(extra)} (${pct(share)}). Si le cours baisse encore de 20 %, votre résultat passe de ${eurSigned(result.before.exposure.gainAfterShock)} à ${eurSigned(result.after.exposure.gainAfterShock)}.`;
  });

  const chartSummary = $derived.by(() => {
    if (v.mode === 'target') {
      if (!result.chart.points.length) return 'Aucune courbe : la cible est déjà atteinte.';
      const first = result.chart.points[0];
      const last = result.chart.points.at(-1)!;
      return `Montant à investir selon le prix d'achat : ${eur(first.y)} à ${eurPrice(first.x)}, ${eur(last.y)} à ${eurPrice(last.x)}. Il tend vers l'infini à l'approche du prix limite.`;
    }
    const first = result.chart.points[0];
    const last = result.chart.points.at(-1)!;
    return `Nouveau prix moyen selon le prix d'achat : ${eurPrice(first.y)} à ${eurPrice(first.x)}, ${eurPrice(last.y)} à ${eurPrice(last.x)}.`;
  });

  const dropLabel = (d: Result['targetRows'][number]['drop']) => (d.isZero() ? 'Prix actuel' : `−${pct(d.mul(100)).replace('+', '')}`);
</script>

<div class="results">
  <section class="panel key" aria-labelledby="key-title">
    <h2 id="key-title">Résultat</h2>

    {#if v.mode === 'target'}
      {#if t?.status === 'ok' && b}
        <p class="lead">
          Pour ramener votre prix moyen à <strong class="num">{eurPrice(v.target!)}</strong> en achetant à <strong class="num">{eurPrice(v.buyPrice)}</strong> :
        </p>
        <dl class="figures">
          <div class="main">
            <dt>Montant à investir</dt>
            <dd class="num">{eur(amountToInvest(b.amount))}</dd>
            <dd class="sub">frais compris ({eur(b.fees)} de frais)</dd>
          </div>
          <div>
            <dt>Quantité à acheter</dt>
            <dd class="num">{qty(b.quantityBought)} {a}</dd>
          </div>
          <div>
            <dt>Nouvelle quantité</dt>
            <dd class="num">{qty(b.after.quantity)} {a}</dd>
          </div>
          <div>
            <dt>Nouveau break-even</dt>
            <dd class="num">{eurPrice(result.after!.breakEven)}</dd>
          </div>
        </dl>
        <p class="note">
          Prix limite : <strong class="num">{eurPrice(t.limitPrice)}</strong>. Plus votre prix d'achat s'en approche, plus le montant nécessaire grimpe ; à ce prix ou
          au-dessus, la cible est inatteignable.
        </p>
      {:else if t}
        <p class="notice" role="status"><span>{targetStatusText(result)}</span></p>
        {#if t.status === 'unreachable'}
          <p class="note">Le tableau ci-dessous montre les montants nécessaires si le cours baisse.</p>
        {/if}
      {/if}
    {:else if b}
      <p class="lead">
        En investissant <strong class="num">{eur(v.budget!)}</strong> à <strong class="num">{eurPrice(v.buyPrice)}</strong> :
      </p>
      <dl class="figures">
        <div class="main">
          <dt>{holds ? 'Nouveau prix moyen' : 'Prix moyen de cet achat'}</dt>
          <dd class="num">{eurPrice(b.after.pmp)}</dd>
          {#if holds}<dd class="sub">contre {eurPrice(v.position.pmp)} aujourd'hui</dd>{/if}
        </div>
        <div>
          <dt>Quantité achetée</dt>
          <dd class="num">{qty(b.quantityBought)} {a}</dd>
        </div>
        <div>
          <dt>Nouvelle quantité</dt>
          <dd class="num">{qty(b.after.quantity)} {a}</dd>
        </div>
        <div>
          <dt>Nouveau break-even</dt>
          <dd class="num">{eurPrice(result.after!.breakEven)}</dd>
        </div>
      </dl>
      {#if b.raisesPmp}
        <p class="note">Ce prix d'achat est au-dessus de votre prix moyen : l'achat le fait monter.</p>
      {/if}
      {#if result.maxPrice}
        <p class="note">
          {#if result.maxPrice.status === 'ok'}
            Pour atteindre un prix moyen de <strong class="num">{eurPrice(v.target!)}</strong> avec ce montant, il faut acheter à
            <strong class="num">{eurPrice(result.maxPrice.price)}</strong> au plus.
          {:else if result.maxPrice.status === 'reached'}
            Votre prix moyen est déjà au niveau visé ou en dessous.
          {:else}
            Sans position, pas de prix moyen visé à atteindre : c'est votre premier achat.
          {/if}
        </p>
      {/if}
    {/if}
  </section>

  <section class="panel block" aria-labelledby="exp-title">
    <h2 id="exp-title">Exposition</h2>
    <p class="intro">
      Baisser son prix moyen ne change pas, à lui seul, le résultat : il dépend du prix futur et de la quantité détenue. Renforcer augmente la somme exposée.
    </p>
    {#if sides.length}
      <div class="table-wrap">
        <table>
          <caption class="sr-only">Exposition {sides.length > 1 ? 'avant et après le renfort' : ''}, au prix actuel de {eurPrice(v.price)}</caption>
          <thead>
            <tr>
              <th scope="col"><span class="sr-only">Indicateur</span></th>
              {#each sides as side (side.label)}<th scope="col">{side.label}</th>{/each}
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">Quantité</th>{#each sides as side (side.label)}<td class="num">{qty(side.s.position.quantity)} {a}</td>{/each}</tr>
            <tr><th scope="row">Capital engagé</th>{#each sides as side (side.label)}<td class="num">{eur(side.s.cost)}</td>{/each}</tr>
            <tr><th scope="row">Plus-value latente au prix actuel</th>{#each sides as side (side.label)}<td class="num" class:gain={side.s.latent.gt(0)} class:loss={side.s.latent.lt(0)}>{eurSigned(side.s.latent)}</td>{/each}</tr>
            <tr><th scope="row">Si le cours baisse encore de 20 %</th>{#each sides as side (side.label)}<td class="num" class:loss={side.s.exposure.gainAfterShock.lt(0)} class:gain={side.s.exposure.gainAfterShock.gt(0)}>{eurSigned(side.s.exposure.gainAfterShock)}</td>{/each}</tr>
            <tr><th scope="row">Prix de break-even</th>{#each sides as side (side.label)}<td class="num">{eurPrice(side.s.breakEven)}</td>{/each}</tr>
            <tr><th scope="row">Hausse nécessaire pour y revenir</th>{#each sides as side (side.label)}<td class="num">{rise(side.s)}</td>{/each}</tr>
          </tbody>
        </table>
      </div>
      {#if exposureSentence}<p class="note">{exposureSentence}</p>{/if}
      <p class="fine muted">Valeurs nettes des frais de vente, au prix actuel de {eurPrice(v.price)}.</p>
    {:else}
      <p class="note">Aucun achat dans ce scénario : votre exposition reste celle d'aujourd'hui.</p>
    {/if}
  </section>

  <section class="panel block" aria-labelledby="sc-title">
    <h2 id="sc-title">Si le cours baisse</h2>
    <p class="intro">
      {v.mode === 'target'
        ? `Montant à investir pour atteindre un prix moyen de ${eurPrice(v.target!)}, selon le prix auquel vous achetez.`
        : `Effet d'un achat de ${eur(v.budget!)} selon le prix auquel vous achetez.`}
    </p>
    <!-- Tableau défilable sur mobile : la région doit être atteignable au clavier (WCAG, règle axe scrollable-region-focusable). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-wrap" role="region" aria-labelledby="sc-title" tabindex="0">
      <table>
        <caption class="sr-only">Scénarios par niveau de baisse du prix actuel</caption>
        <thead>
          {#if v.mode === 'target'}
            <tr><th scope="col">Baisse</th><th scope="col">Prix d'achat</th><th scope="col">Montant à investir</th><th scope="col">Quantité achetée</th><th scope="col">Capital engagé après</th></tr>
          {:else}
            <tr><th scope="col">Baisse</th><th scope="col">Prix d'achat</th><th scope="col">Quantité achetée</th><th scope="col">Nouveau prix moyen</th><th scope="col">Capital engagé après</th></tr>
          {/if}
        </thead>
        <tbody>
          {#if v.mode === 'target'}
            {#each result.targetRows as row (row.drop.toString())}
              <tr>
                <th scope="row" class="drop">{dropLabel(row.drop)}</th>
                <td class="num">{eurPrice(row.price)}</td>
                {#if row.result.status === 'ok'}
                  <td class="num"><strong>{eur(amountToInvest(row.result.amount))}</strong></td>
                  <td class="num">{qty(row.result.buy.quantityBought)}</td>
                  <td class="num">{eur(row.result.buy.after.quantity.mul(row.result.buy.after.pmp))}</td>
                {:else}
                  <td class="impossible" colspan="3">{row.result.status === 'unreachable' ? 'Inatteignable à ce prix' : 'Déjà atteint'}</td>
                {/if}
              </tr>
            {/each}
          {:else}
            {#each result.budgetRows as row (row.drop.toString())}
              <tr>
                <th scope="row" class="drop">{dropLabel(row.drop)}</th>
                <td class="num">{eurPrice(row.price)}</td>
                <td class="num">{qty(row.result.quantityBought)}</td>
                <td class="num"><strong>{eurPrice(row.result.after.pmp)}</strong></td>
                <td class="num">{eur(row.result.after.quantity.mul(row.result.after.pmp))}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </section>

  {#if result.chart.points.length}
    <XYChart
      title={v.mode === 'target' ? 'Montant nécessaire selon le prix d’achat' : 'Nouveau prix moyen selon le prix d’achat'}
      summary={chartSummary}
      data={result.chart}
      xLabel="Prix d'achat"
      zeroBased={v.mode === 'target'}
    />
  {/if}

  <ExportPanel {result} />
</div>

<style>
  .results {
    display: grid;
    gap: 1rem;
    min-width: 0;
    align-content: start;
  }
  .panel.key,
  .panel.block {
    padding: 1.1rem;
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }
  h2 {
    font-size: 1.15rem;
  }
  .lead {
    color: var(--muted);
  }
  .lead strong {
    color: var(--ink);
  }
  .figures {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem 1rem;
    margin: 0;
  }
  .figures > div {
    display: grid;
    align-content: start;
    gap: 0.15rem;
    min-width: 0;
  }
  .figures .main {
    grid-column: 1 / -1;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--rule);
  }
  dt {
    font-size: 0.82rem;
    color: var(--muted);
    font-weight: 550;
  }
  dd {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .main dd {
    font-family: var(--font-doc);
    font-size: 2.1rem;
    line-height: 1.1;
    color: var(--accent);
  }
  .main dd.sub {
    font-family: var(--font-ui);
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 400;
    line-height: 1.4;
  }
  .note {
    font-size: 0.92rem;
  }
  .intro {
    font-size: 0.92rem;
    color: var(--muted);
  }
  .fine {
    font-size: 0.8rem;
  }
  th[scope='row'] {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink);
    white-space: normal;
  }
  th.drop {
    white-space: nowrap;
  }
  .impossible {
    text-align: center;
    color: var(--muted);
    font-style: italic;
  }
  @media (max-width: 520px) {
    .figures {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    .main dd {
      font-size: 1.8rem;
    }
    th,
    td {
      padding: 0.5rem 0.45rem;
      font-size: 0.85rem;
    }
  }
</style>
