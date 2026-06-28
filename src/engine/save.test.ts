import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { initialState } from './state'
import { serialize, deserialize } from './save'
import { D } from './num'

describe('save round-trip', () => {
  it('preserves cash, businesses, upgrades, ui and stats', () => {
    const e = new Engine(initialState())
    e.state.cash = D('1000000')
    e.state.lifetimeEarnings = D('5000000')
    e.state.businesses.lemonade.owned = 7
    e.state.businesses.lemonade.managed = true
    e.state.businesses.coffee.owned = 3
    e.state.upgrades['click_2'] = true
    e.state.ui.abbreviate = true
    e.state.ui.theme = 'gray'
    e.state.activeBusinessId = 'coffee'
    e.state.stats.totalClicks = 42

    const restored = deserialize(serialize(e.state))

    expect(restored.cash.eq(D('1000000'))).toBe(true)
    expect(restored.lifetimeEarnings.eq(D('5000000'))).toBe(true)
    expect(restored.businesses.lemonade.owned).toBe(7)
    expect(restored.businesses.lemonade.managed).toBe(true)
    expect(restored.businesses.coffee.owned).toBe(3)
    expect(restored.upgrades['click_2']).toBe(true)
    expect(restored.ui.abbreviate).toBe(true)
    expect(restored.ui.theme).toBe('gray')
    expect(restored.activeBusinessId).toBe('coffee')
    expect(restored.stats.totalClicks).toBe(42)
  })

  it('falls back to a valid active business when the saved one is not owned', () => {
    const e = new Engine(initialState())
    e.state.activeBusinessId = 'repair' // never owned
    const restored = deserialize(serialize(e.state))
    expect(restored.activeBusinessId).toBe('lemonade') // the one we start owning
  })
})
