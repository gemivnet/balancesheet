<script lang="ts">
  import { onMount } from 'svelte'
  import { view, uiState, startGame, stopGame } from './store/game.svelte'
  import GameHud from './ui/GameHud.svelte'
  import CityView from './ui/CityView.svelte'
  import FloatingWindow from './ui/FloatingWindow.svelte'
  import Operations from './ui/Operations.svelte'
  import Shop from './ui/Shop.svelte'
  import Contracts from './ui/Contracts.svelte'
  import RealEstate from './ui/RealEstate.svelte'
  import ResourcesBar from './ui/ResourcesBar.svelte'
  import Production from './ui/Production.svelte'
  import Finance from './ui/Finance.svelte'
  import Settings from './ui/Settings.svelte'
  import OfflineModal from './ui/OfflineModal.svelte'

  const TITLES: Record<string, string> = {
    ops: 'OPERATIONS',
    hq: 'HEADQUARTERS — UPGRADES',
    jobs: 'TOWN HALL — JOBS',
    realestate: 'REAL ESTATE',
    factory: 'FACTORY',
    bank: 'BANK',
    settings: 'SETTINGS',
  }

  onMount(() => {
    startGame()
    return () => stopGame()
  })
</script>

<div class="app game theme-{view.theme}">
  <div class="city-bg">
    <CityView />
  </div>

  <GameHud />

  {#each uiState.windows as id, i (id)}
    <FloatingWindow {id} title={TITLES[id] ?? id} z={i}>
      {#if id === 'ops'}
        <Operations />
      {:else if id === 'hq'}
        <Shop />
      {:else if id === 'jobs'}
        <Contracts />
      {:else if id === 'realestate'}
        <RealEstate />
      {:else if id === 'factory'}
        <ResourcesBar />
        <Production />
      {:else if id === 'bank'}
        {#if view.finance.unlocked}
          <Finance />
        {:else}
          <p class="locked-note">
            The bank opens once you've earned <strong>$2,000</strong> in total. Keep building!
          </p>
        {/if}
      {:else if id === 'settings'}
        <Settings />
      {/if}
    </FloatingWindow>
  {/each}

  {#if view.offline}
    <OfflineModal />
  {/if}
</div>
