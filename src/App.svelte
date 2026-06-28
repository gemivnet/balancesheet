<script lang="ts">
  import { onMount } from 'svelte'
  import { view, startGame, stopGame } from './store/game.svelte'
  import Hud from './ui/Hud.svelte'
  import ClickButton from './ui/ClickButton.svelte'
  import BusinessList from './ui/BusinessList.svelte'
  import Shop from './ui/Shop.svelte'
  import OfflineModal from './ui/OfflineModal.svelte'
  import SaveBar from './ui/SaveBar.svelte'

  const logo = `+-------------------------------------------+
|         A S C I I   T Y C O O N            |
|   from a lemonade stand to a metropolis    |
+-------------------------------------------+`

  onMount(() => {
    startGame()
    return () => stopGame()
  })
</script>

<div class="app theme-{view.theme}">
  <header class="banner">
    <pre class="logo">{logo}</pre>
  </header>

  <Hud />

  <main class="columns">
    <section class="col">
      <ClickButton />
      <BusinessList />
    </section>
    <section class="col">
      <Shop />
    </section>
  </main>

  <SaveBar />

  {#if view.offline}
    <OfflineModal />
  {/if}
</div>
