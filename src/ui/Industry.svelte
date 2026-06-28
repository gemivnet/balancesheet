<script lang="ts">
  import ResourcesBar from './ResourcesBar.svelte'
  import Production from './Production.svelte'
  import Contracts from './Contracts.svelte'
</script>

<ResourcesBar />

<main class="columns">
  <section class="col">
    <Production />
  </section>
  <section class="col">
    <Contracts />
  </section>
</main>
