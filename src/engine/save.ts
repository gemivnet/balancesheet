// Versioned save/load. Decimals are stored as strings; everything merges back
// onto a fresh initialState() so adding new businesses/upgrades later won't break
// old saves. The serialize/deserialize pair is pure (no localStorage) so it can be
// unit-tested as a round-trip; the storage wrappers are thin.

import { D } from './num'
import { initialState, SAVE_VERSION } from './state'
import { BUSINESS_DEFS } from './businesses'
import { RESOURCE_DEFS } from './resources'
import { FACILITY_DEFS } from './facilities'
import { FIRST_OFFER_DELAY } from './contracts'
import { INSTRUMENT_DEFS } from './market'
import type { Bond, ContractBoard, GameState, ThemeId } from './types'

const SAVE_KEY = 'ascii-tycoon-save'

interface SavedShape {
  version: number
  cash: string
  lifetimeEarnings: string
  activeBusinessId: string
  businesses: Record<string, { owned: number; managed: boolean; progress: number }>
  upgrades: Record<string, true>
  ui: { abbreviate: boolean; theme: string; cityGrid: boolean; iso: boolean }
  stats: { totalClicks: number }
  rentals: number
  densityLevel: number
  resources: Record<string, string>
  facilities: Record<string, number>
  contracts: ContractBoard
  finance: {
    savings: string
    debt: string
    bonds: Bond[]
    nextBondId: number
    holdings: Record<string, number>
    prices: Record<string, number>
  }
  lastSaved: number
}

export function serialize(state: GameState): string {
  const shape: SavedShape = {
    version: state.version,
    cash: state.cash.toString(),
    lifetimeEarnings: state.lifetimeEarnings.toString(),
    activeBusinessId: state.activeBusinessId,
    businesses: Object.fromEntries(
      Object.entries(state.businesses).map(([id, b]) => [
        id,
        { owned: b.owned, managed: b.managed, progress: b.progress },
      ]),
    ),
    upgrades: { ...state.upgrades },
    ui: { abbreviate: state.ui.abbreviate, theme: state.ui.theme, cityGrid: state.ui.cityGrid, iso: state.ui.iso },
    stats: { totalClicks: state.stats.totalClicks },
    rentals: state.rentals,
    densityLevel: state.densityLevel,
    resources: Object.fromEntries(Object.entries(state.resources).map(([k, v]) => [k, v.toString()])),
    facilities: Object.fromEntries(Object.entries(state.facilities).map(([k, v]) => [k, v.owned])),
    contracts: state.contracts,
    finance: {
      savings: state.finance.savings.toString(),
      debt: state.finance.debt.toString(),
      bonds: state.finance.bonds,
      nextBondId: state.finance.nextBondId,
      holdings: state.finance.holdings,
      prices: state.finance.prices,
    },
    lastSaved: state.lastSaved,
  }
  return JSON.stringify(shape)
}

export function deserialize(raw: string): GameState {
  const data = JSON.parse(raw) as Partial<SavedShape>
  const state = initialState()
  state.version = SAVE_VERSION
  if (data.cash != null) state.cash = D(data.cash)
  if (data.lifetimeEarnings != null) state.lifetimeEarnings = D(data.lifetimeEarnings)
  if (data.upgrades) state.upgrades = { ...data.upgrades }
  if (data.ui) {
    state.ui.abbreviate = !!data.ui.abbreviate
    state.ui.cityGrid = !!data.ui.cityGrid
    state.ui.iso = !!data.ui.iso
    const themes: ThemeId[] = ['mono', 'gray', 'dark', 'amber', 'blue']
    if (themes.includes(data.ui.theme as ThemeId)) state.ui.theme = data.ui.theme as ThemeId
  }
  if (data.stats) state.stats.totalClicks = data.stats.totalClicks ?? 0
  if (typeof data.rentals === 'number') state.rentals = data.rentals
  if (typeof data.densityLevel === 'number') state.densityLevel = data.densityLevel
  if (data.resources) {
    for (const r of RESOURCE_DEFS) {
      const v = data.resources[r.id]
      if (v != null) state.resources[r.id] = D(v)
    }
  }
  if (data.facilities) {
    for (const f of FACILITY_DEFS) {
      const owned = data.facilities[f.id]
      if (typeof owned === 'number') state.facilities[f.id].owned = owned
    }
  }
  if (
    data.contracts &&
    Array.isArray(data.contracts.available) &&
    Array.isArray(data.contracts.active)
  ) {
    state.contracts = {
      available: data.contracts.available,
      active: data.contracts.active,
      nextId: data.contracts.nextId ?? 1,
      refreshTimer: data.contracts.refreshTimer ?? FIRST_OFFER_DELAY,
    }
  }
  if (data.finance) {
    const fin = state.finance
    if (data.finance.savings != null) fin.savings = D(data.finance.savings)
    if (data.finance.debt != null) fin.debt = D(data.finance.debt)
    if (Array.isArray(data.finance.bonds)) fin.bonds = data.finance.bonds
    if (typeof data.finance.nextBondId === 'number') fin.nextBondId = data.finance.nextBondId
    if (data.finance.holdings) {
      for (const inst of INSTRUMENT_DEFS) {
        const h = data.finance.holdings[inst.id]
        if (typeof h === 'number') fin.holdings[inst.id] = h
      }
    }
    if (data.finance.prices) {
      for (const inst of INSTRUMENT_DEFS) {
        const p = data.finance.prices[inst.id]
        if (typeof p === 'number' && isFinite(p) && p > 0) fin.prices[inst.id] = p
      }
    }
  }

  if (data.lastSaved != null) state.lastSaved = data.lastSaved

  // Merge saved business state onto defaults so newly-added businesses default in.
  if (data.businesses) {
    for (const def of BUSINESS_DEFS) {
      const saved = data.businesses[def.id]
      if (saved) {
        state.businesses[def.id] = {
          owned: saved.owned ?? def.startsOwned,
          managed: !!saved.managed,
          progress: saved.progress ?? 0,
        }
      }
    }
  }

  // Keep the active business valid (must be one you own).
  state.activeBusinessId = data.activeBusinessId ?? state.activeBusinessId
  const active = state.businesses[state.activeBusinessId]
  if (!active || active.owned <= 0) {
    const firstOwned = BUSINESS_DEFS.find((b) => state.businesses[b.id].owned > 0)
    state.activeBusinessId = firstOwned ? firstOwned.id : BUSINESS_DEFS[0].id
  }

  return state
}

export function save(state: GameState): void {
  state.lastSaved = Date.now()
  try {
    localStorage.setItem(SAVE_KEY, serialize(state))
  } catch {
    // Storage may be unavailable (private mode, quota) — fail quietly.
  }
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? deserialize(raw) : null
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY)
  } catch {
    return false
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}
