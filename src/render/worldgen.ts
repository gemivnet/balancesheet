// Procedural, seeded, organic town generator (cosmetic + placement).
//
// Produces a World of tiles: an irregular landmass with coast/rivers, a curvy road
// network, zoned districts (downtown / commercial / residential / industrial),
// parks + farm plots, ambient buildings filling the town, and the player's OWNED
// buildings (civic, shops, rentals, the for-sale lot) placed into sensible zones.
// Buildings carry walls + a pitched-or-flat roof so the town reads like a real place.
// Deterministic from the seed.

import { CIVIC_DEFS } from '../engine/city'

function hash(seed: number, x: number, y: number): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(seed: number, xf: number, yf: number): number {
  const x0 = Math.floor(xf)
  const y0 = Math.floor(yf)
  const tx = xf - x0
  const ty = yf - y0
  const sx = tx * tx * (3 - 2 * tx)
  const sy = ty * ty * (3 - 2 * ty)
  const v00 = hash(seed, x0, y0)
  const v10 = hash(seed, x0 + 1, y0)
  const v01 = hash(seed, x0, y0 + 1)
  const v11 = hash(seed, x0 + 1, y0 + 1)
  return (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy
}
function fbm(seed: number, x: number, y: number, freq: number): number {
  return vnoise(seed, x * freq, y * freq) * 0.65 + vnoise(seed ^ 0x1b, x * freq * 2.3, y * freq * 2.3) * 0.35
}

export type Zone = 'downtown' | 'commercial' | 'residential' | 'industrial'
export type RoofKind = 'gable' | 'flat'

const WALL_LIGHT = ['#e8e0d0', '#ded3bf', '#e3dbc8', '#d8cdb6', '#cfc2a8']
const WALL: Record<Zone, string[]> = {
  residential: WALL_LIGHT,
  commercial: WALL_LIGHT,
  downtown: ['#9fb6d4', '#a7bcd8', '#94aece', '#b0c2dc'],
  industrial: ['#b8bcc2', '#c2c6cc', '#aeb3b9'],
}
const ROOF: Record<Zone, string[]> = {
  residential: ['#b5462f', '#c25a3a', '#9c3f2c', '#a8503a', '#8a4634', '#7d4b3a'],
  commercial: ['#3f7cae', '#2f8f8a', '#c47a2e', '#4a6fa5', '#2f8f6a'],
  downtown: ['#586781', '#62748f', '#4f5d74'],
  industrial: ['#8d949b', '#9aa0a6', '#7c828a'],
}
const ZONE_H: Record<Zone, [number, number]> = {
  residential: [8, 13],
  commercial: [10, 15],
  downtown: [16, 28],
  industrial: [7, 10],
}
const ROOFKIND: Record<Zone, RoofKind> = {
  residential: 'gable',
  commercial: 'gable',
  downtown: 'flat',
  industrial: 'flat',
}
const BIZ_ROOF: Record<string, string> = { L: '#e0b020', C: '#9c6b4a', R: '#5f7f9c' }
const CIVIC_ROOF: Record<string, string> = {
  townhall: '#5c7cfa',
  realtor: '#15aabf',
  hq: '#9c36b5',
  factory: '#f08c2e',
  bank: '#2fa84f',
}

function clamp255(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)))
}
function toHex(r: number, g: number, b: number) {
  const h = (x: number) => clamp255(x).toString(16).padStart(2, '0')
  return '#' + h(r) + h(g) + h(b)
}
function desat(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const l = 0.3 * r + 0.59 * g + 0.11 * b
  return toHex(r + (l - r) * amt, g + (l - g) * amt, b + (l - b) * amt)
}

export interface Owner {
  kind: 'business' | 'rental' | 'civic' | 'forSale'
  businessId?: string
  civic?: string
  menu?: string
  label: string
}
export interface WorldBuilding {
  wall: string
  roof: string
  roofKind: RoofKind
  h: number
  windows: boolean
  owned?: boolean
}
export interface WorldTile {
  x: number
  y: number
  type: 'water' | 'road' | 'park' | 'farm' | 'lot'
  building?: WorldBuilding
  tree?: boolean
  owner?: Owner
  label?: string
}
export interface World {
  tiles: WorldTile[]
  byKey: Map<string, WorldTile>
  radius: number
}
export interface Shop {
  id: string
  glyph: string
  name: string
}

export function makeWorld(seed: number, shops: Shop[], rentals: number, density: number): World {
  const R = Math.round(Math.min(22, Math.max(8, 7 + Math.sqrt(rentals + shops.length + 5) * 1.7)))

  const elevation = (x: number, y: number) => fbm(seed, x, y, 0.085) - (Math.hypot(x, y) / R) ** 2 * 1.05
  const isLand = (x: number, y: number) => elevation(x, y) > 0
  const riverBand = (x: number, y: number) => Math.abs(fbm(seed ^ 0x7, x, y, 0.05) - 0.5) < 0.028
  const band = (v: number) => Math.abs(((v * 5) % 1) - 0.5) < 0.085
  const roadAt = (x: number, y: number) => band(fbm(seed ^ 0x3, x, y, 0.115)) || band(fbm(seed ^ 0x9, x, y, 0.115))
  const parkAt = (x: number, y: number) => fbm(seed ^ 0xb, x, y, 0.14) > 0.84
  const zoneAt = (x: number, y: number): Zone => {
    if (Math.hypot(x, y) / R < 0.22) return 'downtown'
    const z = fbm(seed ^ 0x5, x, y, 0.045)
    return z < 0.34 ? 'industrial' : z < 0.67 ? 'residential' : 'commercial'
  }

  function makeBuilding(x: number, y: number, zone: Zone, owned: boolean, hOverride?: number): WorldBuilding {
    const wall = WALL[zone][(hash(seed ^ 0x21, x, y) * WALL[zone].length) | 0]
    const roof = ROOF[zone][(hash(seed ^ 0x23, x, y) * ROOF[zone].length) | 0]
    const [h0, h1] = ZONE_H[zone]
    const h = hOverride ?? h0 + ((hash(seed ^ 0x22, x, y) * (h1 - h0)) | 0)
    const m = owned ? 0 : 0.24
    return { wall: desat(wall, m), roof: desat(roof, m), roofKind: ROOFKIND[zone], h, windows: true, owned }
  }

  const tiles: WorldTile[] = []
  const byKey = new Map<string, WorldTile>()
  const lots: { x: number; y: number; zone: Zone; d: number }[] = []
  const add = (t: WorldTile) => {
    tiles.push(t)
    byKey.set(`${t.x},${t.y}`, t)
  }

  for (let x = -R - 1; x <= R + 1; x++) {
    for (let y = -R - 1; y <= R + 1; y++) {
      if (!isLand(x, y)) {
        let coast = false
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          if (isLand(x + dx, y + dy)) {
            coast = true
            break
          }
        }
        if (coast) add({ x, y, type: 'water' })
        continue
      }
      if (riverBand(x, y)) {
        add({ x, y, type: 'water' })
      } else if (roadAt(x, y)) {
        add({ x, y, type: 'road' })
      } else if (parkAt(x, y)) {
        if (hash(seed ^ 0x17, x, y) > 0.5) add({ x, y, type: 'farm' })
        else add({ x, y, type: 'park', tree: hash(seed ^ 0x13, x, y) > 0.3 })
      } else {
        const zone = zoneAt(x, y)
        add({ x, y, type: 'lot' })
        lots.push({ x, y, zone, d: Math.hypot(x, y) })
      }
    }
  }

  lots.sort((a, b) => a.d - b.d)
  const taken = new Set<string>()
  const at = (x: number, y: number) => byKey.get(`${x},${y}`)!

  // civic: closest-to-centre lots, spread apart -> landmarks
  const spots: { x: number; y: number }[] = []
  for (const lot of lots) {
    if (spots.length >= CIVIC_DEFS.length) break
    if (spots.every((s) => Math.abs(s.x - lot.x) + Math.abs(s.y - lot.y) >= 4)) {
      spots.push({ x: lot.x, y: lot.y })
      taken.add(`${lot.x},${lot.y}`)
    }
  }
  spots.forEach((s, i) => {
    const def = CIVIC_DEFS[i]
    const t = at(s.x, s.y)
    t.owner = { kind: 'civic', civic: def.id, menu: def.menu, label: def.name }
    t.building = { wall: '#e8e4da', roof: CIVIC_ROOF[def.id] ?? '#888', roofKind: 'flat', h: 20, windows: true, owned: true }
    t.label = def.name
  })

  // shops: nearest non-industrial lots
  const bizLots = lots.filter((l) => !taken.has(`${l.x},${l.y}`) && l.zone !== 'industrial')
  shops.forEach((shop, i) => {
    const lot = bizLots[i]
    if (!lot) return
    taken.add(`${lot.x},${lot.y}`)
    const t = at(lot.x, lot.y)
    t.owner = { kind: 'business', businessId: shop.id, label: shop.name }
    t.building = { wall: '#efe7d6', roof: BIZ_ROOF[shop.glyph] ?? '#ca8', roofKind: 'gable', h: 13, windows: true, owned: true }
    t.label = shop.name
  })

  // rentals: residential lots nearest first; the next free one is for sale
  const resiLots = lots.filter((l) => !taken.has(`${l.x},${l.y}`) && l.zone === 'residential')
  let placed = 0
  for (const lot of resiLots) {
    const t = at(lot.x, lot.y)
    if (placed < rentals) {
      t.owner = { kind: 'rental', label: 'Rental property' }
      t.building = makeBuilding(lot.x, lot.y, 'residential', true, 8 + density * 1.5 + ((hash(seed, lot.x, lot.y) * 5) | 0))
      taken.add(`${lot.x},${lot.y}`)
      placed++
    } else {
      t.owner = { kind: 'forSale', label: 'Lot for sale' }
      taken.add(`${lot.x},${lot.y}`)
      break
    }
  }

  // ambient buildings fill the rest of the town (with some open/green lots)
  for (const lot of lots) {
    if (taken.has(`${lot.x},${lot.y}`)) continue
    const t = at(lot.x, lot.y)
    const builtChance = lot.zone === 'industrial' ? 0.72 : lot.zone === 'downtown' ? 0.95 : 0.86
    if (hash(seed ^ 0x31, lot.x, lot.y) > builtChance) {
      t.tree = hash(seed ^ 0x41, lot.x, lot.y) > 0.45
      continue
    }
    t.building = makeBuilding(lot.x, lot.y, lot.zone, false)
  }

  return { tiles, byKey, radius: R }
}
