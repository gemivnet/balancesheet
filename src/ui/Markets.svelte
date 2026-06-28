<script lang="ts">
  import { view, buyShares, sellAll } from '../store/game.svelte'
  import type { InstrumentRow } from '../store/game.svelte'
</script>

{#snippet instrument(r: InstrumentRow)}
  <li class="instrument">
    <div class="inst-head">
      <span class="inst-ticker" title={r.name}>{r.ticker}</span>
      <span class="inst-price">{r.priceText}</span>
      <span class="inst-change" class:down={!r.up}>{r.changePct}</span>
    </div>
    <div class="inst-spark">{r.spark}</div>
    <div class="inst-sub">
      <span class="inst-holding">{r.shares} held · {r.valueText}</span>
      <span class="inst-btns">
        <button onclick={() => buyShares(r.id, 1)} disabled={!r.canBuy1}>buy 1</button>
        <button onclick={() => buyShares(r.id, 10)} disabled={!r.canBuy10}>buy 10</button>
        <button onclick={() => sellAll(r.id)} disabled={!r.canSellAll}>sell all</button>
      </span>
    </div>
  </li>
{/snippet}

<div class="panel">
  <h2>STOCK MARKET</h2>
  <ul class="instruments">
    {#each view.finance.stocks as r (r.id)}
      {@render instrument(r)}
    {/each}
  </ul>

  <h2>FX</h2>
  <ul class="instruments">
    {#each view.finance.fx as r (r.id)}
      {@render instrument(r)}
    {/each}
  </ul>
</div>
