<!--
  Courbe x/y en SVG maison (D-007), sur le modèle du graphique de dca-crypto
  (commit 9414232, LineChart.svelte) : axe zéro inclus, réticule et info-bulle
  au survol comme au clavier (flèches, Début, Fin), ligne de référence et
  repère vertical. Valeurs converties en `number` pour l'affichage seulement.
-->
<script lang="ts">
  import type { ChartData } from '../core/calc';
  import { eurPrice, eurRound } from '../core/format';
  import { dec } from '../core/money';

  interface Props {
    title: string;
    /** Phrase qui résume le graphique pour les lecteurs d'écran. */
    summary: string;
    data: ChartData;
    xLabel: string;
    /** Axe vertical depuis zéro (montants) ; sinon resserré sur les données (prix moyen). */
    zeroBased?: boolean;
  }
  let { title, summary, data, xLabel, zeroBased = true }: Props = $props();

  let width = $state(640);
  let active = $state<number | null>(null);
  const uid = $props.id();

  const height = $derived(width < 520 ? 240 : 290);
  const m = $derived({ top: 16, right: 16, bottom: 40, left: width < 420 ? 58 : 70 });
  const plotW = $derived(Math.max(10, width - m.left - m.right));
  const plotH = $derived(height - m.top - m.bottom);

  const pts = $derived(data.points.map((p) => ({ x: p.x.toNumber(), y: p.y.toNumber(), xd: p.x, yd: p.y })));
  const n = $derived(pts.length);

  function niceStep(range: number, count: number): number {
    const raw = range / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const norm = raw / mag;
    return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  }

  function niceScale(lo: number, hi: number, count: number) {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) [lo, hi] = [0, 1];
    if (hi === lo) hi = lo + 1;
    const step = niceStep(hi - lo, count);
    const min = Math.floor(lo / step) * step;
    const max = Math.ceil(hi / step) * step;
    const ticks: number[] = [];
    for (let t = min; t <= max + step / 2; t += step) ticks.push(Number(t.toPrecision(12)));
    return { min, max, ticks };
  }

  const ys = $derived.by(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of pts) {
      lo = Math.min(lo, p.y);
      hi = Math.max(hi, p.y);
    }
    if (data.reference) {
      lo = Math.min(lo, data.reference.y.toNumber());
      hi = Math.max(hi, data.reference.y.toNumber());
    }
    if (zeroBased) return niceScale(0, hi, 4);
    const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02 || 1;
    return niceScale(Math.max(0, lo - pad), hi + pad, 4);
  });

  const xs = $derived.by(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of pts) {
      lo = Math.min(lo, p.x);
      hi = Math.max(hi, p.x);
    }
    if (data.vertical) hi = Math.max(hi, data.vertical.x.toNumber());
    const s = niceScale(lo, hi, width < 520 ? 3 : 5);
    // Bornes serrées sur les données, graduations rondes à l'intérieur.
    return { min: lo, max: hi, ticks: s.ticks.filter((t) => t >= lo && t <= hi) };
  });

  const x = (v: number) => m.left + ((v - xs.min) / (xs.max - xs.min || 1)) * plotW;
  const y = (v: number) => m.top + plotH - ((v - ys.min) / (ys.max - ys.min)) * plotH;

  const path = $derived(pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(''));
  const marker = $derived(data.marker ? { x: x(data.marker.x.toNumber()), y: y(data.marker.y.toNumber()) } : null);
  const ref = $derived(data.reference ? { y: y(data.reference.y.toNumber()), label: data.reference.label } : null);
  const vert = $derived(data.vertical ? { x: x(data.vertical.x.toNumber()), label: data.vertical.label } : null);

  const fmtY = (v: number) => eurRound(dec(v));
  const fmtX = (v: number) => eurRound(dec(v));

  function nearest(px: number): number {
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(pts[i].x) - px) < Math.abs(x(pts[best].x) - px)) best = i;
    return best;
  }

  function onMove(e: PointerEvent) {
    if (n === 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    active = nearest(m.left + e.clientX - rect.left);
  }

  function onKey(e: KeyboardEvent) {
    if (n === 0) return;
    const keys: Record<string, () => number> = {
      ArrowLeft: () => (active ?? n) - 1,
      ArrowDown: () => (active ?? n) - 1,
      ArrowRight: () => (active ?? -1) + 1,
      ArrowUp: () => (active ?? -1) + 1,
      Home: () => 0,
      End: () => n - 1,
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    active = Math.max(0, Math.min(n - 1, keys[e.key]()));
  }

  const tip = $derived.by(() => {
    if (active === null || active >= n) return null;
    const p = pts[active];
    const left = x(p.x);
    return { left, top: y(p.y), alignRight: left > m.left + plotW * 0.6, x: eurPrice(p.xd), y: eurPrice(p.yd) };
  });
  const announce = $derived(tip ? `${xLabel} ${tip.x} : ${data.yLabel.toLowerCase()} ${tip.y}` : '');
</script>

<figure class="chart panel">
  <figcaption>
    <h3 id={`${uid}-title`}>{title}</h3>
    <ul class="legend" aria-label="Légende">
      <li>
        <svg width="22" height="10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="var(--series-1)" stroke-width="2.5" /></svg>
        {data.yLabel}
      </li>
      {#if data.reference}
        <li>
          <svg width="22" height="10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="var(--series-muted)" stroke-width="1.5" stroke-dasharray="4 3" /></svg>
          {data.reference.label}
        </li>
      {/if}
      {#if data.marker}
        <li>
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="var(--series-2)" /></svg>
          Votre scénario
        </li>
      {/if}
    </ul>
  </figcaption>

  <div class="plot" bind:clientWidth={width}>
    <svg {width} {height} role="img" aria-labelledby={`${uid}-title ${uid}-sum`}>
      <desc id={`${uid}-sum`}>{summary}</desc>
      <g class="grid" aria-hidden="true">
        {#each ys.ticks as t (t)}
          <line x1={m.left} x2={m.left + plotW} y1={y(t)} y2={y(t)} />
          <text x={m.left - 8} y={y(t)} dy="0.32em" text-anchor="end">{fmtY(t)}</text>
        {/each}
        {#each xs.ticks as t (t)}
          <text x={x(t)} y={m.top + plotH + 16} text-anchor="middle">{fmtX(t)}</text>
        {/each}
        <text class="axis-title" x={m.left + plotW / 2} y={height - 4} text-anchor="middle">{xLabel}</text>
      </g>
      <g aria-hidden="true">
        {#if ref}
          <line class="refline" x1={m.left} x2={m.left + plotW} y1={ref.y} y2={ref.y} />
        {/if}
        {#if vert}
          <line class="vline" x1={vert.x} x2={vert.x} y1={m.top} y2={m.top + plotH} />
          <text class="vlabel" x={vert.x - 5} y={m.top + plotH - 6} text-anchor="end">{vert.label}</text>
        {/if}
        <path d={path} fill="none" stroke="var(--series-1)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
        {#if marker}
          <circle cx={marker.x} cy={marker.y} r="5.5" fill="var(--series-2)" class="dot" />
        {/if}
        {#if tip}
          <line class="crosshair" x1={tip.left} x2={tip.left} y1={m.top} y2={m.top + plotH} />
          <circle cx={tip.left} cy={tip.top} r="4" fill="var(--series-1)" class="dot" />
        {/if}
      </g>
    </svg>

    <div
      class="hit"
      style:left={`${m.left}px`}
      style:top={`${m.top}px`}
      style:width={`${plotW}px`}
      style:height={`${plotH}px`}
      role="slider"
      tabindex="0"
      aria-label={`${title} : ${xLabel.toLowerCase()} exploré (flèches)`}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, n - 1)}
      aria-valuenow={active ?? 0}
      aria-valuetext={announce || 'Survolez ou utilisez les flèches pour lire les valeurs'}
      onpointermove={onMove}
      onpointerdown={onMove}
      onpointerleave={() => (active = null)}
      onkeydown={onKey}
      onblur={() => (active = null)}
    ></div>

    {#if tip}
      <div class="tip" class:right={tip.alignRight} style:left={`${tip.left}px`} style:top={`${m.top}px`} aria-hidden="true">
        <div class="tip-x">{xLabel} : <strong class="num">{tip.x}</strong></div>
        <div class="tip-y">{data.yLabel} : <strong class="num">{tip.y}</strong></div>
      </div>
    {/if}
  </div>
</figure>

<style>
  .chart {
    margin: 0;
    padding: 1rem 1rem 0.5rem;
    display: grid;
    gap: 0.6rem;
    min-width: 0;
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.4rem 1rem;
  }
  h3 {
    font-size: 1.05rem;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .plot {
    position: relative;
    min-width: 0;
  }
  svg {
    display: block;
    overflow: visible;
  }
  .grid line {
    stroke: var(--rule);
    stroke-width: 1;
  }
  .grid text,
  .vlabel {
    font-size: 11.5px;
    fill: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .axis-title {
    font-size: 12px;
  }
  .refline {
    stroke: var(--series-muted);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }
  .vline {
    stroke: var(--rule-strong);
    stroke-width: 1.5;
    stroke-dasharray: 2 3;
  }
  .dot {
    stroke: var(--surface);
    stroke-width: 2;
  }
  .crosshair {
    stroke: var(--muted);
    stroke-width: 1;
  }
  .hit {
    position: absolute;
    cursor: crosshair;
    touch-action: pan-y;
    border-radius: 2px;
    z-index: 1;
  }
  .hit:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  .tip {
    position: absolute;
    transform: translateX(12px);
    pointer-events: none;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius);
    box-shadow: var(--shadow-pop);
    padding: 0.45rem 0.6rem;
    font-size: 0.82rem;
    white-space: nowrap;
    z-index: 2;
    color: var(--muted);
  }
  .tip strong {
    color: var(--ink);
  }
  .tip.right {
    transform: translateX(calc(-100% - 12px));
  }
</style>
