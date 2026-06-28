import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { initialState } from './state'
import { D } from './num'
import { GAME_YEAR, SAVINGS_APR, LOAN_APR, BOND_BY_ID } from './finance'
import { INSTRUMENT_DEFS } from './market'

function newEngine(cash = 0): Engine {
  const s = initialState()
  s.cash = D(cash)
  return new Engine(s)
}

describe('savings', () => {
  it('deposit and withdraw move cash', () => {
    const e = newEngine(1000)
    expect(e.depositSavings(400)).toBe(true)
    expect(e.state.cash.toNumber()).toBe(600)
    expect(e.state.finance.savings.toNumber()).toBe(400)
    expect(e.withdrawSavings(1000)).toBe(true) // clamps to balance
    expect(e.state.finance.savings.toNumber()).toBe(0)
    expect(e.state.cash.toNumber()).toBe(1000)
  })

  it('accrues interest over time', () => {
    const e = newEngine()
    e.state.finance.savings = D(1000)
    e.tick(GAME_YEAR) // one "year"
    expect(e.state.finance.savings.toNumber()).toBeCloseTo(1000 * (1 + SAVINGS_APR), 2)
  })
})

describe('loans', () => {
  it('borrowing is capped by the credit limit and adds cash + debt', () => {
    const e = newEngine(0)
    const limit = e.creditLimit().toNumber() // 0 liquid -> 1000 base
    expect(e.borrow(1e9)).toBe(true) // clamps to limit
    expect(e.state.finance.debt.toNumber()).toBeCloseTo(limit, 2)
    expect(e.state.cash.toNumber()).toBeCloseTo(limit, 2)
  })

  it('debt grows with interest and can be repaid', () => {
    const e = newEngine(0)
    e.state.finance.debt = D(1000)
    e.tick(GAME_YEAR)
    expect(e.state.finance.debt.toNumber()).toBeCloseTo(1000 * (1 + LOAN_APR), 2)
    e.state.cash = D(2000)
    expect(e.repay(1e9)).toBe(true) // clamps to debt
    expect(e.state.finance.debt.toNumber()).toBe(0)
  })
})

describe('bonds', () => {
  it('buying locks cash and matures into a payout', () => {
    const p = BOND_BY_ID['b_short']
    const e = newEngine(p.principal)
    expect(e.buyBond('b_short')).toBe(true)
    expect(e.state.cash.toNumber()).toBe(0)
    expect(e.state.finance.bonds).toHaveLength(1)
    e.tick(p.term + 1) // mature
    expect(e.state.finance.bonds).toHaveLength(0)
    expect(e.state.cash.toNumber()).toBeCloseTo(p.principal * (1 + p.yield), 2)
  })
})

describe('market', () => {
  it('buy and sell shares move cash and holdings', () => {
    const e = newEngine(10000)
    const id = INSTRUMENT_DEFS[0].id
    const price = e.instrumentPrice(id)
    expect(e.buyInstrument(id, 10)).toBe(true)
    expect(e.state.finance.holdings[id]).toBe(10)
    expect(e.state.cash.toNumber()).toBeCloseTo(10000 - price * 10, 6)
    expect(e.holdingsValue().toNumber()).toBeCloseTo(price * 10, 6)
    expect(e.sellInstrument(id, 10)).toBe(true)
    expect(e.state.finance.holdings[id]).toBe(0)
    expect(e.state.cash.toNumber()).toBeCloseTo(10000, 6)
  })

  it('prices move when markets tick', () => {
    const e = newEngine()
    const id = INSTRUMENT_DEFS[0].id
    const before = e.instrumentPrice(id)
    let moved = false
    for (let i = 0; i < 50 && !moved; i++) {
      e.tickMarkets(1)
      if (e.instrumentPrice(id) !== before) moved = true
    }
    expect(moved).toBe(true)
  })
})

describe('finance unlock + net worth', () => {
  it('unlocks by lifetime earnings', () => {
    const e = newEngine()
    expect(e.financeUnlocked()).toBe(false)
    e.state.lifetimeEarnings = D(2000)
    expect(e.financeUnlocked()).toBe(true)
  })

  it('net worth sums cash, savings minus debt', () => {
    const e = newEngine(1000)
    e.state.finance.savings = D(500)
    e.state.finance.debt = D(200)
    expect(e.netWorth().toNumber()).toBeCloseTo(1300, 6)
  })
})
