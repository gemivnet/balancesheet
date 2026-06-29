// Svelte bridge between the pure engine and the UI.
//
// The engine owns the authoritative state and runs on a fixed-ish tick via
// requestAnimationFrame. The UI never touches Decimals — it reads `view`, a
// reactive object of pre-formatted strings/primitives rebuilt at ~20Hz. Actions
// (click, buy, hire, …) call the engine and refresh the snapshot.

import { Engine } from '../engine/engine'
import { initialState } from '../engine/state'
import { load, save, hasSave, clearSave, serialize, deserialize } from '../engine/save'
import { applyOffline, MAX_OFFLINE_SECONDS } from '../engine/offline'
import { BUSINESS_DEFS, BUSINESS_BY_ID } from '../engine/businesses'
import { UPGRADE_DEFS } from '../engine/upgrades'
import { D, formatMoney, formatRate, formatInt, formatQty } from '../engine/num'
import { layoutCity, cityTier, densityGlyph, densityName, CIVIC_BY_ID } from '../engine/city'
import { FACILITY_DEFS } from '../engine/facilities'
import { RESOURCE_DEFS, RESOURCE_BY_ID } from '../engine/resources'
import { MAX_ACTIVE } from '../engine/contracts'
import { INSTRUMENT_DEFS } from '../engine/market'
import { BOND_PRODUCTS, BOND_BY_ID, SAVINGS_APR, LOAN_APR } from '../engine/finance'
import { THEMES } from '../theme/themes'
import type { CellKind, PlacedCell, CivicId } from '../engine/city'
import type { Contract, ResourceId, ThemeId } from '../engine/types'

let engine = new Engine(load() ?? initialState())
let lastCitySig = ''

const THEME_ORDER: ThemeId[] = ['mono', 'gray', 'dark', 'amber', 'blue']
const THEME_UNLOCK: Record<ThemeId, string | null> = {
  mono: null,
  gray: 'ui_gray',
  dark: 'ui_dark',
  amber: 'ui_amber',
  blue: 'ui_blue',
}

const SPARK = '▁▂▃▄▅▆▇█'
function sparkline(history: number[]): string {
  if (history.length < 2) return ''
  let min = Infinity
  let max = -Infinity
  for (const v of history) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const range = max - min || 1
  return history
    .map((v) => SPARK[Math.min(SPARK.length - 1, Math.round(((v - min) / range) * (SPARK.length - 1)))])
    .join('')
}

function contractDemand(c: Contract): string {
  return c.items.map((it) => `${it.amount} ${RESOURCE_BY_ID[it.resource].name}`).join(' + ')
}

/** Open floating windows, in z-order (last = top). Not part of the snapshot/save. */
export const uiState = $state({ windows: [] as string[] })

/** Open a window (or bring it to the front if already open). */
export function openMenu(id: string): void {
  const i = uiState.windows.indexOf(id)
  if (i !== -1) uiState.windows.splice(i, 1)
  uiState.windows.push(id)
}

export function closeMenu(id: string): void {
  const i = uiState.windows.indexOf(id)
  if (i !== -1) uiState.windows.splice(i, 1)
}

/** Bring a window to the front. */
export function focusMenu(id: string): void {
  const i = uiState.windows.indexOf(id)
  if (i !== -1 && i !== uiState.windows.length - 1) {
    uiState.windows.splice(i, 1)
    uiState.windows.push(id)
  }
}

export interface BusinessRow {
  id: string
  name: string
  glyph: string
  blurb: string
  owned: number
  ownedText: string
  unlocked: boolean
  active: boolean
  managed: boolean
  incomeText: string
  progress: number
  cost1: string
  canBuy1: boolean
  maxCount: number
  costMax: string
  canBuyMax: boolean
  managerCost: string
  canHire: boolean
  startCost: string
  canStart: boolean
}

export interface UpgradeRow {
  id: string
  name: string
  desc: string
  cost: string
  canBuy: boolean
  kind: string
}

export interface CityCell {
  key: string
  x: number
  y: number
  kind: CellKind
  glyph: string
  label: string
  businessId?: string
  civic?: CivicId
  menu?: string
}

export interface ResourceRow {
  id: string
  name: string
  glyph: string
  amountText: string
  rateText: string
  sellValueText: string
  canSell: boolean
}

export interface ThemeRow {
  id: string
  label: string
  unlocked: boolean
  active: boolean
}

export interface FacilityRow {
  id: string
  name: string
  glyph: string
  blurb: string
  owned: number
  ownedText: string
  unlocked: boolean
  unlockText: string
  recipe: string
  costText: string
  canBuy: boolean
  maxCount: number
  costMaxText: string
  canBuyMax: boolean
}

export interface OfferRow {
  id: number
  glyph: string
  typeText: string
  demandText: string
  rewardText: string
  timeText: string
  canAccept: boolean
}

export interface ActiveRow {
  id: number
  glyph: string
  typeText: string
  demandText: string
  rewardText: string
  remainingText: string
  canDeliver: boolean
}

export interface InstrumentRow {
  id: string
  name: string
  ticker: string
  priceText: string
  changePct: string
  up: boolean
  shares: number
  valueText: string
  spark: string
  canBuy1: boolean
  canBuy10: boolean
  canSellAll: boolean
}

export interface BondProductRow {
  id: string
  name: string
  principalText: string
  yieldText: string
  termText: string
  canBuy: boolean
}

export interface ActiveBondRow {
  id: number
  name: string
  payoutText: string
  remainingText: string
}

export const view = $state({
  cashText: '$0.00',
  incomeText: '$0.00/s',
  lifetimeText: '$0.00',
  clicks: 0,
  abbreviate: false,
  theme: 'mono' as ThemeId,
  cityGrid: false,
  cityIso: false,
  citySeed: 0,
  themes: [] as ThemeRow[],
  activeName: '',
  businesses: [] as BusinessRow[],
  upgrades: [] as UpgradeRow[],
  offline: null as null | { seconds: number; earnedText: string },
  city: {
    tierName: 'Hamlet',
    rentalCount: 0,
    buildingCount: 0,
    rentText: '$0.00/s',
    rentalCostText: '$0.00',
    canBuyRental: false,
    density: 0,
    shopsKey: '',
    densityName: 'Low-density',
    densityCostText: '$0.00',
    canBuyDensity: false,
    atMaxDensity: false,
    rentUpgrades: [] as UpgradeRow[],
    cols: 1,
    cells: [] as CityCell[],
  },
  industry: {
    resources: [] as ResourceRow[],
    facilities: [] as FacilityRow[],
    machines: [] as UpgradeRow[],
    offers: [] as OfferRow[],
    active: [] as ActiveRow[],
  },
  finance: {
    unlocked: false,
    netWorthText: '$0.00',
    savingsText: '$0.00',
    aprText: `${Math.round(SAVINGS_APR * 100)}%/yr`,
    canDeposit: false,
    canWithdraw: false,
    debtText: '$0.00',
    creditAvailText: '$0.00',
    loanAprText: `${Math.round(LOAN_APR * 100)}%/yr`,
    canBorrow: false,
    canRepay: false,
    bonds: [] as ActiveBondRow[],
    products: [] as BondProductRow[],
    stocks: [] as InstrumentRow[],
    fx: [] as InstrumentRow[],
  },
})

function snapshot(): void {
  const s = engine.state
  const ab = s.ui.abbreviate
  view.abbreviate = ab
  view.theme = s.ui.theme
  view.cityGrid = s.ui.cityGrid
  view.cityIso = s.ui.iso
  view.citySeed = s.seed
  view.themes = THEME_ORDER.map((id): ThemeRow => ({
    id,
    label: THEMES[id].label,
    unlocked: THEME_UNLOCK[id] === null || !!s.upgrades[THEME_UNLOCK[id] as string],
    active: s.ui.theme === id,
  }))
  view.cashText = formatMoney(s.cash, ab)
  view.incomeText = formatRate(engine.totalIncomePerSec(), ab)
  view.lifetimeText = formatMoney(s.lifetimeEarnings, ab)
  view.clicks = s.stats.totalClicks
  view.activeName = BUSINESS_BY_ID[s.activeBusinessId]?.name ?? ''

  view.businesses = BUSINESS_DEFS.map((def): BusinessRow => {
    const bs = s.businesses[def.id]
    const unlocked = bs.owned > 0
    const cost1 = engine.unitCost(def.id, 1)
    const maxCount = engine.maxAffordable(def.id)
    const costMax = engine.unitCost(def.id, Math.max(1, maxCount))
    return {
      id: def.id,
      name: def.name,
      glyph: def.glyph,
      blurb: def.blurb,
      owned: bs.owned,
      ownedText: formatInt(bs.owned),
      unlocked,
      active: s.activeBusinessId === def.id,
      managed: bs.managed,
      incomeText: formatRate(engine.businessIncomePerSec(def.id), ab),
      progress: bs.managed ? bs.progress : 0,
      cost1: formatMoney(cost1, ab),
      canBuy1: s.cash.gte(cost1),
      maxCount,
      costMax: formatMoney(costMax, ab),
      canBuyMax: maxCount > 0,
      managerCost: formatMoney(def.managerCost, ab),
      canHire: !bs.managed && unlocked && s.cash.gte(def.managerCost),
      startCost: formatMoney(cost1, ab),
      canStart: s.cash.gte(cost1),
    }
  })

  view.upgrades = UPGRADE_DEFS.filter(
    (u) =>
      u.kind !== 'facilityOutput' &&
      u.kind !== 'propertyRent' &&
      engine.upgradeVisible(u.id) &&
      !s.upgrades[u.id],
  ).map(
    (u): UpgradeRow => ({
      id: u.id,
      name: u.name,
      desc: u.desc,
      cost: formatMoney(u.cost, ab),
      canBuy: s.cash.gte(u.cost),
      kind: u.kind,
    }),
  )

  // --- city / real estate ---
  const total = engine.totalBuildings()
  const tier = cityTier(total)
  view.city.tierName = tier.name
  view.city.buildingCount = total
  view.city.rentalCount = s.rentals
  view.city.density = s.densityLevel
  view.city.rentText = formatRate(engine.rentPerSec(), ab)
  const rentalCost = engine.rentalCost()
  view.city.rentalCostText = formatMoney(rentalCost, ab)
  view.city.canBuyRental = s.cash.gte(rentalCost)

  const densityCost = engine.densityCost()
  view.city.densityName = densityName(s.densityLevel)
  view.city.densityCostText = formatMoney(densityCost, ab)
  view.city.atMaxDensity = engine.atMaxDensity()
  view.city.canBuyDensity = !engine.atMaxDensity() && s.cash.gte(densityCost)
  view.city.rentUpgrades = UPGRADE_DEFS.filter(
    (u) => u.kind === 'propertyRent' && engine.upgradeVisible(u.id) && !s.upgrades[u.id],
  ).map((u): UpgradeRow => ({
    id: u.id,
    name: u.name,
    desc: u.desc,
    cost: formatMoney(u.cost, ab),
    canBuy: s.cash.gte(u.cost),
    kind: u.kind,
  }))

  // Rebuild the (clickable) grid only when its structure actually changes.
  const started = BUSINESS_DEFS.filter((b) => s.businesses[b.id].owned > 0)
  view.city.shopsKey = started.map((b) => b.id).join(',')
  const sig = `${started.map((b) => b.id).join(',')}|${s.rentals}|${tier.index}|${s.densityLevel}`
  if (sig !== lastCitySig) {
    lastCitySig = sig
    const layout = layoutCity({
      startedBusinesses: started.map((b) => ({ id: b.id, glyph: b.glyph, name: b.name })),
      rentals: s.rentals,
      rentalGlyph: densityGlyph(s.densityLevel),
    })
    const byPos = new Map<string, PlacedCell>()
    for (const c of layout.cells) byPos.set(`${c.x},${c.y}`, c)
    const cells: CityCell[] = []
    for (let y = layout.minY; y <= layout.maxY; y++) {
      for (let x = layout.minX; x <= layout.maxX; x++) {
        const key = `${x},${y}`
        const placed = byPos.get(key)
        cells.push(
          placed
            ? {
                key,
                x,
                y,
                kind: placed.kind,
                glyph: placed.glyph,
                label: placed.label,
                businessId: placed.businessId,
                civic: placed.civic,
                menu: placed.civic ? CIVIC_BY_ID[placed.civic].menu : undefined,
              }
            : { key, x, y, kind: 'empty', glyph: '·', label: '' },
        )
      }
    }
    view.city.cols = layout.maxX - layout.minX + 1
    view.city.cells = cells
  }

  // --- industry (resources, facilities, machines, contracts) ---
  view.industry.resources = RESOURCE_DEFS.map((r): ResourceRow => {
    const rate = engine.resourceNetRate(r.id)
    return {
      id: r.id,
      name: r.name,
      glyph: r.glyph,
      amountText: formatQty(s.resources[r.id], ab),
      rateText: (rate.gt(0) ? '+' : '') + formatQty(rate, ab) + '/s',
      sellValueText: formatMoney(D(engine.resourceValue(r.id)), ab),
      canSell: s.resources[r.id].gt(0),
    }
  })

  view.industry.facilities = FACILITY_DEFS.map((def): FacilityRow => {
    const owned = s.facilities[def.id].owned
    const unlocked = engine.facilityUnlocked(def.id) || owned > 0
    const cost1 = engine.facilityCost(def.id, 1)
    const maxCount = engine.maxAffordableFacility(def.id)
    const costMax = engine.facilityCost(def.id, Math.max(1, maxCount))
    const ins = def.inputs.map((i) => `${i.amount} ${RESOURCE_BY_ID[i.resource].name}`).join(' + ')
    const outs = def.outputs.map((o) => `${o.amount} ${RESOURCE_BY_ID[o.resource].name}`).join(' + ')
    return {
      id: def.id,
      name: def.name,
      glyph: def.glyph,
      blurb: def.blurb,
      owned,
      ownedText: formatInt(owned),
      unlocked,
      unlockText: `unlocks at ${formatMoney(def.unlockLifetime, ab)} earned`,
      recipe: (ins ? `${ins} → ` : '→ ') + outs + ' /s',
      costText: formatMoney(cost1, ab),
      canBuy: unlocked && s.cash.gte(cost1),
      maxCount,
      costMaxText: formatMoney(costMax, ab),
      canBuyMax: unlocked && maxCount > 0,
    }
  })

  view.industry.machines = UPGRADE_DEFS.filter(
    (u) => u.kind === 'facilityOutput' && engine.upgradeVisible(u.id) && !s.upgrades[u.id],
  ).map((u): UpgradeRow => ({
    id: u.id,
    name: u.name,
    desc: u.desc,
    cost: formatMoney(u.cost, ab),
    canBuy: s.cash.gte(u.cost),
    kind: u.kind,
  }))

  const board = s.contracts
  view.industry.offers = board.available.map((c): OfferRow => ({
    id: c.id,
    glyph: RESOURCE_BY_ID[c.items[0].resource].glyph,
    typeText: c.type.toUpperCase(),
    demandText: contractDemand(c),
    rewardText: formatMoney(D(c.reward), ab),
    timeText: `${c.timeLimit}s limit`,
    canAccept: board.active.length < MAX_ACTIVE,
  }))
  view.industry.active = board.active.map((c): ActiveRow => ({
    id: c.id,
    glyph: RESOURCE_BY_ID[c.items[0].resource].glyph,
    typeText: c.type.toUpperCase(),
    demandText: contractDemand(c),
    rewardText: formatMoney(D(c.reward), ab),
    remainingText: `${Math.max(0, Math.ceil(c.remaining))}s`,
    canDeliver: engine.canDeliver(c),
  }))

  // --- finance ---
  const f = s.finance
  view.finance.unlocked = engine.financeUnlocked()
  view.finance.netWorthText = formatMoney(engine.netWorth(), ab)
  view.finance.savingsText = formatMoney(f.savings, ab)
  view.finance.canDeposit = s.cash.gt(0)
  view.finance.canWithdraw = f.savings.gt(0)
  view.finance.debtText = formatMoney(f.debt, ab)
  const creditAvail = engine.creditLimit().sub(f.debt)
  view.finance.creditAvailText = formatMoney(creditAvail.gt(0) ? creditAvail : D(0), ab)
  view.finance.canBorrow = creditAvail.gt(0)
  view.finance.canRepay = f.debt.gt(0) && s.cash.gt(0)

  view.finance.products = BOND_PRODUCTS.map((p): BondProductRow => ({
    id: p.id,
    name: p.name,
    principalText: formatMoney(D(p.principal), ab),
    yieldText: `+${Math.round(p.yield * 100)}%`,
    termText: `${p.term}s`,
    canBuy: s.cash.gte(p.principal),
  }))
  view.finance.bonds = f.bonds.map((b): ActiveBondRow => ({
    id: b.id,
    name: BOND_BY_ID[b.productId]?.name ?? 'Bond',
    payoutText: formatMoney(D(b.payout), ab),
    remainingText: `${Math.max(0, Math.ceil(b.remaining))}s`,
  }))

  const stocks: InstrumentRow[] = []
  const fx: InstrumentRow[] = []
  for (const inst of INSTRUMENT_DEFS) {
    const price = f.prices[inst.id]
    const shares = f.holdings[inst.id] ?? 0
    const hist = f.history[inst.id] ?? []
    let changePct = '—'
    let up = true
    if (hist.length >= 2 && hist[0] > 0) {
      const pct = ((price - hist[0]) / hist[0]) * 100
      up = pct >= 0
      changePct = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
    }
    const row: InstrumentRow = {
      id: inst.id,
      name: inst.name,
      ticker: inst.ticker,
      priceText: formatMoney(D(price), ab),
      changePct,
      up,
      shares,
      valueText: formatMoney(D(price).mul(shares), ab),
      spark: sparkline(hist),
      canBuy1: s.cash.gte(price),
      canBuy10: s.cash.gte(price * 10),
      canSellAll: shares > 0,
    }
    if (inst.kind === 'stock') stocks.push(row)
    else fx.push(row)
  }
  view.finance.stocks = stocks
  view.finance.fx = fx
}

// ---- actions -------------------------------------------------------------

/** Work the active business; returns the formatted amount earned (for floaties). */
export function doClick(): string {
  const earned = engine.click()
  snapshot()
  return formatMoney(earned, engine.state.ui.abbreviate)
}

export function buyOne(id: string): void {
  engine.buyUnit(id, 1)
  snapshot()
}

export function buyMax(id: string): void {
  const n = engine.maxAffordable(id)
  if (n > 0) engine.buyUnit(id, n)
  snapshot()
}

export function startBusiness(id: string): void {
  if (engine.buyUnit(id, 1)) engine.state.activeBusinessId = id
  snapshot()
}

export function hire(id: string): void {
  engine.hireManager(id)
  snapshot()
}

export function buyUpgrade(id: string): void {
  engine.buyUpgrade(id)
  snapshot()
}

export function setActive(id: string): void {
  if ((engine.state.businesses[id]?.owned ?? 0) > 0) {
    engine.state.activeBusinessId = id
    snapshot()
  }
}

export function buyRental(): void {
  engine.buyRental()
  snapshot()
}

export function buyDensity(): void {
  engine.buyDensity()
  snapshot()
}

export function sellResource(id: string): void {
  engine.sellResource(id as ResourceId)
  snapshot()
}

export function setTheme(id: string): void {
  const t = id as ThemeId
  const unlock = THEME_UNLOCK[t]
  if (unlock === null || engine.state.upgrades[unlock]) {
    engine.state.ui.theme = t
    snapshot()
  }
}

export function rerollMap(): void {
  engine.state.seed = Math.floor(Math.random() * 1_000_000_000)
  snapshot()
}

export function setSeed(n: number): void {
  if (!Number.isFinite(n)) return
  engine.state.seed = Math.floor(Math.abs(n))
  snapshot()
}

export function buildFacility(id: string): void {
  engine.buyFacility(id, 1)
  snapshot()
}

export function buildFacilityMax(id: string): void {
  const n = engine.maxAffordableFacility(id)
  if (n > 0) engine.buyFacility(id, n)
  snapshot()
}

export function acceptContract(id: number): void {
  engine.acceptContract(id)
  snapshot()
}

export function deliverContract(id: number): void {
  engine.deliverContract(id)
  snapshot()
}

export function declineContract(id: number): void {
  engine.declineContract(id)
  snapshot()
}

export function depositMax(): void {
  engine.depositSavings(engine.state.cash)
  snapshot()
}

export function depositHalf(): void {
  engine.depositSavings(engine.state.cash.div(2))
  snapshot()
}

export function withdrawMax(): void {
  engine.withdrawSavings(engine.state.finance.savings)
  snapshot()
}

export function borrowMax(): void {
  engine.borrow(engine.creditLimit().sub(engine.state.finance.debt))
  snapshot()
}

export function repayMax(): void {
  engine.repay(engine.state.finance.debt)
  snapshot()
}

export function buyBond(id: string): void {
  engine.buyBond(id)
  snapshot()
}

export function buyShares(id: string, qty: number): void {
  engine.buyInstrument(id, qty)
  snapshot()
}

export function sellAll(id: string): void {
  engine.sellInstrument(id, engine.state.finance.holdings[id] ?? 0)
  snapshot()
}

export function dismissOffline(): void {
  view.offline = null
}

// ---- save management -----------------------------------------------------

export function downloadSave(): void {
  save(engine.state)
  const blob = new Blob([serialize(engine.state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ascii-tycoon-${new Date().toISOString().slice(0, 10)}.save.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importSave(raw: string): boolean {
  try {
    engine = new Engine(deserialize(raw))
    save(engine.state)
    lastCitySig = ''
    snapshot()
    return true
  } catch {
    return false
  }
}

export function resetGame(): void {
  clearSave()
  engine = new Engine(initialState())
  lastCitySig = ''
  snapshot()
}

export function hasExistingSave(): boolean {
  return hasSave()
}

// ---- the loop ------------------------------------------------------------

const MAX_DT = 1 // clamp per-frame dt; large gaps are handled by offline/visibility
const SNAP_MS = 50 // ~20Hz UI refresh
const SAVE_MS = 15000
const MIN_BG_CREDIT = 1

let raf = 0
let last = 0
let lastSnap = 0
let lastSave = 0
let hiddenAt = 0
let started = false

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, MAX_DT)
  last = now
  engine.tick(dt)
  engine.tickContracts(dt)
  engine.tickMarkets(dt)
  if (now - lastSnap >= SNAP_MS) {
    snapshot()
    lastSnap = now
  }
  if (now - lastSave >= SAVE_MS) {
    save(engine.state)
    lastSave = now
  }
  raf = requestAnimationFrame(frame)
}

function onVisibility(): void {
  if (document.hidden) {
    hiddenAt = Date.now()
    save(engine.state)
  } else {
    if (hiddenAt) {
      const gap = (Date.now() - hiddenAt) / 1000
      if (gap > MIN_BG_CREDIT) engine.tick(Math.min(gap, MAX_OFFLINE_SECONDS))
      hiddenAt = 0
    }
    last = performance.now()
    snapshot()
  }
}

function onUnload(): void {
  save(engine.state)
}

export function startGame(): void {
  if (started) return
  started = true

  const off = applyOffline(engine)
  if (off) {
    view.offline = {
      seconds: Math.round(off.seconds),
      earnedText: formatMoney(off.earned, engine.state.ui.abbreviate),
    }
  }

  snapshot()
  last = performance.now()
  lastSnap = last
  lastSave = last
  raf = requestAnimationFrame(frame)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('beforeunload', onUnload)
}

export function stopGame(): void {
  if (!started) return
  started = false
  cancelAnimationFrame(raf)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('beforeunload', onUnload)
  save(engine.state)
}
