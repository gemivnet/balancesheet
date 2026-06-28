<script lang="ts">
  import { onMount } from 'svelte'
  import { view, startGame, stopGame } from './store/game.svelte'
  import Hud from './ui/Hud.svelte'
  import CityMap from './ui/CityMap.svelte'
  import ClickButton from './ui/ClickButton.svelte'
  import BusinessList from './ui/BusinessList.svelte'
  import Shop from './ui/Shop.svelte'
  import RealEstate from './ui/RealEstate.svelte'
  import Industry from './ui/Industry.svelte'
  import OfflineModal from './ui/OfflineModal.svelte'
  import SaveBar from './ui/SaveBar.svelte'

  const logo = `+-------------------------------------------+
|         A S C I I   T Y C O O N            |
|   from a lemonade stand to a metropolis    |
+-------------------------------------------+`

  type Tab = 'work' | 'city' | 'industry'
  let tab = $state<Tab>('work')

  onMount(() => {
    startGame()
    return () => stopGame()
  })
</script>

<div class="app theme-{view.theme}">
  <header class="banner">
    <pre class="logo">{logo}</pre>
  </header>

  <div class="sticky-top">
    <Hud />
    <nav class="tabs">
      <button class:active={tab === 'work'} onclick={() => (tab = 'work')}>Work</button>
      <button class:active={tab === 'city'} onclick={() => (tab = 'city')}>City</button>
      <button class:active={tab === 'industry'} onclick={() => (tab = 'industry')}>Industry</button>
    </nav>
  </div>

  {#if tab === 'work'}
    <main class="columns">
      <section class="col">
        <ClickButton />
        <BusinessList />
      </section>
      <section class="col">
        <Shop />
      </section>
    </main>
  {:else if tab === 'city'}
    <CityMap />
    <RealEstate />
  {:else}
    <Industry />
  {/if}

  <SaveBar />

  {#if view.offline}
    <OfflineModal />
  {/if}
</div>
