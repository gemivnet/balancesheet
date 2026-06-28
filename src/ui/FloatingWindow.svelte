<script lang="ts">
  import type { Snippet } from 'svelte'
  import { closeMenu, focusMenu } from '../store/game.svelte'

  let { id, title, z, children }: { id: string; title: string; z: number; children: Snippet } =
    $props()

  // Stagger each newly-opened window so they don't stack exactly.
  const slot = spawn++ % 6
  let px = $state(70 + slot * 32)
  let py = $state(64 + slot * 32)

  let dragging = false
  let sx = 0
  let sy = 0
  let ox = 0
  let oy = 0

  function down(e: PointerEvent) {
    focusMenu(id)
    const t = e.target as HTMLElement
    if (!t.closest('.fw-head') || t.closest('.fw-x')) return // drag only from the title bar
    dragging = true
    sx = e.clientX
    sy = e.clientY
    ox = px
    oy = py
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (!dragging) return
    px = Math.max(0, ox + (e.clientX - sx))
    py = Math.max(0, oy + (e.clientY - sy))
  }
  function up() {
    dragging = false
  }
</script>

<div
  class="float-win"
  role="dialog"
  aria-label={title}
  tabindex="-1"
  style="left:{px}px; top:{py}px; z-index:{40 + z}"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointerleave={up}
>
  <div class="fw-head">
    <span class="fw-title">{title}</span>
    <button class="fw-x" onclick={() => closeMenu(id)} aria-label="close">×</button>
  </div>
  <div class="fw-body">
    {@render children()}
  </div>
</div>

<script module lang="ts">
  let spawn = 0
</script>
