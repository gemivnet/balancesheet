// Big-number helpers + formatters. Money/resources use break_infinity's Decimal
// from day one so the game never caps out. The formatter shows realistic
// currency early; the abbreviated (1.2K / 3.4M) style is unlocked as a "UI upgrade".

import Decimal from 'break_infinity.js'

export type Num = number | string | Decimal

/** Shorthand for `new Decimal(x)`. */
export const D = (x: Num = 0): Decimal => new Decimal(x)

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

/** Format a money amount, e.g. `$1,234.56` or (abbreviated) `$4.56M`. */
export function formatMoney(value: Decimal, abbreviate: boolean): string {
  const negative = value.lt(0)
  const d = negative ? value.abs() : value
  return (negative ? '-' : '') + '$' + formatAmount(d, abbreviate)
}

/** Format a per-second rate, e.g. `$12.00/s`. */
export function formatRate(value: Decimal, abbreviate: boolean): string {
  return formatMoney(value, abbreviate) + '/s'
}

function formatAmount(d: Decimal, abbreviate: boolean): string {
  if (d.lt(1000)) {
    // Small amounts always show cents: 4 -> "4.00".
    return d.toNumber().toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  const exp = Math.floor(d.log10())
  if (!abbreviate) {
    // Grounded display: grouped integers up to 1e15, scientific beyond.
    if (exp < 15) return Math.floor(d.toNumber()).toLocaleString('en-US')
    return toSci(d, exp)
  }
  const tier = Math.floor(exp / 3)
  if (tier > 0 && tier < SUFFIXES.length) {
    const scaled = d.div(new Decimal(10).pow(tier * 3)).toNumber()
    return scaled.toFixed(2) + SUFFIXES[tier]
  }
  if (tier <= 0) return d.toNumber().toLocaleString('en-US', { maximumFractionDigits: 0 })
  return toSci(d, exp)
}

function toSci(d: Decimal, exp: number): string {
  const mantissa = d.div(new Decimal(10).pow(exp)).toNumber()
  return mantissa.toFixed(2) + 'e' + exp
}

/** Format an integer count (e.g. units owned). */
export function formatInt(n: number): string {
  return Math.floor(n).toLocaleString('en-US')
}
