// Contracts ("jobs you choose"): randomly generated orders to deliver goods before
// a deadline for a cash reward. Several job *types* keep the board varied:
//   - delivery: a steady single-resource order
//   - rush:     small amount, tight deadline, premium pay
//   - bulk:     large amount, long deadline, big total
//   - supply:   two different resources at once
// Contracts are saved (plain numbers), so generation can use Math.random freely.

import { RESOURCE_VALUE } from './resources'
import type { Contract, ContractType, ResourceId } from './types'

export const CONTRACT_RESOURCES: ResourceId[] = ['wood', 'ore', 'planks', 'metal', 'goods']

export const MAX_AVAILABLE = 5
export const MAX_ACTIVE = 5
export const CONTRACT_REFRESH = 20 // seconds between new offers
export const FIRST_OFFER_DELAY = 3

const TYPE_WEIGHTS: ContractType[] = ['delivery', 'delivery', 'delivery', 'rush', 'bulk', 'supply']

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateContract(id: number): Contract {
  const type = pick(TYPE_WEIGHTS)

  if (type === 'supply') {
    const r1 = pick(CONTRACT_RESOURCES)
    let r2 = pick(CONTRACT_RESOURCES)
    for (let g = 0; r2 === r1 && g < 6; g++) r2 = pick(CONTRACT_RESOURCES)
    const a1 = Math.round(rand(15, 45))
    const a2 = Math.round(rand(15, 45))
    const timeLimit = Math.round(rand(120, 200))
    const reward = Math.round((a1 * RESOURCE_VALUE[r1] + a2 * RESOURCE_VALUE[r2]) * rand(1.8, 2.3))
    return {
      id,
      type,
      items: [
        { resource: r1, amount: a1 },
        { resource: r2, amount: a2 },
      ],
      reward,
      timeLimit,
      remaining: timeLimit,
    }
  }

  const resource = pick(CONTRACT_RESOURCES)
  let amount: number
  let timeLimit: number
  let margin: number
  if (type === 'rush') {
    amount = Math.round(rand(8, 25))
    timeLimit = Math.round(rand(35, 60))
    margin = rand(2.3, 3.0)
  } else if (type === 'bulk') {
    amount = Math.round(rand(80, 200))
    timeLimit = Math.round(rand(200, 300))
    margin = rand(1.5, 1.8)
  } else {
    amount = Math.round(rand(15, 60))
    timeLimit = Math.round(rand(90, 160))
    margin = rand(1.6, 2.0)
  }
  const reward = Math.round(amount * RESOURCE_VALUE[resource] * margin)
  return { id, type, items: [{ resource, amount }], reward, timeLimit, remaining: timeLimit }
}

/** Coerce a saved contract (possibly the old single-resource shape) into the current one. */
export function normalizeContract(raw: unknown): Contract | null {
  const c = raw as Record<string, unknown>
  if (!c || typeof c.id !== 'number') return null
  const reward = typeof c.reward === 'number' ? c.reward : 0
  const timeLimit = typeof c.timeLimit === 'number' ? c.timeLimit : 60
  const remaining = typeof c.remaining === 'number' ? c.remaining : timeLimit
  if (Array.isArray(c.items)) {
    return { id: c.id, type: (c.type as ContractType) ?? 'delivery', items: c.items as Contract['items'], reward, timeLimit, remaining }
  }
  if (typeof c.resource === 'string' && typeof c.amount === 'number') {
    return {
      id: c.id,
      type: 'delivery',
      items: [{ resource: c.resource as ResourceId, amount: c.amount }],
      reward,
      timeLimit,
      remaining,
    }
  }
  return null
}
