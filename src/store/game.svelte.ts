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
import { layoutCity, cityTier, densityGlyph, densityName } from '../engine/city'
import { FACILITY_DEFS } from '../engine/facilities'
import { RESOURCE_DEFS, RESOURCE_BY_ID } from '../engine/resources'
import { MAX_ACTIVE } from '../engine/contracts'
import { THEMES } from '../theme/themes'
import type { CellKind, PlacedCell } from '../engine/city'
import type { ResourceId, ThemeId } from '../engine/types'

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
  kind: CellKind
  glyph: string
  label: string
  businessId?: string
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
  demandText: string
  rewardText: string
  timeText: string
  canAccept: boolean
}

export interface ActiveRow {
  id: number
  glyph: string
  demandText: string
  rewardText: string
  remainingText: string
  canDeliver: boolean
}

export const view = $state({
  cashText: '$0.00',
  incomeText: '$0.00/s',
  lifetimeText: '$0.00',
  clicks: 0,
  abbreviate: false,
  theme: 'mono' as ThemeId,
  cityGrid: false,
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
})

function snapshot(): void {
  const s = engine.state
  const ab = s.ui.abbreviate
  view.abbreviate = ab
  view.theme = s.ui.theme
  view.cityGrid = s.ui.cityGrid
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
            ? { key, kind: placed.kind, glyph: placed.glyph, label: placed.label, businessId: placed.businessId }
            : { key, kind: 'empty', glyph: '·', label: '' },
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
    glyph: RESOURCE_BY_ID[c.resource].glyph,
    demandText: `${c.amount} ${RESOURCE_BY_ID[c.resource].name}`,
    rewardText: formatMoney(D(c.reward), ab),
    timeText: `${c.timeLimit}s limit`,
    canAccept: board.active.length < MAX_ACTIVE,
  }))
  view.industry.active = board.active.map((c): ActiveRow => ({
    id: c.id,
    glyph: RESOURCE_BY_ID[c.resource].glyph,
    demandText: `${c.amount} ${RESOURCE_BY_ID[c.resource].name}`,
    rewardText: formatMoney(D(c.reward), ab),
    remainingText: `${Math.max(0, Math.ceil(c.remaining))}s`,
    canDeliver: engine.canDeliver(c),
  }))
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
