// Data-driven production facilities. Extractors have no inputs (they gather raw
// materials); factories convert inputs into outputs. Rates are per owned unit,
// per second. Order matters: producers are listed before the factories that
// consume them so a chain can flow within a single tick.

import { D } from './num'
import type { FacilityDef, FacilityState } from './types'

export const FACILITY_DEFS: FacilityDef[] = [
  {
    id: 'logging',
    name: 'Logging Camp',
    glyph: 'T',
    blurb: 'Harvests raw wood.',
    baseCost: D(1000),
    costGrowth: 1.12,
    inputs: [],
    outputs: [{ resource: 'wood', amount: 1 }],
    unlockLifetime: D(500),
  },
  {
    id: 'mine',
    name: 'Ore Mine',
    glyph: '^',
    blurb: 'Digs up raw ore.',
    baseCost: D(1500),
    costGrowth: 1.12,
    inputs: [],
    outputs: [{ resource: 'ore', amount: 1 }],
    unlockLifetime: D(500),
  },
  {
    id: 'sawmill',
    name: 'Sawmill',
    glyph: '=',
    blurb: 'Cuts wood into planks (2 wood → 1 plank).',
    baseCost: D(4000),
    costGrowth: 1.13,
    inputs: [{ resource: 'wood', amount: 2 }],
    outputs: [{ resource: 'planks', amount: 1 }],
    unlockLifetime: D(4000),
  },
  {
    id: 'foundry',
    name: 'Foundry',
    glyph: '#',
    blurb: 'Smelts ore into metal (2 ore → 1 metal).',
    baseCost: D(6000),
    costGrowth: 1.13,
    inputs: [{ resource: 'ore', amount: 2 }],
    outputs: [{ resource: 'metal', amount: 1 }],
    unlockLifetime: D(4000),
  },
  {
    id: 'workshop',
    name: 'Workshop',
    glyph: '&',
    blurb: 'Assembles planks + metal into finished goods.',
    baseCost: D(20000),
    costGrowth: 1.14,
    inputs: [
      { resource: 'planks', amount: 1 },
      { resource: 'metal', amount: 1 },
    ],
    outputs: [{ resource: 'goods', amount: 1 }],
    unlockLifetime: D(20000),
  },
]

export const FACILITY_BY_ID: Record<string, FacilityDef> = Object.fromEntries(
  FACILITY_DEFS.map((f) => [f.id, f]),
)

export function initialFacilities(): Record<string, FacilityState> {
  const out: Record<string, FacilityState> = {}
  for (const f of FACILITY_DEFS) out[f.id] = { owned: 0 }
  return out
}
