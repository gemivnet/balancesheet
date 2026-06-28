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
import { REAL_ESTATE, cityTier } from './city'
import { FACILITY_DEFS, FACILITY_BY_ID } from './facilities'
import { generateContract, MAX_AVAILABLE, MAX_ACTIVE, CONTRACT_REFRESH } from './contracts'
import type { BusinessId, Contract, GameState, Mults, ResourceId, UpgradeId } from './types'

export function computeMults(state: GameState): Mults {
  const byBusiness: Mults['byBusiness'] = {}
  for (const b of BUSINESS_DEFS) byBusiness[b.id] = { revenue: D(1), speed: 1 }
  const byFacility: Mults['byFacility'] = {}
  for (const f of FACILITY_DEFS) byFacility[f.id] = { output: D(1) }
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
      case 'facilityOutput':
        if (u.target) byFacility[u.target].output = byFacility[u.target].output.mul(u.factor)
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
  return { global, click, byBusiness, byFacility }
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
    let sum = this.rentPerSec()
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
    // Rental income accrues continuously (no manager needed), offline too.
    const rent = this.rentPerSec()
    if (rent.gt(0)) this.earn(rent.mul(dt))

    this.tickProduction(dt)
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

  // --- real estate -------------------------------------------------------

  /** Businesses you've started + rental properties — drives the city tier. */
  totalBuildings(): number {
    let started = 0
    for (const b of BUSINESS_DEFS) if (this.state.businesses[b.id].owned > 0) started++
    return started + this.state.rentals
  }

  rentalCost(): Decimal {
    return REAL_ESTATE.baseLotCost.mul(new Decimal(REAL_ESTATE.costGrowth).pow(this.state.rentals))
  }

  /** Passive rent per second across all properties (scaled by city tier). */
  rentPerSec(): Decimal {
    const tier = cityTier(this.totalBuildings())
    return REAL_ESTATE.baseRent.mul(this.state.rentals).mul(tier.rentMult)
  }

  buyRental(): boolean {
    const cost = this.rentalCost()
    if (this.state.cash.lt(cost)) return false
    this.state.cash = this.state.cash.sub(cost)
    this.state.rentals++
    return true
  }

  // --- production (facilities & resources) -------------------------------

  facilityUnlocked(id: string): boolean {
    return this.state.lifetimeEarnings.gte(FACILITY_BY_ID[id].unlockLifetime)
  }

  facilityCost(id: string, count: number): Decimal {
    const def = FACILITY_BY_ID[id]
    const owned = this.state.facilities[id].owned
    const g = def.costGrowth
    return def.baseCost
      .mul(new Decimal(g).pow(owned))
      .mul(new Decimal(g).pow(count).sub(1).div(g - 1))
  }

  maxAffordableFacility(id: string): number {
    const def = FACILITY_BY_ID[id]
    const owned = this.state.facilities[id].owned
    const g = def.costGrowth
    const denom = def.baseCost.mul(new Decimal(g).pow(owned))
    if (denom.lte(0)) return 0
    const rhs = this.state.cash.mul(g - 1).div(denom).add(1)
    if (rhs.lte(1)) return 0
    let n = Math.max(0, Math.floor(rhs.log10() / Math.log10(g)))
    while (n > 0 && this.facilityCost(id, n).gt(this.state.cash)) n--
    return n
  }

  buyFacility(id: string, count: number): boolean {
    if (count <= 0) return false
    const cost = this.facilityCost(id, count)
    if (this.state.cash.lt(cost)) return false
    this.state.cash = this.state.cash.sub(cost)
    this.state.facilities[id].owned += count
    return true
  }

  /** Nominal net production per second for a resource (ignores shortages). */
  resourceNetRate(resource: ResourceId): Decimal {
    let rate = D(0)
    for (const def of FACILITY_DEFS) {
      const owned = this.state.facilities[def.id].owned
      if (owned <= 0) continue
      const outMult = this.mults.byFacility[def.id].output
      for (const o of def.outputs) {
        if (o.resource === resource) rate = rate.add(outMult.mul(o.amount * owned))
      }
      for (const i of def.inputs) {
        if (i.resource === resource) rate = rate.sub(i.amount * owned)
      }
    }
    return rate
  }

  private tickProduction(dt: number): void {
    for (const def of FACILITY_DEFS) {
      const owned = this.state.facilities[def.id].owned
      if (owned <= 0) continue
      // Throttle by the scarcest input — a factory with no materials idles.
      let throttle = 1
      for (const inp of def.inputs) {
        const required = inp.amount * owned * dt
        if (required > 0) {
          const ratio = this.state.resources[inp.resource].div(required).toNumber()
          if (ratio < throttle) throttle = ratio
        }
      }
      if (throttle <= 0) continue
      if (throttle > 1) throttle = 1
      for (const inp of def.inputs) {
        const used = inp.amount * owned * dt * throttle
        this.state.resources[inp.resource] = this.state.resources[inp.resource].sub(used)
      }
      const outMult = this.mults.byFacility[def.id].output
      for (const out of def.outputs) {
        const made = out.amount * owned * dt * throttle
        this.state.resources[out.resource] = this.state.resources[out.resource].add(outMult.mul(made))
      }
    }
  }

  // --- contracts ---------------------------------------------------------

  canDeliver(c: Contract): boolean {
    return this.state.resources[c.resource].gte(c.amount)
  }

  acceptContract(id: number): boolean {
    const board = this.state.contracts
    if (board.active.length >= MAX_ACTIVE) return false
    const idx = board.available.findIndex((c) => c.id === id)
    if (idx < 0) return false
    const [c] = board.available.splice(idx, 1)
    c.remaining = c.timeLimit
    board.active.push(c)
    return true
  }

  declineContract(id: number): boolean {
    const board = this.state.contracts
    const idx = board.available.findIndex((c) => c.id === id)
    if (idx < 0) return false
    board.available.splice(idx, 1)
    return true
  }

  deliverContract(id: number): boolean {
    const board = this.state.contracts
    const idx = board.active.findIndex((c) => c.id === id)
    if (idx < 0) return false
    const c = board.active[idx]
    if (!this.canDeliver(c)) return false
    this.state.resources[c.resource] = this.state.resources[c.resource].sub(c.amount)
    this.earn(D(c.reward))
    board.active.splice(idx, 1)
    return true
  }

  /** Online-only: count down accepted contracts and refresh the offer board. */
  tickContracts(dt: number): void {
    const board = this.state.contracts
    for (let i = board.active.length - 1; i >= 0; i--) {
      board.active[i].remaining -= dt
      if (board.active[i].remaining <= 0) board.active.splice(i, 1)
    }
    board.refreshTimer -= dt
    if (board.refreshTimer <= 0) {
      if (board.available.length < MAX_AVAILABLE) {
        board.available.push(generateContract(board.nextId++))
      }
      board.refreshTimer = CONTRACT_REFRESH
    }
  }

  upgradeVisible(id: UpgradeId): boolean {
    const u = UPGRADE_BY_ID[id]
    if (!u) return false
    if (u.requires) {
      const bs = this.state.businesses[u.requires.business]
      if (!bs || bs.owned < u.requires.owned) return false
    }
    if (u.requiresFacility) {
      const fs = this.state.facilities[u.requiresFacility.facility]
      if (!fs || fs.owned < u.requiresFacility.owned) return false
    }
    return true
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
