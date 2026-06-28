<script lang="ts">
  import { onMount } from 'svelte'
  import { view, uiState, startGame, stopGame } from './store/game.svelte'
  import GameHud from './ui/GameHud.svelte'
  import CityView from './ui/CityView.svelte'
  import Popup from './ui/Popup.svelte'
  import Operations from './ui/Operations.svelte'
  import Shop from './ui/Shop.svelte'
  import Contracts from './ui/Contracts.svelte'
  import RealEstate from './ui/RealEstate.svelte'
  import ResourcesBar from './ui/ResourcesBar.svelte'
  import Production from './ui/Production.svelte'
  import Finance from './ui/Finance.svelte'
  import Settings from './ui/Settings.svelte'
  import OfflineModal from './ui/OfflineModal.svelte'

  onMount(() => {
    startGame()
    return () => stopGame()
  })
</script>

<div class="app game theme-{view.theme}">
  <GameHud />

  <main class="stage">
    <CityView />
  </main>

  {#if uiState.menu === 'ops'}
    <Popup title="OPERATIONS"><Operations /></Popup>
  {:else if uiState.menu === 'hq'}
    <Popup title="HEADQUARTERS — UPGRADES"><Shop /></Popup>
  {:else if uiState.menu === 'jobs'}
    <Popup title="TOWN HALL — JOBS"><Contracts /></Popup>
  {:else if uiState.menu === 'realestate'}
    <Popup title="REAL ESTATE"><RealEstate /></Popup>
  {:else if uiState.menu === 'factory'}
    <Popup title="FACTORY">
      <ResourcesBar />
      <Production />
    </Popup>
  {:else if uiState.menu === 'bank'}
    <Popup title="BANK">
      {#if view.finance.unlocked}
        <Finance />
      {:else}
        <p class="locked-note">
          The bank opens once you've earned <strong>$2,000</strong> in total. Keep building!
        </p>
      {/if}
    </Popup>
  {:else if uiState.menu === 'settings'}
    <Popup title="SETTINGS"><Settings /></Popup>
  {/if}

  {#if view.offline}
    <OfflineModal />
  {/if}
</div>
