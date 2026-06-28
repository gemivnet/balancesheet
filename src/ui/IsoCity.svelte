<script lang="ts">
  import { onMount } from 'svelte'
  import { view, buyRental, setActive } from '../store/game.svelte'
  import type { CityCell } from '../store/game.svelte'

  let canvas: HTMLCanvasElement
  let wrap: HTMLDivElement
  let ctx: CanvasRenderingContext2D | null = null

  const TW = 52 // iso tile width
  const TH = 26 // iso tile height (2:1)
  const H = 380 // canvas height
  const DENS = 'nAHM#@' // rental density glyphs -> taller buildings

  let panX = 0
  let panY = 0
  let selected = $state('Isometric view — drag to pan, click a building.')

  // drag-to-pan (with a threshold so a drag isn't read as a click)
  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0
  let panStartX = 0
  let panStartY = 0

  function darken(hex: string, f: number): string {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
  }

  function building(cell: CityCell): { top: string; left: string; right: string; h: number } | null {
    if (cell.kind === 'business') {
      const palette: Record<string, string> = { L: '#f6c945', C: '#9c6b4a', R: '#6d8aa6' }
      const base = palette[cell.glyph] ?? '#5bb6a6'
      return { top: base, left: darken(base, 0.78), right: darken(base, 0.6), h: 34 }
    }
    if (cell.kind === 'rental') {
      const lvl = Math.max(0, DENS.indexOf(cell.glyph))
      const base = '#e0796b'
      return { top: base, left: darken(base, 0.78), right: darken(base, 0.6), h: 22 + lvl * 14 }
    }
    return null
  }

  function centerOf(W: number) {
    const cells = view.city.cells
    let minSX = Infinity
    let maxSX = -Infinity
    let minSY = Infinity
    let maxSY = -Infinity
    for (const c of cells) {
      const sx = (c.x - c.y) * (TW / 2)
      const sy = (c.x + c.y) * (TH / 2)
      if (sx < minSX) minSX = sx
      if (sx > maxSX) maxSX = sx
      if (sy < minSY) minSY = sy
      if (sy > maxSY) maxSY = sy
    }
    return {
      cx: W / 2 - (minSX + maxSX) / 2 + panX,
      cy: H / 2 - (minSY + maxSY) / 2 + panY - 30,
    }
  }

  function diamond(px: number, py: number, lift = 0): [number, number][] {
    return [
      [px, py - TH / 2 - lift],
      [px + TW / 2, py - lift],
      [px, py + TH / 2 - lift],
      [px - TW / 2, py - lift],
    ]
  }

  function poly(pts: [number, number][], fill: string, stroke: string) {
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function drawGround(px: number, py: number, c: CityCell) {
    let fill = '#8ec06c'
    let stroke = '#74a857'
    if (c.kind === 'business' || c.kind === 'rental') {
      fill = '#cbc8bf'
      stroke = '#b1aea4'
    } else if (c.kind === 'forSale') {
      fill = '#ffe27a'
      stroke = '#e0a82e'
    }
    poly(diamond(px, py), fill, stroke)
  }

  function drawBuilding(px: number, py: number, b: { top: string; left: string; right: string; h: number }) {
    const g = diamond(px, py)
    const t = diamond(px, py, b.h)
    poly([g[3], g[2], t[2], t[3]], b.left, 'rgba(0,0,0,0.18)')
    poly([g[2], g[1], t[1], t[2]], b.right, 'rgba(0,0,0,0.18)')
    poly(t, b.top, 'rgba(0,0,0,0.14)')
  }

  function draw() {
    if (!ctx || !canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const W = wrap.clientWidth
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const cells = view.city.cells
    if (cells.length === 0) return
    const sorted = [...cells].sort((a, b) => a.x + a.y - (b.x + b.y))
    const { cx, cy } = centerOf(W)

    // ground first, then buildings (so near ground never covers a far tower)
    for (const c of sorted) {
      drawGround(cx + (c.x - c.y) * (TW / 2), cy + (c.x + c.y) * (TH / 2), c)
    }
    for (const c of sorted) {
      const b = building(c)
      if (b) drawBuilding(cx + (c.x - c.y) * (TW / 2), cy + (c.x + c.y) * (TH / 2), b)
    }
  }

  function pick(clientX: number, clientY: number): CityCell | null {
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const { cx, cy } = centerOf(wrap.clientWidth)
    const u = clientX - rect.left - cx
    const v = clientY - rect.top - cy
    const tx = Math.round((u / (TW / 2) + v / (TH / 2)) / 2)
    const ty = Math.round((v / (TH / 2) - u / (TW / 2)) / 2)
    return view.city.cells.find((c) => c.x === tx && c.y === ty) ?? null
  }

  function onTile(c: CityCell) {
    if (c.kind === 'business' && c.businessId) {
      setActive(c.businessId)
      selected = `Now working here: ${c.label}`
    } else if (c.kind === 'forSale') {
      if (view.city.canBuyRental) {
        buyRental()
        selected = 'Bought a property — rent now rolls in.'
      } else {
        selected = `You need ${view.city.rentalCostText} to buy this lot.`
      }
    } else if (c.kind === 'rental') {
      selected = `${c.label} — collecting rent.`
    }
  }

  function down(e: PointerEvent) {
    dragging = true
    moved = false
    startX = e.clientX
    startY = e.clientY
    panStartX = panX
    panStartY = panY
  }
  function move(e: PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
    panX = panStartX + dx
    panY = panStartY + dy
    draw()
  }
  function up(e: PointerEvent) {
    if (dragging && !moved) {
      const c = pick(e.clientX, e.clientY)
      if (c) onTile(c)
    }
    dragging = false
  }

  function recenter() {
    panX = 0
    panY = 0
    draw()
  }

  onMount(() => {
    ctx = canvas.getContext('2d')
    draw()
    const ro = new ResizeObserver(() => draw())
    ro.observe(wrap)
    return () => ro.disconnect()
  })

  // Redraw when the city structure changes (new buildings, density, etc.).
  $effect(() => {
    view.city.cells
    draw()
  })
</script>

<div class="panel city">
  <div class="city-head">
    <h2>YOUR CITY · {view.city.tierName}</h2>
    <span class="city-meta">{view.city.buildingCount} buildings · rent {view.city.rentText}</span>
    <button class="mini" onclick={recenter}>recenter</button>
  </div>
  <div class="iso-wrap" bind:this={wrap}>
    <canvas
      bind:this={canvas}
      class="iso-canvas"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointerleave={up}
    ></canvas>
  </div>
  <div class="city-foot">
    <span class="legend">yellow = shops · red = rentals (taller = denser) · gold = lot for sale</span>
    <span class="selected">{selected}</span>
  </div>
</div>
