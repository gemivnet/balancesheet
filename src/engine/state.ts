// The initial game state and the save-format version.

import { D } from './num'
import { BUSINESS_DEFS, initialBusinessStates } from './businesses'
import type { GameState } from './types'

export const SAVE_VERSION = 1

export function initialState(): GameState {
  return {
    version: SAVE_VERSION,
    cash: D(0),
    lifetimeEarnings: D(0),
    activeBusinessId: BUSINESS_DEFS[0].id,
    businesses: initialBusinessStates(),
    upgrades: {},
    ui: { abbreviate: false, theme: 'mono' },
    stats: { totalClicks: 0 },
    rentals: 0,
    lastSaved: Date.now(),
  }
}
