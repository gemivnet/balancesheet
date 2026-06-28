<script lang="ts">
  import { view, buyRental, buyDensity, buyUpgrade } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>REAL ESTATE</h2>
  <div class="re-stats">
    <div><span class="re-label">CITY</span><span class="re-val">{view.city.tierName}</span></div>
    <div><span class="re-label">PROPERTIES</span><span class="re-val">{view.city.rentalCount}</span></div>
    <div><span class="re-label">DENSITY</span><span class="re-val">{view.city.densityName}</span></div>
    <div><span class="re-label">RENT</span><span class="re-val">{view.city.rentText}</span></div>
  </div>

  <div class="re-actions">
    <button class="buy-prop" onclick={buyRental} disabled={!view.city.canBuyRental}>
      buy property · {view.city.rentalCostText}
    </button>
    <button class="buy-prop" onclick={buyDensity} disabled={!view.city.canBuyDensity}>
      {#if view.city.atMaxDensity}
        max density reached
      {:else}
        raise density · {view.city.densityCostText}
      {/if}
    </button>
  </div>

  {#if view.city.rentUpgrades.length > 0}
    <h3 class="re-sub">RENT UPGRADES</h3>
    <ul class="upgrades">
      {#each view.city.rentUpgrades as u (u.id)}
        <li class="upgrade">
          <button onclick={() => buyUpgrade(u.id)} disabled={!u.canBuy}>
            <span class="u-name">{u.name}</span>
            <span class="u-desc">{u.desc}</span>
            <span class="u-cost">{u.cost}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="hint">
    Properties pay rent every second — no manager needed. Raise <strong>density</strong> to
    redevelop your blocks into taller buildings (the map changes too); rents climb as your
    city grows into a metropolis.
  </p>
</div>
