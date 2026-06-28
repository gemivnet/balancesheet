<script lang="ts">
  import { view, dismissOffline } from '../store/game.svelte'

  const art = `+------------------------------+
|    WHILE YOU WERE AWAY       |
+------------------------------+`

  function fmtDuration(total: number): string {
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = Math.floor(total % 60)
    return [h ? `${h}h` : '', m ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ')
  }

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) dismissOffline()
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') dismissOffline()
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if view.offline}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={onBackdrop}>
    <div class="modal" role="dialog" aria-modal="true" aria-label="While you were away" tabindex="-1">
      <pre class="modal-art">{art}</pre>
      <p>Your managers kept working for <strong>{fmtDuration(view.offline.seconds)}</strong>.</p>
      <p class="earned">+{view.offline.earnedText}</p>
      <button onclick={dismissOffline}>collect</button>
    </div>
  </div>
{/if}
