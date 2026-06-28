<script lang="ts">
  import { view } from '../store/game.svelte'
  import Accounts from './Accounts.svelte'
  import Bonds from './Bonds.svelte'
  import Markets from './Markets.svelte'
</script>

<div class="panel fin-header">
  <h2>FINANCE</h2>
  <div class="net-worth">
    <span class="re-label">NET WORTH</span>
    <span class="nw-val">{view.finance.netWorthText}</span>
  </div>
</div>

<main class="columns">
  <section class="col">
    <Accounts />
    <Bonds />
  </section>
  <section class="col">
    <Markets />
  </section>
</main>
