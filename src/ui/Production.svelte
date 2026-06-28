<script lang="ts">
  import { view, buildFacility, buildFacilityMax, buyUpgrade } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>FACTORIES</h2>
  <ul class="facilities">
    {#each view.industry.facilities as f (f.id)}
      <li class="facility" class:locked={!f.unlocked}>
        <div class="fac-head">
          <span class="glyph">[{f.glyph}]</span>
          <span class="name">{f.name}</span>
          <span class="owned">x{f.ownedText}</span>
        </div>
        <div class="fac-recipe">{f.recipe}</div>
        {#if f.unlocked}
          <div class="fac-actions">
            <button onclick={() => buildFacility(f.id)} disabled={!f.canBuy}>
              build 1 · {f.costText}
            </button>
            <button onclick={() => buildFacilityMax(f.id)} disabled={!f.canBuyMax}>
              build {f.maxCount} · {f.costMaxText}
            </button>
          </div>
        {:else}
          <div class="fac-locked">{f.unlockText}</div>
        {/if}
      </li>
    {/each}
  </ul>

  {#if view.industry.machines.length > 0}
    <h2>MACHINES</h2>
    <ul class="upgrades">
      {#each view.industry.machines as u (u.id)}
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
</div>
