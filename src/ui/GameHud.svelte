<script lang="ts">
  import { view, openMenu } from '../store/game.svelte'
</script>

<div class="game-hud">
  <span class="gh-title">ASCII&nbsp;TYCOON</span>
  <span class="gh-cash">{view.cashText}</span>
  <span class="gh-stat">{view.incomeText}</span>
  <span class="gh-stat muted">net {view.finance.netWorthText}</span>
  <span class="gh-spacer"></span>
  <span class="gh-stat muted gh-city">{view.city.tierName} · rent {view.city.rentText}</span>
  <button class="gh-menu" onclick={() => openMenu('settings')} title="Settings" aria-label="settings">
    ⚙
  </button>
</div>
