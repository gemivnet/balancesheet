<script lang="ts">
  import { view, buyUpgrade } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>UPGRADES</h2>
  {#if view.upgrades.length === 0}
    <p class="empty">No upgrades available yet — grow your businesses to unlock more.</p>
  {/if}
  <ul class="upgrades">
    {#each view.upgrades as u (u.id)}
      <li class="upgrade" class:ui={u.kind === 'ui'}>
        <button onclick={() => buyUpgrade(u.id)} disabled={!u.canBuy}>
          <span class="u-name">{u.name}</span>
          <span class="u-desc">{u.desc}</span>
          <span class="u-cost">{u.cost}</span>
        </button>
      </li>
    {/each}
  </ul>
</div>
