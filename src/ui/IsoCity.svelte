<script lang="ts">
  import { onMount } from 'svelte'
  import { view, setActive, openMenu } from '../store/game.svelte'
  import type { CityCell } from '../store/game.svelte'

  let canvas: HTMLCanvasElement
  let wrap: HTMLDivElement
  let ctx: CanvasRenderingContext2D | null = null

  const TW = 52 // iso tile width
  const TH = 26 // iso tile height (2:1)
  const DENS = 'nAHM#@' // rental density glyphs -> taller buildings
  const CIVIC_COLOR: Record<string, string> = {
    townhall: '#5c7cfa',
    realtor: '#15aabf',
    hq: '#9c36b5',
    factory: '#868e96',
    bank: '#37b24d',
  }

  let panX = 0
  let panY = 0
  let hoverKey = $state<string | null>(null)
  let tip = $state({ show: false, x: 0, y: 0, text: '' })

  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0
  let panStartX = 0
  let panStartY = 0

  let frontOrder: CityCell[] = [] // cells front-to-back, for picking (cached from draw)

  function darken(hex: string, f: number): string {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
  }
  function box(base: string, h: number) {
    return { top: base, left: darken(base, 0.78), right: darken(base, 0.6), h }
  }
  function building(cell: CityCell) {
    if (cell.kind === 'business') {
      const palette: Record<string, string> = { L: '#f6c945', C: '#9c6b4a', R: '#6d8aa6' }
      return box(palette[cell.glyph] ?? '#5bb6a6', 34)
    }
    if (cell.kind === 'rental') return box('#e0796b', 22 + Math.max(0, DENS.indexOf(cell.glyph)) * 14)
    if (cell.kind === 'civic') return box(CIVIC_COLOR[cell.civic ?? ''] ?? '#888', 48)
    return null
  }

  function centerOf(W: number, Ht: number) {
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
    return { cx: W / 2 - (minSX + maxSX) / 2 + panX, cy: Ht / 2 - (minSY + maxSY) / 2 + panY }
  }

  type Pt = [number, number]
  function diamond(px: number, py: number, lift = 0): Pt[] {
    return [
      [px, py - TH / 2 - lift],
      [px + TW / 2, py - lift],
      [px, py + TH / 2 - lift],
      [px - TW / 2, py - lift],
    ]
  }
  function leftFace(px: number, py: number, h: number): Pt[] {
    const g = diamond(px, py)
    const t = diamond(px, py, h)
    return [g[3], g[2], t[2], t[3]]
  }
  function rightFace(px: number, py: number, h: number): Pt[] {
    const g = diamond(px, py)
    const t = diamond(px, py, h)
    return [g[2], g[1], t[1], t[2]]
  }
  function poly(pts: Pt[], fill: string | null, stroke: string, w = 1) {
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    ctx.strokeStyle = stroke
    ctx.lineWidth = w
    ctx.stroke()
  }
  function pointInPoly(x: number, y: number, p: Pt[]): boolean {
    let inside = false
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const xi = p[i][0]
      const yi = p[i][1]
      const xj = p[j][0]
      const yj = p[j][1]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }

  function drawGround(px: number, py: number, c: CityCell) {
    let fill = '#8ec06c'
    let stroke = '#74a857'
    if (c.kind === 'business' || c.kind === 'rental' || c.kind === 'civic') {
      fill = '#cbc8bf'
      stroke = '#b1aea4'
    } else if (c.kind === 'forSale') {
      fill = '#ffe27a'
      stroke = '#e0a82e'
    }
    poly(diamond(px, py), fill, stroke)
  }
  function drawBox(px: number, py: number, b: { top: string; left: string; right: string; h: number }) {
    poly(leftFace(px, py, b.h), b.left, 'rgba(0,0,0,0.18)')
    poly(rightFace(px, py, b.h), b.right, 'rgba(0,0,0,0.18)')
    poly(diamond(px, py, b.h), b.top, 'rgba(0,0,0,0.14)')
  }

  function draw() {
    if (!ctx || !canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const W = wrap.clientWidth
    const Ht = wrap.clientHeight
    canvas.width = W * dpr
    canvas.height = Ht * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = Ht + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, Ht)

    const cells = view.city.cells
    if (cells.length === 0) return
    const sorted = [...cells].sort((a, b) => a.x + a.y - (b.x + b.y))
    frontOrder = sorted.slice().reverse()
    const { cx, cy } = centerOf(W, Ht)
    const sx = (c: CityCell) => cx + (c.x - c.y) * (TW / 2)
    const sy = (c: CityCell) => cy + (c.x + c.y) * (TH / 2)

    for (const c of sorted) drawGround(sx(c), sy(c), c)
    for (const c of sorted) {
      const b = building(c)
      if (b) drawBox(sx(c), sy(c), b)
    }

    // hover highlight
    if (hoverKey) {
      const c = cells.find((x) => x.key === hoverKey)
      if (c) {
        const b = building(c)
        const top = b ? diamond(sx(c), sy(c), b.h) : diamond(sx(c), sy(c))
        poly(top, 'rgba(255,214,0,0.4)', '#ffce00', 2.5)
      }
    }

    // civic labels float above their buildings
    ctx.font = 'bold 10px ui-monospace, Menlo, monospace'
    ctx.textAlign = 'center'
    for (const c of sorted) {
      if (c.kind !== 'civic') continue
      const lx = sx(c)
      const ly = sy(c) - 48 - 9
      const w = ctx.measureText(c.label).width
      ctx.fillStyle = 'rgba(0,0,0,0.78)'
      ctx.fillRect(lx - w / 2 - 4, ly - 9, w + 8, 14)
      ctx.fillStyle = '#fff'
      ctx.fillText(c.label, lx, ly + 1)
    }
  }

  function pick(clientX: number, clientY: number): CityCell | null {
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const { cx, cy } = centerOf(wrap.clientWidth, wrap.clientHeight)
    for (const c of frontOrder) {
      const px = cx + (c.x - c.y) * (TW / 2)
      const py = cy + (c.x + c.y) * (TH / 2)
      const b = building(c)
      if (b) {
        if (
          pointInPoly(mx, my, diamond(px, py, b.h)) ||
          pointInPoly(mx, my, leftFace(px, py, b.h)) ||
          pointInPoly(mx, my, rightFace(px, py, b.h))
        )
          return c
      } else if (pointInPoly(mx, my, diamond(px, py))) {
        return c
      }
    }
    return null
  }

  function tipText(c: CityCell): string {
    if (c.kind === 'business') return `${c.label} · click to manage`
    if (c.kind === 'rental') return 'Rental property · real estate'
    if (c.kind === 'forSale') return 'Lot for sale · buy property'
    if (c.kind === 'civic') return `${c.label} · click to open`
    return ''
  }

  function onTile(c: CityCell) {
    if (c.kind === 'business' && c.businessId) {
      setActive(c.businessId)
      openMenu('ops')
    } else if (c.kind === 'civic' && c.menu) {
      openMenu(c.menu)
    } else if (c.kind === 'rental' || c.kind === 'forSale') {
      openMenu('realestate')
    }
  }

  function down(e: PointerEvent) {
    dragging = true
    moved = false
    startX = e.clientX
    startY = e.clientY
    panStartX = panX
    panStartY = panY
    canvas.style.cursor = 'grabbing'
  }
  function move(e: PointerEvent) {
    if (dragging) {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
      panX = panStartX + dx
      panY = panStartY + dy
      draw()
      return
    }
    const c = pick(e.clientX, e.clientY)
    const key = c && c.kind !== 'empty' ? c.key : null
    const rect = wrap.getBoundingClientRect()
    if (c && key) {
      tip = { show: true, x: e.clientX - rect.left, y: e.clientY - rect.top, text: tipText(c) }
      canvas.style.cursor = 'pointer'
    } else {
      if (tip.show) tip = { ...tip, show: false }
      canvas.style.cursor = 'grab'
    }
    if (key !== hoverKey) {
      hoverKey = key
      draw()
    }
  }
  function up(e: PointerEvent) {
    if (dragging && !moved) {
      const c = pick(e.clientX, e.clientY)
      if (c && c.kind !== 'empty') onTile(c)
    }
    dragging = false
    canvas.style.cursor = hoverKey ? 'pointer' : 'grab'
  }
  function leave() {
    dragging = false
    if (hoverKey) {
      hoverKey = null
      draw()
    }
    tip = { ...tip, show: false }
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

  $effect(() => {
    view.city.cells
    draw()
  })
</script>

<div class="city-render">
  <div class="iso-wrap" bind:this={wrap}>
    <canvas
      bind:this={canvas}
      class="iso-canvas"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointerleave={leave}
    ></canvas>
    {#if tip.show}
      <div class="city-tip" style="left:{tip.x + 14}px; top:{tip.y + 14}px">{tip.text}</div>
    {/if}
  </div>
  <button class="city-recenter mini" onclick={recenter}>recenter</button>
</div>
