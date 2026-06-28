<script lang="ts">
  import { view, sellResource } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>RESOURCES</h2>
  <div class="resource-strip">
    {#each view.industry.resources as r (r.id)}
      <div class="resource">
        <span class="r-glyph">{r.glyph}</span>
        <span class="r-name">{r.name}</span>
        <span class="r-amt">{r.amountText}</span>
        <span class="r-rate">{r.rateText}</span>
        <button
          class="r-sell"
          onclick={() => sellResource(r.id)}
          disabled={!r.canSell}
          title="Sell your whole stock at {r.sellValueText} each"
        >
          sell @ {r.sellValueText}
        </button>
      </div>
    {/each}
  </div>
</div>
