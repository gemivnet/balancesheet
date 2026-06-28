<script lang="ts">
  import { onMount } from 'svelte'
  import { view, setActive, openMenu } from '../store/game.svelte'
  import type { CityCell } from '../store/game.svelte'

  let viewport: HTMLDivElement

  // drag-to-pan with a small threshold so a drag isn't read as a tile click
  let panning = false
  let moved = false
  let startX = 0
  let startY = 0
  let startL = 0
  let startT = 0

  function down(e: PointerEvent) {
    panning = true
    moved = false
    startX = e.clientX
    startY = e.clientY
    startL = viewport.scrollLeft
    startT = viewport.scrollTop
  }
  function pan(e: PointerEvent) {
    if (!panning) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
    viewport.scrollLeft = startL - dx
    viewport.scrollTop = startT - dy
  }
  function up() {
    panning = false
  }

  function onTile(cell: CityCell) {
    if (moved) return // it was a drag, not a click
    if (cell.kind === 'business' && cell.businessId) {
      setActive(cell.businessId)
      openMenu('ops')
    } else if (cell.kind === 'civic' && cell.menu) {
      openMenu(cell.menu)
    } else if (cell.kind === 'rental' || cell.kind === 'forSale') {
      openMenu('realestate')
    }
  }

  function recenter() {
    if (!viewport) return
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2
  }

  onMount(recenter)
</script>

<div class="city-render">
  <div
    class="city-viewport"
    bind:this={viewport}
    role="group"
    aria-label="City map — scroll or drag to pan"
    onpointerdown={down}
    onpointermove={pan}
    onpointerup={up}
    onpointerleave={up}
  >
    <div class="city-grid" class:grid-lines={view.cityGrid} style="--cols:{view.city.cols}">
      {#each view.city.cells as cell (cell.key)}
        {#if cell.kind === 'empty'}
          <span class="tile empty">{cell.glyph}</span>
        {:else}
          <button class="tile {cell.kind}" title={cell.label} onclick={() => onTile(cell)}>
            {cell.glyph}
          </button>
        {/if}
      {/each}
    </div>
  </div>
  <button class="city-recenter mini" onclick={recenter}>recenter</button>
</div>
