<script lang="ts">
  import { view } from '../store/game.svelte'
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
      </div>
    {/each}
  </div>
</div>
