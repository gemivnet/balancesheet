import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { initialState } from './state'
import { D } from './num'
import { generateContract } from './contracts'
import type { Contract } from './types'

function newEngine(cash = 0): Engine {
  const s = initialState()
  s.cash = D(cash)
  return new Engine(s)
}

describe('facilities', () => {
  it('cost grows geometrically and buying deducts cash', () => {
    const e = newEngine(10000)
    expect(e.facilityCost('logging', 1).toNumber()).toBeCloseTo(150, 6)
    expect(e.buyFacility('logging', 1)).toBe(true)
    expect(e.state.facilities.logging.owned).toBe(1)
    expect(e.facilityCost('logging', 1).toNumber()).toBeCloseTo(168, 6) // 150 * 1.12
  })

  it('unlocks by lifetime earnings', () => {
    const e = newEngine()
    expect(e.facilityUnlocked('logging')).toBe(false) // needs 120 lifetime
    e.state.lifetimeEarnings = D(500)
    expect(e.facilityUnlocked('logging')).toBe(true)
  })
})

describe('production', () => {
  it('extractors generate raw materials over time', () => {
    const e = newEngine(10000)
    e.buyFacility('logging', 1)
    e.tick(10)
    expect(e.state.resources.wood.toNumber()).toBeCloseTo(10, 6)
  })

  it('factories convert inputs into outputs', () => {
    const e = newEngine()
    e.state.facilities.sawmill.owned = 1
    e.state.resources.wood = D(10)
    e.tick(1) // 2 wood -> 1 plank
    expect(e.state.resources.wood.toNumber()).toBeCloseTo(8, 6)
    expect(e.state.resources.planks.toNumber()).toBeCloseTo(1, 6)
  })

  it('throttles a factory when inputs are short', () => {
    const e = newEngine()
    e.state.facilities.sawmill.owned = 1
    e.state.resources.wood = D(1) // only half of the 2 needed
    e.tick(1)
    expect(e.state.resources.wood.toNumber()).toBeCloseTo(0, 6)
    expect(e.state.resources.planks.toNumber()).toBeCloseTo(0.5, 6)
  })

  it('machine upgrades double output', () => {
    const e = newEngine(1e7)
    e.buyFacility('logging', 5) // owning 5 unlocks the machine upgrade
    expect(e.resourceNetRate('wood').toNumber()).toBeCloseTo(5, 6)
    expect(e.buyUpgrade('logging_mach_5')).toBe(true)
    expect(e.resourceNetRate('wood').toNumber()).toBeCloseTo(10, 6)
  })
})

describe('contracts', () => {
  function order(over: Partial<Contract> = {}): Contract {
    return {
      id: 1,
      type: 'delivery',
      items: [{ resource: 'wood', amount: 5 }],
      reward: 100,
      timeLimit: 60,
      remaining: 60,
      ...over,
    }
  }

  it('accept then deliver consumes resources and pays the reward', () => {
    const e = newEngine()
    e.state.contracts.available = [order()]
    expect(e.acceptContract(1)).toBe(true)
    expect(e.state.contracts.active).toHaveLength(1)
    expect(e.state.contracts.available).toHaveLength(0)
    expect(e.deliverContract(1)).toBe(false) // no wood yet
    e.state.resources.wood = D(10)
    expect(e.deliverContract(1)).toBe(true)
    expect(e.state.resources.wood.toNumber()).toBe(5)
    expect(e.state.cash.toNumber()).toBe(100)
    expect(e.state.contracts.active).toHaveLength(0)
  })

  it('active contracts expire when their timer runs out', () => {
    const e = newEngine()
    e.state.contracts.available = [order()]
    e.acceptContract(1)
    e.tickContracts(61)
    expect(e.state.contracts.active).toHaveLength(0)
  })

  it('refreshes new offers over time', () => {
    const e = newEngine()
    e.state.contracts.available = []
    e.state.contracts.refreshTimer = 0
    e.tickContracts(0.1)
    expect(e.state.contracts.available.length).toBe(1)
  })

  it('generates valid contracts across all job types', () => {
    for (let i = 0; i < 80; i++) {
      const c = generateContract(i)
      expect(c.items.length).toBeGreaterThanOrEqual(1)
      expect(c.reward).toBeGreaterThan(0)
      expect(c.timeLimit).toBeGreaterThan(0)
      for (const it of c.items) expect(it.amount).toBeGreaterThan(0)
    }
  })
})
