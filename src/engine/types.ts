// Core type definitions for the simulation. This file (and everything under
// engine/) is PURE TypeScript — no Svelte, no DOM — so it stays testable and
// renderer-agnostic. The UI only ever reads snapshots and calls engine actions.

import type Decimal from 'break_infinity.js'

export type BusinessId = string
export type UpgradeId = string

/** Static definition of a business (never changes at runtime). */
export interface BusinessDef {
  id: BusinessId
  name: string
  glyph: string // single ASCII-ish char used as the icon / future city tile
  blurb: string
  baseCost: Decimal // cost of the next unit when you own 0
  costGrowth: number // each additional unit costs this much more (e.g. 1.07)
  baseRevenue: Decimal // money per completed work-cycle, per unit, at x1
  cycleTime: number // seconds per work-cycle at x1 speed
  managerCost: Decimal // one-time cost to automate (hire a manager)
  startsOwned: number // units you begin with (0 = locked until first purchase)
}

export type UpgradeKind =
  | 'businessRevenue' // multiply one business's revenue
  | 'businessSpeed' // multiply one business's cycle speed
  | 'clickPower' // multiply manual click yield (global)
  | 'globalRevenue' // multiply all revenue
  | 'facilityOutput' // multiply one facility's output (machines)
  | 'propertyRent' // multiply rental income
  | 'ui' // unlock a UI / quality-of-life tier (no economic effect)

export type ThemeId = 'mono' | 'gray' | 'dark' | 'amber' | 'blue'

export type UiFlag = 'cityGrid'

export type UiEffect =
  | { type: 'abbreviate' }
  | { type: 'theme'; theme: ThemeId }
  | { type: 'flag'; flag: UiFlag }

/** Static definition of a one-time upgrade purchase. */
export interface UpgradeDef {
  id: UpgradeId
  name: string
  desc: string
  cost: Decimal
  kind: UpgradeKind
  factor: number // multiplier for the economic kinds
  target?: BusinessId // for businessRevenue / businessSpeed
  ui?: UiEffect // for kind 'ui'
  requires?: { business: BusinessId; owned: number } // visibility gate
  requiresFacility?: { facility: string; owned: number }
  requiresRentals?: number
}

/** Mutable, saved per-business state. */
export interface BusinessState {
  owned: number
  managed: boolean
  progress: number // 0..1 within the current work-cycle
}

// --- production layer ---

export type ResourceId = 'wood' | 'ore' | 'planks' | 'metal' | 'goods'

/** A facility consumes inputs and produces outputs, per owned unit, per second. */
export interface FacilityDef {
  id: string
  name: string
  glyph: string
  blurb: string
  baseCost: Decimal
  costGrowth: number
  inputs: { resource: ResourceId; amount: number }[]
  outputs: { resource: ResourceId; amount: number }[]
  unlockLifetime: Decimal // revealed once lifetime earnings reach this
}

export interface FacilityState {
  owned: number
}

/** A job: deliver `amount` of `resource` before the timer for a cash `reward`. */
export interface Contract {
  id: number
  resource: ResourceId
  amount: number
  reward: number
  timeLimit: number
  remaining: number // seconds left once accepted
}

export interface ContractBoard {
  available: Contract[]
  active: Contract[]
  nextId: number
  refreshTimer: number
}

/** The full mutable game state. This is what gets saved/loaded. */
export interface GameState {
  version: number
  cash: Decimal
  lifetimeEarnings: Decimal
  activeBusinessId: BusinessId // which business "you" are personally working
  businesses: Record<BusinessId, BusinessState>
  upgrades: Record<UpgradeId, true> // purchased upgrade ids
  ui: { abbreviate: boolean; theme: ThemeId; cityGrid: boolean }
  stats: { totalClicks: number }
  rentals: number // rental properties owned (real estate)
  densityLevel: number // housing density tier (boosts rent, denser buildings)
  resources: Record<ResourceId, Decimal>
  facilities: Record<string, FacilityState>
  contracts: ContractBoard
  lastSaved: number // epoch ms — used to compute offline progress
}

/** Derived multipliers, recomputed from purchased upgrades (never saved). */
export interface Mults {
  global: Decimal
  click: Decimal
  byBusiness: Record<BusinessId, { revenue: Decimal; speed: number }>
  byFacility: Record<string, { output: Decimal }>
  rent: Decimal
}
