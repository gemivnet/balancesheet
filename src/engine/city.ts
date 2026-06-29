// City layout + real-estate model (pure logic, no DOM).
//
// The city is a *visualisation of what you own*: your started businesses anchor
// the centre, rental properties spiral outward, and the next purchasable lot sits
// at the growing edge. Buying property grows the city through tiers
// (Hamlet → Metropolis), which in turn raises rents — locations appreciate as the
// place develops.

import Decimal from 'break_infinity.js'
import { D } from './num'

export interface RealEstateConfig {
  baseLotCost: Decimal
  costGrowth: number
  baseRent: Decimal // per second, per property, at tier 1
}

export const REAL_ESTATE: RealEstateConfig = {
  baseLotCost: D(500),
  costGrowth: 1.15,
  baseRent: D(8),
}

export interface CityTier {
  index: number
  name: string
  min: number // minimum total buildings to reach this tier
  rentMult: number // rent multiplier at this tier
  rentalGlyph: string // how a rental property is drawn at this tier
}

export const CITY_TIERS: CityTier[] = [
  { index: 0, name: 'Hamlet', min: 0, rentMult: 1, rentalGlyph: 'n' },
  { index: 1, name: 'Village', min: 3, rentMult: 1.25, rentalGlyph: 'A' },
  { index: 2, name: 'Town', min: 8, rentMult: 1.6, rentalGlyph: 'H' },
  { index: 3, name: 'City', min: 16, rentMult: 2, rentalGlyph: 'M' },
  { index: 4, name: 'Metropolis', min: 31, rentMult: 2.5, rentalGlyph: '#' },
]

export function cityTier(totalBuildings: number): CityTier {
  let tier = CITY_TIERS[0]
  for (const t of CITY_TIERS) if (totalBuildings >= t.min) tier = t
  return tier
}

// --- housing density (SimCity-style): upgrade your blocks to denser buildings ---

export const DENSITY_BASE_COST = D(2000)
export const DENSITY_GROWTH = 3.2
export const DENSITY_RENT_FACTOR = 1.6
const DENSITY_GLYPHS = ['n', 'A', 'H', 'M', '#', '@']
const DENSITY_NAMES = ['Low-density', 'Townhouses', 'Apartments', 'Towers', 'High-rises', 'Arcology']
export const MAX_DENSITY = DENSITY_GLYPHS.length - 1

export function densityGlyph(level: number): string {
  return DENSITY_GLYPHS[Math.min(Math.max(level, 0), MAX_DENSITY)]
}

export function densityName(level: number): string {
  return DENSITY_NAMES[Math.min(Math.max(level, 0), MAX_DENSITY)]
}

export interface Vec {
  x: number
  y: number
}

/** First `n` cells of an outward square spiral starting at the origin. */
export function spiralPositions(n: number): Vec[] {
  const out: Vec[] = [{ x: 0, y: 0 }]
  const dirs: Vec[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ]
  let x = 0
  let y = 0
  let step = 1
  let d = 0
  while (out.length < n) {
    for (let leg = 0; leg < 2; leg++) {
      const dir = dirs[d % 4]
      for (let s = 0; s < step && out.length < n; s++) {
        x += dir.x
        y += dir.y
        out.push({ x, y })
      }
      d++
    }
    step++
  }
  return out
}

export type CellKind = 'empty' | 'forSale' | 'business' | 'rental' | 'civic'

export type CivicId = 'townhall' | 'realtor' | 'hq' | 'factory' | 'bank'

export interface CivicDef {
  id: CivicId
  name: string
  menu: string
  pos: Vec
}

/** Civic buildings: landmarks you click to open each system's popup. */
export const CIVIC_DEFS: CivicDef[] = [
  { id: 'townhall', name: 'TOWN HALL', menu: 'jobs', pos: { x: -4, y: -4 } },
  { id: 'realtor', name: 'REALTOR', menu: 'realestate', pos: { x: -2, y: -4 } },
  { id: 'hq', name: 'HQ', menu: 'hq', pos: { x: 0, y: -4 } },
  { id: 'factory', name: 'FACTORY', menu: 'factory', pos: { x: 2, y: -4 } },
  { id: 'bank', name: 'BANK', menu: 'bank', pos: { x: 4, y: -4 } },
]

export const CIVIC_BY_ID: Record<CivicId, CivicDef> = Object.fromEntries(
  CIVIC_DEFS.map((c) => [c.id, c]),
) as Record<CivicId, CivicDef>

export interface PlacedCell {
  x: number
  y: number
  kind: CellKind
  glyph: string
  label: string
  businessId?: string
  civic?: CivicId
}

export interface CityLayout {
  cells: PlacedCell[]
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface LayoutInput {
  startedBusinesses: { id: string; glyph: string; name: string }[]
  rentals: number
  rentalGlyph: string
}

/** Place businesses (centre) + rentals (spiralling out) + the next for-sale lot. */
export function layoutCity({ startedBusinesses, rentals, rentalGlyph }: LayoutInput): CityLayout {
  const cells: PlacedCell[] = []
  const occupied = new Set<string>()

  // Civic buildings sit at fixed positions; the business/rental spiral skips them.
  for (const c of CIVIC_DEFS) {
    cells.push({ x: c.pos.x, y: c.pos.y, kind: 'civic', glyph: c.name[0], label: c.name, civic: c.id })
    occupied.add(`${c.pos.x},${c.pos.y}`)
  }

  const need = startedBusinesses.length + rentals + 1 // +1 for the next for-sale lot
  const free: Vec[] = []
  for (const p of spiralPositions(need + CIVIC_DEFS.length + 8)) {
    if (!occupied.has(`${p.x},${p.y}`)) free.push(p)
    if (free.length >= need) break
  }

  let i = 0
  for (const b of startedBusinesses) {
    const p = free[i++]
    cells.push({ x: p.x, y: p.y, kind: 'business', glyph: b.glyph, label: b.name, businessId: b.id })
  }
  for (let r = 0; r < rentals; r++) {
    const p = free[i++]
    cells.push({ x: p.x, y: p.y, kind: 'rental', glyph: rentalGlyph, label: 'Rental property' })
  }
  const lot = free[i]
  if (lot) cells.push({ x: lot.x, y: lot.y, kind: 'forSale', glyph: '$', label: 'Lot for sale' })

  // Space everything out so there are road gaps between buildings — each building
  // gets its own tile and is easy to see and click.
  const SPACING = 2
  for (const c of cells) {
    c.x *= SPACING
    c.y *= SPACING
  }

  const xs = cells.map((c) => c.x)
  const ys = cells.map((c) => c.y)
  return {
    cells,
    minX: Math.min(...xs) - 1,
    maxX: Math.max(...xs) + 1,
    minY: Math.min(...ys) - 1,
    maxY: Math.max(...ys) + 1,
  }
}
