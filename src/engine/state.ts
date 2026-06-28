// The initial game state and the save-format version.

import { D } from './num'
import { BUSINESS_DEFS, initialBusinessStates } from './businesses'
import { initialResources } from './resources'
import { initialFacilities } from './facilities'
import { FIRST_OFFER_DELAY } from './contracts'
import { initialFinance } from './finance'
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
    ui: { abbreviate: false, theme: 'mono', cityGrid: false, iso: false },
    stats: { totalClicks: 0 },
    rentals: 0,
    densityLevel: 0,
    resources: initialResources(),
    facilities: initialFacilities(),
    contracts: { available: [], active: [], nextId: 1, refreshTimer: FIRST_OFFER_DELAY },
    finance: initialFinance(),
    lastSaved: Date.now(),
  }
}
