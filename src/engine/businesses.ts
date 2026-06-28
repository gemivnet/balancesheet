// Data-driven business definitions. Adding a new venture is just adding an entry
// here — no engine changes. Numbers follow a classic idle curve (each tier ~15x
// the previous) but are expressed as plain dollars to keep the early game grounded.

import { D } from './num'
import type { BusinessDef, BusinessId, BusinessState } from './types'

export const BUSINESS_DEFS: BusinessDef[] = [
  {
    id: 'lemonade',
    name: 'Lemonade Stand',
    glyph: 'L',
    blurb: 'Squeeze, pour, repeat. Everyone starts somewhere.',
    baseCost: D(4),
    costGrowth: 1.07,
    baseRevenue: D(1),
    cycleTime: 0.6,
    managerCost: D(60),
    startsOwned: 1,
  },
  {
    id: 'coffee',
    name: 'Coffee Cart',
    glyph: 'C',
    blurb: 'Caffeinate the morning commute.',
    baseCost: D(60),
    costGrowth: 1.08,
    baseRevenue: D(6),
    cycleTime: 3,
    managerCost: D(720),
    startsOwned: 0,
  },
  {
    id: 'repair',
    name: 'Repair Bench',
    glyph: 'R',
    blurb: 'Fix gadgets and gizmos for a tidy fee.',
    baseCost: D(720),
    costGrowth: 1.09,
    baseRevenue: D(54),
    cycleTime: 6,
    managerCost: D(8600),
    startsOwned: 0,
  },
]

export const BUSINESS_BY_ID: Record<BusinessId, BusinessDef> = Object.fromEntries(
  BUSINESS_DEFS.map((b) => [b.id, b]),
)

export function initialBusinessStates(): Record<BusinessId, BusinessState> {
  const out: Record<BusinessId, BusinessState> = {}
  for (const b of BUSINESS_DEFS) {
    out[b.id] = { owned: b.startsOwned, managed: false, progress: 0 }
  }
  return out
}
