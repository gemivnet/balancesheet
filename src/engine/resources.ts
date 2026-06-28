// Material stockpiles for the production layer. Resources are Decimals (they can
// pile up over long idle stretches) and keyed by ResourceId.

import Decimal from 'break_infinity.js'
import { D } from './num'
import type { ResourceId } from './types'

export interface ResourceDef {
  id: ResourceId
  name: string
  glyph: string
}

export const RESOURCE_DEFS: ResourceDef[] = [
  { id: 'wood', name: 'Wood', glyph: '"' },
  { id: 'ore', name: 'Ore', glyph: '*' },
  { id: 'planks', name: 'Planks', glyph: '=' },
  { id: 'metal', name: 'Metal', glyph: '+' },
  { id: 'goods', name: 'Goods', glyph: '%' },
]

export const RESOURCE_BY_ID: Record<ResourceId, ResourceDef> = Object.fromEntries(
  RESOURCE_DEFS.map((r) => [r.id, r]),
) as Record<ResourceId, ResourceDef>

export function initialResources(): Record<ResourceId, Decimal> {
  const out = {} as Record<ResourceId, Decimal>
  for (const r of RESOURCE_DEFS) out[r.id] = D(0)
  return out
}

/** Cash value per unit — used for selling on the spot market and sizing contracts. */
export const RESOURCE_VALUE: Record<ResourceId, number> = {
  wood: 3,
  ore: 4,
  planks: 14,
  metal: 20,
  goods: 70,
}
