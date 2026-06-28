<script lang="ts">
  import type { Snippet } from 'svelte'
  import { closeMenu } from '../store/game.svelte'

  let { title, children }: { title: string; children: Snippet } = $props()

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') closeMenu()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="popup-backdrop">
  <button class="popup-scrim" aria-label="Close menu" onclick={closeMenu}></button>
  <div class="popup" role="dialog" aria-label={title} aria-modal="true">
    <div class="popup-head">
      <h2>{title}</h2>
      <button class="popup-x" onclick={closeMenu} aria-label="close">×</button>
    </div>
    <div class="popup-body">
      {@render children()}
    </div>
  </div>
</div>
