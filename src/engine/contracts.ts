// Contracts ("jobs you choose"): randomly generated orders to deliver a quantity
// of a resource before a deadline, for a cash reward. Tighter deadlines pay a
// better margin — the risk/reward choice. Contracts are saved (plain numbers), so
// generation can use Math.random freely.

import { RESOURCE_VALUE } from './resources'
import type { Contract, ResourceId } from './types'

export const CONTRACT_RESOURCES: ResourceId[] = ['wood', 'ore', 'planks', 'metal', 'goods']

export const MAX_AVAILABLE = 4
export const MAX_ACTIVE = 4
export const CONTRACT_REFRESH = 22 // seconds between new offers
export const FIRST_OFFER_DELAY = 3

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateContract(id: number): Contract {
  const resource = pick(CONTRACT_RESOURCES)
  const amount = Math.round(rand(10, 70))
  const tightness = rand(0, 1) // 0 = relaxed, 1 = tight deadline / better pay
  const timeLimit = Math.round(180 - tightness * 120) // 60..180s
  const margin = 1.5 + tightness * 0.9 // 1.5..2.4
  const reward = Math.round(amount * RESOURCE_VALUE[resource] * margin)
  return { id, resource, amount, reward, timeLimit, remaining: timeLimit }
}
