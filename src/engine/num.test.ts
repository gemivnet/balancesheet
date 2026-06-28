import { describe, it, expect } from 'vitest'
import { D, formatMoney, formatRate, formatInt } from './num'

describe('formatMoney', () => {
  it('shows cents for small amounts', () => {
    expect(formatMoney(D(0), false)).toBe('$0.00')
    expect(formatMoney(D(4), false)).toBe('$4.00')
    expect(formatMoney(D(4.28), false)).toBe('$4.28')
  })

  it('groups thousands when not abbreviating', () => {
    expect(formatMoney(D(1234), false)).toBe('$1,234')
    expect(formatMoney(D(1234567), false)).toBe('$1,234,567')
  })

  it('abbreviates with suffixes when enabled', () => {
    expect(formatMoney(D(1234), true)).toBe('$1.23K')
    expect(formatMoney(D(1234567), true)).toBe('$1.23M')
    expect(formatMoney(D('1e12'), true)).toBe('$1.00T')
  })

  it('falls back to scientific for very large numbers', () => {
    const s = formatMoney(D('1e40'), true)
    expect(s.startsWith('$')).toBe(true)
    expect(s).toContain('e')
  })
})

describe('formatRate / formatInt', () => {
  it('adds a per-second suffix', () => {
    expect(formatRate(D(12), false)).toBe('$12.00/s')
  })

  it('formats integer counts with grouping', () => {
    expect(formatInt(1500)).toBe('1,500')
  })
})
