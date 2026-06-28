<script lang="ts">
  import { view } from '../store/game.svelte'
  import CityMap from './CityMap.svelte'
  import IsoCity from './IsoCity.svelte'

  // Once the isometric upgrade is bought, default to it but let the player switch back.
  let mode = $state<'iso' | 'ascii'>('iso')
</script>

<div class="city-view">
  {#if view.cityIso}
    <div class="city-toggle">
      <button class:active={mode === 'iso'} onclick={() => (mode = 'iso')}>Iso</button>
      <button class:active={mode === 'ascii'} onclick={() => (mode = 'ascii')}>ASCII</button>
    </div>
    {#if mode === 'iso'}
      <IsoCity />
    {:else}
      <CityMap />
    {/if}
  {:else}
    <CityMap />
  {/if}
</div>
