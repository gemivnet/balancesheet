// Offline progress: when the game reopens, credit time that managers spent working
// while away. Capped (and only managed businesses earn, since clicking needs you
// present) to keep it realistic rather than a jackpot.

import type Decimal from 'break_infinity.js'
import type { Engine } from './engine'

export const MAX_OFFLINE_SECONDS = 8 * 3600 // 8 hours

export interface OfflineResult {
  seconds: number
  earned: Decimal
}

/**
 * Apply offline earnings based on how long since the state was last saved.
 * Returns null for negligible gaps or when nothing was earned.
 */
export function applyOffline(engine: Engine, now: number = Date.now()): OfflineResult | null {
  const elapsed = (now - engine.state.lastSaved) / 1000
  if (!isFinite(elapsed) || elapsed < 30) return null
  const seconds = Math.min(elapsed, MAX_OFFLINE_SECONDS)
  const before = engine.state.cash
  engine.tick(seconds)
  const earned = engine.state.cash.sub(before)
  if (earned.lte(0)) return null
  return { seconds, earned }
}
