import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { initialState } from './state'
import { D } from './num'
import { MAX_DENSITY } from './city'

function newEngine(cash = 0): Engine {
  const s = initialState()
  s.cash = D(cash)
  return new Engine(s)
}

describe('selling resources', () => {
  it('sells the whole stock at base value', () => {
    const e = newEngine()
    e.state.resources.wood = D(100)
    expect(e.sellResource('wood')).toBe(true)
    expect(e.state.resources.wood.toNumber()).toBe(0)
    expect(e.state.cash.toNumber()).toBe(100 * e.resourceValue('wood'))
  })

  it('refuses to sell an empty stock', () => {
    const e = newEngine()
    expect(e.sellResource('goods')).toBe(false)
  })
})

describe('housing density', () => {
  it('buying density costs cash and multiplies rent', () => {
    const e = newEngine(1e9)
    e.state.rentals = 1
    const baseRent = e.rentPerSec().toNumber()
    const cost = e.densityCost().toNumber()
    expect(e.buyDensity()).toBe(true)
    expect(e.state.densityLevel).toBe(1)
    expect(e.state.cash.toNumber()).toBeCloseTo(1e9 - cost, 2)
    expect(e.rentPerSec().toNumber()).toBeCloseTo(baseRent * 1.6, 6)
  })

  it('caps at max density', () => {
    const e = newEngine(1e30)
    for (let i = 0; i < MAX_DENSITY; i++) e.buyDensity()
    expect(e.state.densityLevel).toBe(MAX_DENSITY)
    expect(e.atMaxDensity()).toBe(true)
    expect(e.buyDensity()).toBe(false)
  })
})

describe('rent upgrades', () => {
  it('are gated by rentals owned and multiply rent', () => {
    const e = newEngine(1e9)
    e.state.rentals = 1
    expect(e.upgradeVisible('rent_2')).toBe(false) // needs 3 rentals
    e.state.rentals = 3
    expect(e.upgradeVisible('rent_2')).toBe(true)
    const before = e.rentPerSec().toNumber()
    expect(e.buyUpgrade('rent_2')).toBe(true)
    expect(e.rentPerSec().toNumber()).toBeCloseTo(before * 2, 6)
  })
})
