// The simulation engine. Pure logic over a GameState — deterministic and testable.
//
// Model: each business runs work-cycles. Clicking the *active* business instantly
// completes one cycle (manual income, always productive). Hiring a manager makes a
// business run cycles automatically over time (idle income). Upgrades fold into a
// cached `Mults` object, recomputed only when an upgrade is purchased.

import Decimal from 'break_infinity.js'
import { D } from './num'
import { BUSINESS_DEFS, BUSINESS_BY_ID } from './businesses'
import { UPGRADE_BY_ID } from './upgrades'
import type { BusinessId, GameState, Mults, UpgradeId } from './types'

export function computeMults(state: GameState): Mults {
  const byBusiness: Mults['byBusiness'] = {}
  for (const b of BUSINESS_DEFS) byBusiness[b.id] = { revenue: D(1), speed: 1 }
  let global = D(1)
  let click = D(1)
  for (const id in state.upgrades) {
    const u = UPGRADE_BY_ID[id]
    if (!u) continue
    switch (u.kind) {
      case 'businessRevenue':
        if (u.target) byBusiness[u.target].revenue = byBusiness[u.target].revenue.mul(u.factor)
        break
      case 'businessSpeed':
        if (u.target) byBusiness[u.target].speed *= u.factor
        break
      case 'globalRevenue':
        global = global.mul(u.factor)
        break
      case 'clickPower':
        click = click.mul(u.factor)
        break
      case 'ui':
        break
    }
  }
  return { global, click, byBusiness }
}

export class Engine {
  state: GameState
  mults: Mults

  constructor(state: GameState) {
    this.state = state
    this.mults = computeMults(state)
  }

  /** Recompute derived multipliers (call after any upgrade purchase). */
  recompute(): void {
    this.mults = computeMults(this.state)
  }

  /** Revenue for one completed work-cycle of a business (all its units). */
  cycleRevenue(id: BusinessId): Decimal {
    const def = BUSINESS_BY_ID[id]
    const bs = this.state.businesses[id]
    if (!def || !bs || bs.owned <= 0) return D(0)
    return def.baseRevenue.mul(bs.owned).mul(this.mults.byBusiness[id].revenue).mul(this.mults.global)
  }

  effectiveCycleTime(id: BusinessId): number {
    return BUSINESS_BY_ID[id].cycleTime / this.mults.byBusiness[id].speed
  }

  /** Passive income per second from a managed business (0 if not automated). */
  businessIncomePerSec(id: BusinessId): Decimal {
    const bs = this.state.businesses[id]
    if (!bs || !bs.managed || bs.owned <= 0) return D(0)
    return this.cycleRevenue(id).div(this.effectiveCycleTime(id))
  }

  totalIncomePerSec(): Decimal {
    let sum = D(0)
    for (const b of BUSINESS_DEFS) sum = sum.add(this.businessIncomePerSec(b.id))
    return sum
  }

  /** Manually work the active business: complete one cycle instantly. */
  click(): Decimal {
    const earn = this.cycleRevenue(this.state.activeBusinessId).mul(this.mults.click)
    if (earn.gt(0)) this.earn(earn)
    this.state.stats.totalClicks++
    return earn
  }

  private earn(amount: Decimal): void {
    this.state.cash = this.state.cash.add(amount)
    this.state.lifetimeEarnings = this.state.lifetimeEarnings.add(amount)
  }

  /** Advance managed businesses by `dt` seconds, awarding completed cycles. */
  tick(dt: number): void {
    if (dt <= 0) return
    for (const def of BUSINESS_DEFS) {
      const bs = this.state.businesses[def.id]
      if (!bs.managed || bs.owned <= 0) continue
      const advanced = bs.progress + dt / this.effectiveCycleTime(def.id)
      const whole = Math.floor(advanced)
      bs.progress = advanced - whole
      if (whole > 0) this.earn(this.cycleRevenue(def.id).mul(whole))
    }
  }

  /** Cost to buy `count` more units of a business (geometric series). */
  unitCost(id: BusinessId, count: number): Decimal {
    const def = BUSINESS_BY_ID[id]
    const owned = this.state.businesses[id].owned
    const g = def.costGrowth
    const gPowOwned = new Decimal(g).pow(owned)
    const seriesFactor = new Decimal(g).pow(count).sub(1).div(g - 1)
    return def.baseCost.mul(gPowOwned).mul(seriesFactor)
  }

  /** Largest number of units currently affordable. */
  maxAffordable(id: BusinessId): number {
    const def = BUSINESS_BY_ID[id]
    const owned = this.state.businesses[id].owned
    const g = def.costGrowth
    const denom = def.baseCost.mul(new Decimal(g).pow(owned))
    if (denom.lte(0)) return 0
    // Solve cash >= denom * (g^n - 1)/(g - 1)  =>  g^n <= 1 + cash*(g-1)/denom
    const rhs = this.state.cash.mul(g - 1).div(denom).add(1)
    if (rhs.lte(1)) return 0
    let n = Math.max(0, Math.floor(rhs.log10() / Math.log10(g)))
    // Correct any floating-point overshoot.
    while (n > 0 && this.unitCost(id, n).gt(this.state.cash)) n--
    return n
  }

  buyUnit(id: BusinessId, count: number): boolean {
    if (count <= 0) return false
    const cost = this.unitCost(id, count)
    if (this.state.cash.lt(cost)) return false
    this.state.cash = this.state.cash.sub(cost)
    this.state.businesses[id].owned += count
    return true
  }

  hireManager(id: BusinessId): boolean {
    const bs = this.state.businesses[id]
    const def = BUSINESS_BY_ID[id]
    if (!bs || bs.managed || bs.owned <= 0) return false
    if (this.state.cash.lt(def.managerCost)) return false
    this.state.cash = this.state.cash.sub(def.managerCost)
    bs.managed = true
    return true
  }

  upgradeVisible(id: UpgradeId): boolean {
    const u = UPGRADE_BY_ID[id]
    if (!u) return false
    if (!u.requires) return true
    const bs = this.state.businesses[u.requires.business]
    return !!bs && bs.owned >= u.requires.owned
  }

  buyUpgrade(id: UpgradeId): boolean {
    if (this.state.upgrades[id]) return false
    const u = UPGRADE_BY_ID[id]
    if (!u || !this.upgradeVisible(id)) return false
    if (this.state.cash.lt(u.cost)) return false
    this.state.cash = this.state.cash.sub(u.cost)
    this.state.upgrades[id] = true
    if (u.kind === 'ui' && u.ui) {
      if (u.ui.type === 'abbreviate') this.state.ui.abbreviate = true
      else if (u.ui.type === 'theme') this.state.ui.theme = u.ui.theme
    }
    this.recompute()
    return true
  }
}
