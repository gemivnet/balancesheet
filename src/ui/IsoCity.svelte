<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { view, setActive, openMenu } from '../store/game.svelte'
  import { makeWorld, type World, type WorldTile, type Shop } from '../render/worldgen'

  let canvas: HTMLCanvasElement
  let wrap: HTMLDivElement
  let ctx: CanvasRenderingContext2D | null = null

  const TW = 52
  const TH = 26
  const E = 'rgba(0,0,0,0.2)'

  let panX = 0
  let panY = 0
  let zoom = 1
  let twz = TW
  let thz = TH
  let hoverKey = $state<string | null>(null)
  let tip = $state({ show: false, x: 0, y: 0, text: '' })

  let dragging = false
  let moved = false
  let startX = 0
  let startY = 0
  let panStartX = 0
  let panStartY = 0

  let world: World = makeWorld(0, [], 0, 0)
  let worldSig = ''
  let frontOrder: WorldTile[] = []

  type Pt = [number, number]

  function darken(hex: string, f: number): string {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
  }
  function diamond(px: number, py: number, lift = 0, f = 1): Pt[] {
    const hw = (twz / 2) * f
    const hh = (thz / 2) * f
    return [
      [px, py - hh - lift],
      [px + hw, py - lift],
      [px, py + hh - lift],
      [px - hw, py - lift],
    ]
  }
  function leftFace(px: number, py: number, h: number, f: number): Pt[] {
    const g = diamond(px, py, 0, f)
    const t = diamond(px, py, h, f)
    return [g[3], g[2], t[2], t[3]]
  }
  function rightFace(px: number, py: number, h: number, f: number): Pt[] {
    const g = diamond(px, py, 0, f)
    const t = diamond(px, py, h, f)
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
  function lerp(a: Pt, b: Pt, t: number): Pt {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  }
  function segLine(a: Pt, b: Pt, color: string) {
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.strokeStyle = color
    ctx.lineWidth = 1
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

  function rebuildWorld() {
    const shops: Shop[] = view.businesses
      .filter((b) => b.owned > 0)
      .map((b) => ({ id: b.id, glyph: b.glyph, name: b.name }))
    const sig = `${view.citySeed}|${shops.map((s) => s.id).join(',')}|${view.city.rentalCount}|${view.city.density}`
    if (sig === worldSig) return
    worldSig = sig
    world = makeWorld(view.citySeed, shops, view.city.rentalCount, view.city.density)
  }

  function autoCenter(W: number, Ht: number) {
    let minSX = Infinity
    let maxSX = -Infinity
    let minSY = Infinity
    let maxSY = -Infinity
    for (const t of world.tiles) {
      const sx = (t.x - t.y) * (twz / 2)
      const sy = (t.x + t.y) * (thz / 2)
      if (sx < minSX) minSX = sx
      if (sx > maxSX) maxSX = sx
      if (sy < minSY) minSY = sy
      if (sy > maxSY) maxSY = sy
    }
    return { ax: W / 2 - (minSX + maxSX) / 2, ay: Ht / 2 - (minSY + maxSY) / 2 }
  }
  function centerOf(W: number, Ht: number) {
    const a = autoCenter(W, Ht)
    return { cx: a.ax + panX, cy: a.ay + panY }
  }

  function groundFill(t: WorldTile): { fill: string; stroke: string } {
    const alt = (Math.abs(t.x) + Math.abs(t.y)) % 2 === 0
    if (t.type === 'water') return { fill: alt ? '#5aa9d6' : '#62afd9', stroke: '#4f9fcf' }
    if (t.type === 'bridge') return { fill: alt ? '#b8946a' : '#ad8a62', stroke: '#8f6f48' }
    if (t.type === 'road') return { fill: alt ? '#d8cba2' : '#cfc198', stroke: '#bdae84' }
    if (t.owner?.kind === 'forSale') return { fill: '#ffe27a', stroke: '#e0a82e' }
    if (t.building) return { fill: alt ? '#8fb86a' : '#97c074', stroke: '#79a857' }
    if (t.beach) return { fill: alt ? '#e6d9a8' : '#ddd09c', stroke: '#cbbd86' }
    if (t.type === 'park') return { fill: alt ? '#79b257' : '#82bb60', stroke: '#6aa34c' }
    if (t.type === 'farm') return { fill: alt ? '#cbaa6a' : '#c2a25f', stroke: '#a98a4e' }
    return { fill: alt ? '#86bd62' : '#8ec06c', stroke: '#76a958' }
  }
  function drawFurrows(px: number, py: number) {
    const d = diamond(px, py)
    for (const f of [0.3, 0.5, 0.7]) segLine(lerp(d[0], d[1], f), lerp(d[3], d[2], f), 'rgba(90,60,20,0.3)')
  }
  function drawTree(px: number, py: number) {
    if (!ctx) return
    const r = twz * 0.16
    ctx.fillStyle = '#6b4f2a'
    ctx.fillRect(px - 1.5, py - r * 0.3, 3, r * 0.7)
    ctx.beginPath()
    ctx.arc(px, py - r * 0.7, r, 0, Math.PI * 2)
    ctx.fillStyle = '#4f8f43'
    ctx.fill()
    ctx.strokeStyle = '#3c7a33'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  // bilinear point inside a wall face quad [ground-out, ground-in, top-in, top-out]
  function bilerp(q: Pt[], u: number, v: number): Pt {
    return lerp(lerp(q[0], q[1], u), lerp(q[3], q[2], u), v)
  }
  function panel(q: Pt[], u0: number, v0: number, u1: number, v1: number, fill: string) {
    poly([bilerp(q, u0, v0), bilerp(q, u1, v0), bilerp(q, u1, v1), bilerp(q, u0, v1)], fill, 'rgba(0,0,0,0.12)')
  }
  function foundation(q: Pt[]) {
    panel(q, 0, 0, 1, 0.12, '#9a958c')
  }
  function door(q: Pt[]) {
    panel(q, 0.42, 0, 0.58, 0.42, '#4a3b2e')
  }
  function windowGrid(q: Pt[], cols: number, floors: number, key: number, side: number) {
    const padU = 0.16
    const padV = 0.14
    const cw = (1 - padU * 2) / cols
    const fh = (1 - padV * 2) / floors
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < floors; r++) {
        const u0 = padU + c * cw + cw * 0.2
        const u1 = padU + (c + 1) * cw - cw * 0.2
        const v0 = padV + r * fh + fh * 0.2
        const v1 = padV + (r + 1) * fh - fh * 0.2
        const lit = (key + c * 101 + r * 53 + side * 131) % 5 === 0
        panel(q, u0, v0, u1, v1, lit ? '#ffd27a' : '#41546b')
      }
    }
  }
  function chimney(px: number, py: number, h: number, f: number) {
    if (!ctx) return
    ctx.fillStyle = '#5b5f66'
    ctx.fillRect(px + (twz * 0.18) * f, py - h - 9 * zoom - thz * 0.1, 3 * zoom, 9 * zoom)
  }
  function miniBox(px: number, py: number, baseLift: number, bh: number, f: number, color: string) {
    const g = diamond(px, py, baseLift, f)
    const t = diamond(px, py, baseLift + bh, f)
    poly([g[3], g[2], t[2], t[3]], darken(color, 0.8), E)
    poly([g[2], g[1], t[1], t[2]], darken(color, 0.62), E)
    poly(t, color, E)
  }
  function smoke(px: number, topY: number) {
    if (!ctx) return
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(px + i * 2 * zoom, topY - i * 5 * zoom, (2.4 + i) * zoom, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(150,150,150,${0.32 - i * 0.09})`
      ctx.fill()
    }
  }
  function drawFlag(px: number, topY: number) {
    if (!ctx) return
    const ph = 9 * zoom
    ctx.strokeStyle = '#3a3a3a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, topY)
    ctx.lineTo(px, topY - ph)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(px, topY - ph)
    ctx.lineTo(px + 7 * zoom, topY - ph + 3 * zoom)
    ctx.lineTo(px, topY - ph + 6 * zoom)
    ctx.closePath()
    ctx.fillStyle = '#ffce3a'
    ctx.fill()
  }
  function buildingTopY(t: WorldTile, py: number): number {
    const b = t.building!
    const h = b.h * zoom
    if (b.roofStyle === 'flat') return py - h
    const eaveF = Math.min(1, b.foot * 1.06)
    return py - h - (thz / 2) * eaveF - (thz * 0.34 + 2)
  }
  function drawBuilding(px: number, py: number, t: WorldTile) {
    if (!ctx || !t.building) return
    const b = t.building
    const h = b.h * zoom
    const f = b.foot
    const lf = leftFace(px, py, h, f)
    const rf = rightFace(px, py, h, f)
    poly(lf, darken(b.wall, 0.8), E)
    poly(rf, darken(b.wall, 0.62), E)
    if (zoom > 0.85) {
      foundation(lf)
      foundation(rf)
      const floors = Math.max(1, Math.min(7, Math.round(b.h / 4)))
      const cols = b.detail === 'tower' ? 3 : 2
      const key = ((t.x * 73856093) ^ (t.y * 19349663)) >>> 0
      windowGrid(lf, cols, floors, key, 0)
      windowGrid(rf, cols, floors, key, 1)
      if (b.detail === 'house' || b.detail === 'civic') door(rf)
    }
    if (b.roofStyle === 'flat') {
      poly(diamond(px, py, h, f), b.roof, E)
      if (b.detail === 'tower') {
        miniBox(px, py, h, h * 0.32, f * 0.66, b.wall)
        miniBox(px, py, h + h * 0.32, 5 * zoom, f * 0.3, '#717f93')
      } else if (b.chimney) {
        chimney(px, py, h, f)
        if (zoom > 0.8) smoke(px + twz * 0.18 * f, py - h - 9 * zoom)
      }
    } else {
      // gable roof: a ridge running front-to-back with two visible slopes
      const eaveF = Math.min(1, f * 1.06)
      const hh = (thz / 2) * eaveF
      const hw = (twz / 2) * eaveF
      const cyT = py - h
      const T: Pt = [px, cyT - hh]
      const R: Pt = [px + hw, cyT]
      const B: Pt = [px, cyT + hh]
      const L: Pt = [px - hw, cyT]
      const rh = thz * 0.34 + 2
      const rT: Pt = [px, cyT - hh - rh]
      const rB: Pt = [px, cyT + hh - rh]
      poly(diamond(px, py, h, f), darken(b.wall, 0.9), E)
      poly([T, L, B, rB, rT], darken(b.roof, 0.72), E)
      poly([T, R, B, rB, rT], b.roof, E)
      segLine(rT, rB, darken(b.roof, 0.55))
    }
    if (b.detail === 'shop' && zoom > 0.7) {
      poly([rf[0], rf[1], lerp(rf[1], rf[2], 0.22), lerp(rf[0], rf[3], 0.22)], '#c0392b', E)
    }
    if (b.owned && zoom > 0.7) drawFlag(px, buildingTopY(t, py))
  }

  function draw() {
    if (!ctx || !canvas || !wrap) return
    rebuildWorld()
    twz = TW * zoom
    thz = TH * zoom
    const dpr = window.devicePixelRatio || 1
    const W = wrap.clientWidth
    const Ht = wrap.clientHeight
    canvas.width = W * dpr
    canvas.height = Ht * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = Ht + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, Ht)

    const sorted = [...world.tiles].sort((a, b) => a.x + a.y - (b.x + b.y))
    frontOrder = sorted.slice().reverse()
    const { cx, cy } = centerOf(W, Ht)
    const sx = (t: WorldTile) => cx + (t.x - t.y) * (twz / 2)
    const sy = (t: WorldTile) => cy + (t.x + t.y) * (thz / 2)
    const vis = (px: number, py: number) => px > -twz && px < W + twz && py > -150 && py < Ht + thz

    for (const t of sorted) {
      const px = sx(t)
      const py = sy(t)
      if (!vis(px, py)) continue
      const g = groundFill(t)
      poly(diamond(px, py), g.fill, g.stroke)
      if (t.type === 'farm') drawFurrows(px, py)
      if (t.type === 'water' && (t.x * 3 + t.y) % 4 === 0)
        segLine([px - twz * 0.18, py], [px + twz * 0.18, py], 'rgba(255,255,255,0.22)')
    }
    for (const t of sorted) {
      const px = sx(t)
      const py = sy(t)
      if (!vis(px, py)) continue
      if (t.building) drawBuilding(px, py, t)
      else if (t.tree && zoom > 0.5) {
        if (t.type === 'park') {
          drawTree(px - twz * 0.16, py + thz * 0.08)
          drawTree(px + twz * 0.16, py + thz * 0.08)
          drawTree(px, py - thz * 0.04)
        } else drawTree(px, py)
      }
    }

    if (hoverKey) {
      const t = world.byKey.get(hoverKey)
      if (t) {
        const px = sx(t)
        const py = sy(t)
        const top = t.building ? diamond(px, py, t.building.h * zoom, t.building.foot) : diamond(px, py)
        poly(top, 'rgba(255,214,0,0.4)', '#ffce00', 2.5)
      }
    }

    if (zoom > 0.6) {
      ctx.font = 'bold 10px ui-monospace, Menlo, monospace'
      ctx.textAlign = 'center'
      for (const t of sorted) {
        if (!t.label) continue
        const px = sx(t)
        const py = sy(t)
        if (!vis(px, py)) continue
        const ly = (t.building ? buildingTopY(t, py) : py) - 11
        const w = ctx.measureText(t.label).width
        ctx.fillStyle = 'rgba(0,0,0,0.78)'
        ctx.fillRect(px - w / 2 - 4, ly - 9, w + 8, 14)
        ctx.fillStyle = '#fff'
        ctx.fillText(t.label, px, ly + 1)
      }
    }
  }

  function pick(clientX: number, clientY: number): WorldTile | null {
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const { cx, cy } = centerOf(wrap.clientWidth, wrap.clientHeight)
    for (const t of frontOrder) {
      const px = cx + (t.x - t.y) * (twz / 2)
      const py = cy + (t.x + t.y) * (thz / 2)
      if (t.building) {
        const h = t.building.h * zoom
        const f = t.building.foot
        if (
          pointInPoly(mx, my, diamond(px, py, h, f)) ||
          pointInPoly(mx, my, leftFace(px, py, h, f)) ||
          pointInPoly(mx, my, rightFace(px, py, h, f))
        )
          return t
      } else if (pointInPoly(mx, my, diamond(px, py))) {
        return t
      }
    }
    return null
  }

  function tipText(t: WorldTile): string | null {
    if (!t.owner) return null
    if (t.owner.kind === 'business') return `${t.owner.label} · click to manage`
    if (t.owner.kind === 'rental') return 'Rental property · real estate'
    if (t.owner.kind === 'forSale') return 'Lot for sale · buy property'
    if (t.owner.kind === 'civic') return `${t.owner.label} · click to open`
    return null
  }
  function onTile(t: WorldTile) {
    const o = t.owner
    if (!o) return
    if (o.kind === 'business' && o.businessId) {
      setActive(o.businessId)
      openMenu('ops')
    } else if (o.kind === 'civic' && o.menu) {
      openMenu(o.menu)
    } else if (o.kind === 'rental' || o.kind === 'forSale') {
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
    const t = pick(e.clientX, e.clientY)
    const text = t ? tipText(t) : null
    const rect = wrap.getBoundingClientRect()
    if (t && text) {
      tip = { show: true, x: e.clientX - rect.left, y: e.clientY - rect.top, text }
      canvas.style.cursor = 'pointer'
    } else {
      if (tip.show) tip = { ...tip, show: false }
      canvas.style.cursor = 'grab'
    }
    const hk = t && text ? `${t.x},${t.y}` : null
    if (hk !== hoverKey) {
      hoverKey = hk
      draw()
    }
  }
  function up(e: PointerEvent) {
    if (dragging && !moved) {
      const t = pick(e.clientX, e.clientY)
      if (t) onTile(t)
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
  function wheel(e: WheelEvent) {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const W = wrap.clientWidth
    const Ht = wrap.clientHeight
    twz = TW * zoom
    thz = TH * zoom
    const o0 = centerOf(W, Ht)
    const ux = mx - o0.cx
    const uy = my - o0.cy
    const fx = (ux / (twz / 2) + uy / (thz / 2)) / 2
    const fy = (uy / (thz / 2) - ux / (twz / 2)) / 2
    zoom = Math.min(2.4, Math.max(0.35, zoom * Math.exp(-e.deltaY * 0.0015)))
    twz = TW * zoom
    thz = TH * zoom
    const a = autoCenter(W, Ht)
    panX = mx - ((fx - fy) * twz) / 2 - a.ax
    panY = my - ((fx + fy) * thz) / 2 - a.ay
    draw()
  }
  function zoomBy(f: number) {
    zoom = Math.min(2.4, Math.max(0.35, zoom * f))
    draw()
  }
  function fitView() {
    if (!wrap) return
    rebuildWorld()
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const t of world.tiles) {
      const sx = (t.x - t.y) * (TW / 2)
      const sy = (t.x + t.y) * (TH / 2)
      if (sx < minX) minX = sx
      if (sx > maxX) maxX = sx
      if (sy < minY) minY = sy
      if (sy > maxY) maxY = sy
    }
    const wW = maxX - minX + TW
    const wH = maxY - minY + TH + 90
    zoom = Math.min(2.4, Math.max(0.35, Math.min(wrap.clientWidth / wW, wrap.clientHeight / wH) * 0.95))
    panX = 0
    panY = 0
    draw()
  }

  onMount(() => {
    ctx = canvas.getContext('2d')
    rebuildWorld()
    fitView()
    const ro = new ResizeObserver(() => draw())
    ro.observe(wrap)
    return () => ro.disconnect()
  })

  $effect(() => {
    view.citySeed
    view.city.rentalCount
    view.city.density
    view.city.shopsKey
    untrack(() => draw())
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
      onwheel={wheel}
    ></canvas>
    {#if tip.show}
      <div class="city-tip" style="left:{tip.x + 14}px; top:{tip.y + 14}px">{tip.text}</div>
    {/if}
  </div>
  <div class="city-controls">
    <button class="mini" onclick={() => zoomBy(1 / 1.25)} aria-label="zoom out">−</button>
    <button class="mini" onclick={fitView}>recenter</button>
    <button class="mini" onclick={() => zoomBy(1.25)} aria-label="zoom in">+</button>
  </div>
</div>
