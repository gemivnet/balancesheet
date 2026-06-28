// Tradeable instruments (stocks + FX) and the price simulation. Prices follow a
// geometric random walk with a little drift and per-instrument volatility. Prices
// only move while you're playing (the store ticks them), so you never come back to
// a surprise wipe-out.

import type { InstrumentDef } from './types'

export const INSTRUMENT_DEFS: InstrumentDef[] = [
  // stocks
  { id: 'acme', name: 'Acme Robotics', ticker: 'ACME', kind: 'stock', start: 50, drift: 0.00025, vol: 0.012, min: 1 },
  { id: 'byte', name: 'ByteWorks', ticker: 'BYTE', kind: 'stock', start: 120, drift: 0.0003, vol: 0.018, min: 1 },
  { id: 'grin', name: 'Grindstone Co', ticker: 'GRIN', kind: 'stock', start: 28, drift: 0.0002, vol: 0.022, min: 1 },
  { id: 'zen', name: 'Zenith Energy', ticker: 'ZEN', kind: 'stock', start: 210, drift: 0.00015, vol: 0.01, min: 1 },
  // fx pairs (priced per unit)
  { id: 'eur', name: 'EUR / USD', ticker: 'EURUSD', kind: 'fx', start: 1.08, drift: 0, vol: 0.004, min: 0.5 },
  { id: 'gbp', name: 'GBP / USD', ticker: 'GBPUSD', kind: 'fx', start: 1.27, drift: 0, vol: 0.005, min: 0.5 },
  { id: 'jpy', name: 'USD / JPY', ticker: 'USDJPY', kind: 'fx', start: 150, drift: 0, vol: 0.004, min: 50 },
]

export const INSTRUMENT_BY_ID: Record<string, InstrumentDef> = Object.fromEntries(
  INSTRUMENT_DEFS.map((i) => [i.id, i]),
)

export const HISTORY_LEN = 32
export const MARKET_SAMPLE = 1 // seconds between sparkline samples

/** Standard normal sample (Box–Muller). */
export function gauss(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Advance one instrument's price by `dt` seconds. */
export function nextPrice(def: InstrumentDef, price: number, dt: number): number {
  const moved = price * (1 + def.drift * dt + def.vol * Math.sqrt(dt) * gauss())
  return Math.max(def.min, moved)
}
