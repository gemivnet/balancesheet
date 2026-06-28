<script lang="ts">
  import { view } from '../store/game.svelte'
</script>

<div class="hud">
  <div class="stat">
    <span class="label">CASH</span>
    <span class="value">{view.cashText}</span>
  </div>
  <div class="stat">
    <span class="label">INCOME</span>
    <span class="value">{view.incomeText}</span>
  </div>
  <div class="stat small">
    <span class="label">EARNED</span>
    <span class="value">{view.lifetimeText}</span>
  </div>
  <div class="stat small">
    <span class="label">CLICKS</span>
    <span class="value">{view.clicks}</span>
  </div>
</div>
