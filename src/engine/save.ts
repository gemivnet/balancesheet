// Versioned save/load. Decimals are stored as strings; everything merges back
// onto a fresh initialState() so adding new businesses/upgrades later won't break
// old saves. The serialize/deserialize pair is pure (no localStorage) so it can be
// unit-tested as a round-trip; the storage wrappers are thin.

import { D } from './num'
import { initialState, SAVE_VERSION } from './state'
import { BUSINESS_DEFS } from './businesses'
import type { GameState, ThemeId } from './types'

const SAVE_KEY = 'ascii-tycoon-save'

interface SavedShape {
  version: number
  cash: string
  lifetimeEarnings: string
  activeBusinessId: string
  businesses: Record<string, { owned: number; managed: boolean; progress: number }>
  upgrades: Record<string, true>
  ui: { abbreviate: boolean; theme: string }
  stats: { totalClicks: number }
  rentals: number
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
    ui: { abbreviate: state.ui.abbreviate, theme: state.ui.theme },
    stats: { totalClicks: state.stats.totalClicks },
    rentals: state.rentals,
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
    if (data.ui.theme === 'gray' || data.ui.theme === 'mono') {
      state.ui.theme = data.ui.theme as ThemeId
    }
  }
  if (data.stats) state.stats.totalClicks = data.stats.totalClicks ?? 0
  if (typeof data.rentals === 'number') state.rentals = data.rentals
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
