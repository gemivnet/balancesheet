// Contracts ("jobs you choose"): randomly generated orders to deliver goods before
// a deadline for a cash reward. Job *types* keep the board varied:
//   delivery   – steady single-resource order
//   rush       – small amount, tight deadline, premium pay
//   express    – tiny amount, very tight deadline, huge premium
//   bulk       – large amount, long deadline, big total
//   wholesale  – huge amount, long deadline, thin margin but massive total
//   supply     – two different resources at once
//   mega       – three different resources at once
// Contracts are saved (plain numbers), so generation can use Math.random freely.

import { RESOURCE_VALUE } from './resources'
import type { Contract, ContractItem, ContractType, ResourceId } from './types'

export const CONTRACT_RESOURCES: ResourceId[] = ['wood', 'ore', 'planks', 'metal', 'goods']

export const MAX_AVAILABLE = 6
export const MAX_ACTIVE = 6
export const CONTRACT_REFRESH = 18 // seconds between new offers
export const FIRST_OFFER_DELAY = 3

const WEIGHTS: ContractType[] = [
  'delivery',
  'delivery',
  'delivery',
  'rush',
  'bulk',
  'supply',
  'express',
  'wholesale',
  'mega',
]

type SingleType = Exclude<ContractType, 'supply' | 'mega'>
interface Cfg {
  amt: [number, number]
  time: [number, number]
  margin: [number, number]
}
const SINGLE: Record<SingleType, Cfg> = {
  delivery: { amt: [15, 60], time: [90, 160], margin: [1.6, 2.0] },
  rush: { amt: [8, 25], time: [35, 60], margin: [2.3, 3.0] },
  express: { amt: [6, 16], time: [18, 32], margin: [3.0, 4.2] },
  bulk: { amt: [80, 200], time: [200, 300], margin: [1.5, 1.8] },
  wholesale: { amt: [250, 500], time: [300, 420], margin: [1.35, 1.6] },
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateContract(id: number): Contract {
  const type = pick(WEIGHTS)

  if (type === 'supply' || type === 'mega') {
    const n = type === 'mega' ? 3 : 2
    const used = new Set<ResourceId>()
    const items: ContractItem[] = []
    for (let k = 0; k < n; k++) {
      let r = pick(CONTRACT_RESOURCES)
      for (let g = 0; used.has(r) && g < 8; g++) r = pick(CONTRACT_RESOURCES)
      used.add(r)
      items.push({ resource: r, amount: Math.round(rand(15, 45)) })
    }
    const timeLimit = Math.round(type === 'mega' ? rand(180, 280) : rand(120, 200))
    const margin = type === 'mega' ? rand(2.0, 2.6) : rand(1.8, 2.3)
    const value = items.reduce((s, it) => s + it.amount * RESOURCE_VALUE[it.resource], 0)
    return { id, type, items, reward: Math.round(value * margin), timeLimit, remaining: timeLimit }
  }

  const cfg = SINGLE[type]
  const resource = pick(CONTRACT_RESOURCES)
  const amount = Math.round(rand(cfg.amt[0], cfg.amt[1]))
  const timeLimit = Math.round(rand(cfg.time[0], cfg.time[1]))
  const margin = rand(cfg.margin[0], cfg.margin[1])
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
    return { id: c.id, type: (c.type as ContractType) ?? 'delivery', items: c.items as ContractItem[], reward, timeLimit, remaining }
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
