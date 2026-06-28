import { describe, it, expect } from 'vitest'
import { spiralPositions, cityTier, layoutCity, REAL_ESTATE } from './city'
import { Engine } from './engine'
import { initialState } from './state'
import { D } from './num'

function newEngine(cash = 0): Engine {
  const s = initialState()
  s.cash = D(cash)
  return new Engine(s)
}

describe('spiral layout', () => {
  it('starts at the origin and produces unique cells', () => {
    const p = spiralPositions(9)
    expect(p).toHaveLength(9)
    expect(p[0]).toEqual({ x: 0, y: 0 })
    expect(p[1]).toEqual({ x: 1, y: 0 })
    expect(p[2]).toEqual({ x: 1, y: 1 })
    expect(p[4]).toEqual({ x: -1, y: 1 })
    expect(new Set(p.map((c) => `${c.x},${c.y}`)).size).toBe(9)
  })
})

describe('city tiers', () => {
  it('advances by total building count', () => {
    expect(cityTier(0).name).toBe('Hamlet')
    expect(cityTier(2).name).toBe('Hamlet')
    expect(cityTier(3).name).toBe('Village')
    expect(cityTier(8).name).toBe('Town')
    expect(cityTier(16).name).toBe('City')
    expect(cityTier(31).name).toBe('Metropolis')
  })
})

describe('layoutCity', () => {
  it('centres businesses, spirals rentals, and adds a for-sale lot', () => {
    const layout = layoutCity({
      startedBusinesses: [{ id: 'lemonade', glyph: 'L', name: 'Lemonade Stand' }],
      rentals: 1,
      rentalGlyph: 'n',
    })
    expect(layout.cells).toHaveLength(3)
    expect(layout.cells[0]).toMatchObject({ x: 0, y: 0, kind: 'business', businessId: 'lemonade' })
    expect(layout.cells[1].kind).toBe('rental')
    expect(layout.cells[2].kind).toBe('forSale')
    expect(layout.minX).toBeLessThan(0)
    expect(layout.maxX).toBeGreaterThan(0)
  })
})

describe('real estate economics', () => {
  it('rental cost grows geometrically', () => {
    const e = newEngine()
    expect(e.rentalCost().toNumber()).toBeCloseTo(REAL_ESTATE.baseLotCost.toNumber(), 6) // 500
    e.state.rentals = 1
    expect(e.rentalCost().toNumber()).toBeCloseTo(575, 6) // 500 * 1.15
  })

  it('buying a rental deducts cash and counts as a building', () => {
    const e = newEngine(600)
    expect(e.totalBuildings()).toBe(1) // lemonade only
    expect(e.buyRental()).toBe(true)
    expect(e.state.cash.toNumber()).toBeCloseTo(100, 6)
    expect(e.state.rentals).toBe(1)
    expect(e.totalBuildings()).toBe(2)
    expect(e.buyRental()).toBe(false) // next lot costs 575, only 100 left
  })

  it('rent scales with count and city tier', () => {
    const e = newEngine()
    expect(e.rentPerSec().toNumber()).toBe(0)
    e.state.rentals = 2 // total buildings = 3 -> Village (rentMult 1.25)
    expect(e.rentPerSec().toNumber()).toBeCloseTo(8 * 2 * 1.25, 6) // 20
  })

  it('rent accrues over a tick', () => {
    const e = newEngine()
    e.state.rentals = 1 // total 2 -> Hamlet (mult 1), 8/s
    const before = e.state.cash
    e.tick(10)
    expect(e.state.cash.sub(before).toNumber()).toBeCloseTo(80, 6)
  })
})
