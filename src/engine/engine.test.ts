import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { initialState } from './state'
import { D } from './num'
import { applyOffline } from './offline'

function newEngine(cash = 0): Engine {
  const s = initialState()
  s.cash = D(cash)
  return new Engine(s)
}

describe('clicking', () => {
  it('earns one cycle of the active business', () => {
    const e = newEngine()
    const earned = e.click()
    expect(earned.toNumber()).toBe(1) // lemonade base revenue, owned 1
    expect(e.state.cash.toNumber()).toBe(1)
    expect(e.state.lifetimeEarnings.toNumber()).toBe(1)
    expect(e.state.stats.totalClicks).toBe(1)
  })

  it('scales with units owned', () => {
    const e = newEngine(1e6)
    e.buyUnit('lemonade', 9) // owned 1 -> 10
    expect(e.state.businesses.lemonade.owned).toBe(10)
    expect(e.click().toNumber()).toBe(10)
  })

  it('scales with click-power upgrades', () => {
    const e = newEngine(1000)
    expect(e.buyUpgrade('click_2')).toBe(true) // x2 click power, cost 150
    expect(e.click().toNumber()).toBe(2)
  })
})

describe('buying units', () => {
  it('uses a geometric cost and deducts cash', () => {
    const e = newEngine(100)
    expect(e.unitCost('lemonade', 1).toNumber()).toBeCloseTo(4.28, 2) // 4 * 1.07^1
    expect(e.buyUnit('lemonade', 1)).toBe(true)
    expect(e.state.businesses.lemonade.owned).toBe(2)
    expect(e.state.cash.toNumber()).toBeCloseTo(95.72, 2)
  })

  it('refuses purchases that are too expensive', () => {
    const e = newEngine(1)
    expect(e.buyUnit('lemonade', 1)).toBe(false)
    expect(e.state.businesses.lemonade.owned).toBe(1)
  })

  it('maxAffordable buys as many as possible but never one more', () => {
    const e = newEngine(1000)
    const n = e.maxAffordable('lemonade')
    expect(n).toBeGreaterThan(0)
    expect(e.unitCost('lemonade', n).lte(e.state.cash)).toBe(true)
    expect(e.unitCost('lemonade', n + 1).gt(e.state.cash)).toBe(true)
  })
})

describe('managers and idle income', () => {
  it('hiring a manager costs money and enables passive income', () => {
    const e = newEngine(100)
    expect(e.businessIncomePerSec('lemonade').toNumber()).toBe(0)
    expect(e.hireManager('lemonade')).toBe(true) // cost 60
    expect(e.state.cash.toNumber()).toBe(40)
    expect(e.businessIncomePerSec('lemonade').toNumber()).toBeCloseTo(1 / 0.6, 6)
  })

  it('ticks award completed cycles to managed businesses', () => {
    const e = newEngine(100)
    e.hireManager('lemonade')
    const before = e.state.cash
    e.tick(0.6) // exactly one cycle
    expect(e.state.cash.sub(before).toNumber()).toBeCloseTo(1, 6)
  })

  it('pays nothing idle for un-managed businesses', () => {
    const e = newEngine()
    const before = e.state.cash
    e.tick(10)
    expect(e.state.cash.eq(before)).toBe(true)
  })
})

describe('offline progress', () => {
  it('credits capped managed earnings since last save', () => {
    const e = newEngine(100)
    e.hireManager('lemonade')
    e.state.cash = D(0)
    e.state.lastSaved = Date.now() - 3600 * 1000 // 1h ago
    const result = applyOffline(e)
    expect(result).not.toBeNull()
    expect(result!.seconds).toBeCloseTo(3600, 0)
    expect(result!.earned.toNumber()).toBeCloseTo(3600 / 0.6, 0)
  })

  it('ignores negligible gaps', () => {
    const e = newEngine(100)
    e.hireManager('lemonade')
    e.state.lastSaved = Date.now() - 5 * 1000
    expect(applyOffline(e)).toBeNull()
  })
})

describe('upgrades', () => {
  it('doubles business revenue and is gated by ownership', () => {
    const e = newEngine(1e6)
    expect(e.upgradeVisible('lemonade_rev_10')).toBe(false)
    e.buyUnit('lemonade', 9) // owned 10 unlocks the upgrade
    expect(e.upgradeVisible('lemonade_rev_10')).toBe(true)
    const before = e.cycleRevenue('lemonade').toNumber()
    expect(e.buyUpgrade('lemonade_rev_10')).toBe(true)
    expect(e.cycleRevenue('lemonade').toNumber()).toBeCloseTo(before * 2, 6)
  })

  it('ui upgrades flip ui flags with no economic effect', () => {
    const e = newEngine(1e6)
    expect(e.state.ui.abbreviate).toBe(false)
    expect(e.buyUpgrade('ui_abbrev')).toBe(true)
    expect(e.state.ui.abbreviate).toBe(true)
  })
})
