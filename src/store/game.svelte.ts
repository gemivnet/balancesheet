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
import { formatMoney, formatRate, formatInt } from '../engine/num'
import type { ThemeId } from '../engine/types'

let engine = new Engine(load() ?? initialState())

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

export const view = $state({
  cashText: '$0.00',
  incomeText: '$0.00/s',
  lifetimeText: '$0.00',
  clicks: 0,
  abbreviate: false,
  theme: 'mono' as ThemeId,
  activeName: '',
  businesses: [] as BusinessRow[],
  upgrades: [] as UpgradeRow[],
  offline: null as null | { seconds: number; earnedText: string },
})

function snapshot(): void {
  const s = engine.state
  const ab = s.ui.abbreviate
  view.abbreviate = ab
  view.theme = s.ui.theme
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

  view.upgrades = UPGRADE_DEFS.filter((u) => engine.upgradeVisible(u.id) && !s.upgrades[u.id]).map(
    (u): UpgradeRow => ({
      id: u.id,
      name: u.name,
      desc: u.desc,
      cost: formatMoney(u.cost, ab),
      canBuy: s.cash.gte(u.cost),
      kind: u.kind,
    }),
  )
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
    snapshot()
    return true
  } catch {
    return false
  }
}

export function resetGame(): void {
  clearSave()
  engine = new Engine(initialState())
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
