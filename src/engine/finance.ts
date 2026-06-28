// Savings, loans and bonds — the deterministic side of finance. Interest is
// expressed as an annual rate; a "year" is GAME_YEAR seconds of play, so returns
// are visible on a gameplay timescale while staying realistic in shape.

import Decimal from 'break_infinity.js'
import { D } from './num'
import { INSTRUMENT_DEFS } from './market'
import type { BondProductDef, FinanceState } from './types'

export const GAME_YEAR = 300 // seconds of play == one "year" of interest
export const SAVINGS_APR = 0.04 // safe, liquid, low yield
export const LOAN_APR = 0.12 // the cost of leverage
export const FINANCE_UNLOCK = D(2000) // lifetime earnings before the Finance tab appears

export const BOND_PRODUCTS: BondProductDef[] = [
  { id: 'b_short', name: 'Short Bond', principal: 5000, yield: 0.03, term: 60 },
  { id: 'b_med', name: 'Medium Bond', principal: 25000, yield: 0.09, term: 180 },
  { id: 'b_long', name: 'Long Bond', principal: 100000, yield: 0.3, term: 600 },
]

export const BOND_BY_ID: Record<string, BondProductDef> = Object.fromEntries(
  BOND_PRODUCTS.map((b) => [b.id, b]),
)

export function initialFinance(): FinanceState {
  const prices: Record<string, number> = {}
  const history: Record<string, number[]> = {}
  const holdings: Record<string, number> = {}
  for (const i of INSTRUMENT_DEFS) {
    prices[i.id] = i.start
    history[i.id] = []
    holdings[i.id] = 0
  }
  return { savings: D(0), debt: D(0), bonds: [], nextBondId: 1, holdings, prices, history }
}
