<script lang="ts">
  import { view, doClick } from '../store/game.svelte'

  interface Floaty {
    id: number
    text: string
    x: number
    y: number
  }

  const workArt = `[=============================]
[=========  W O R K  =========]
[=============================]`

  let floaties = $state<Floaty[]>([])
  let seq = 0

  function handle(e: MouseEvent) {
    const text = doClick()
    const id = seq++
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    floaties.push({ id, text: '+' + text, x: e.clientX - rect.left, y: e.clientY - rect.top })
    setTimeout(() => {
      floaties = floaties.filter((f) => f.id !== id)
    }, 800)
  }

  const active = $derived(view.businesses.find((b) => b.active))
</script>

<div class="clicker">
  <div class="active-label">WORKING: {view.activeName || '—'}</div>
  <button class="work" onclick={handle}>
    <pre>{workArt}</pre>
    <div class="progress">
      <div class="bar" style="width:{active ? (active.progress * 100).toFixed(0) : 0}%"></div>
    </div>
    {#each floaties as f (f.id)}
      <span class="floaty" style="left:{f.x}px; top:{f.y}px">{f.text}</span>
    {/each}
  </button>
  <p class="hint">Click WORK to earn. Buy units &amp; hire managers to earn while idle.</p>
</div>
