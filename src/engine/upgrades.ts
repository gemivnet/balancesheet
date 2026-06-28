// Data-driven upgrades. Most are generated from the business list so the shop
// stays full with very little code — the key to "lots of upgrades, little downtime".
// UI upgrades carry no economic effect; they unlock quality-of-life / theme tiers,
// which is how "upgrading the UI" becomes part of progression.

import { D } from './num'
import { BUSINESS_DEFS } from './businesses'
import type { BusinessDef, UpgradeDef } from './types'

function revenueUpgrades(b: BusinessDef): UpgradeDef[] {
  const thresholds = [10, 25, 50, 100, 200]
  return thresholds.map((t, i) => ({
    id: `${b.id}_rev_${t}`,
    name: `${b.name} · upgrade ${i + 1}`,
    desc: `Double ${b.name} revenue`,
    cost: b.baseCost.mul(Math.pow(b.costGrowth, t)).mul(t * 2),
    kind: 'businessRevenue',
    factor: 2,
    target: b.id,
    requires: { business: b.id, owned: t },
  }))
}

function speedUpgrades(b: BusinessDef): UpgradeDef[] {
  const thresholds = [30, 120]
  return thresholds.map((t, i) => ({
    id: `${b.id}_spd_${t}`,
    name: `${b.name} · efficiency ${i + 1}`,
    desc: `Double ${b.name} work speed`,
    cost: b.baseCost.mul(Math.pow(b.costGrowth, t)).mul(t * 8),
    kind: 'businessSpeed',
    factor: 2,
    target: b.id,
    requires: { business: b.id, owned: t },
  }))
}

const CLICK_UPGRADES: UpgradeDef[] = [
  { id: 'click_2', name: 'Roll Up Sleeves', desc: 'Double manual work output', cost: D(150), kind: 'clickPower', factor: 2 },
  { id: 'click_3', name: 'Hustle Mindset', desc: 'Triple manual work output', cost: D(5000), kind: 'clickPower', factor: 3 },
  { id: 'click_4', name: 'Caffeine Drip', desc: 'Triple manual work output', cost: D(120000), kind: 'clickPower', factor: 3 },
]

const GLOBAL_UPGRADES: UpgradeDef[] = [
  { id: 'global_2', name: 'Business Cards', desc: 'Double ALL revenue', cost: D(25000), kind: 'globalRevenue', factor: 2, requires: { business: 'coffee', owned: 10 } },
  { id: 'global_3', name: 'Local Ad Spots', desc: 'Double ALL revenue', cost: D(750000), kind: 'globalRevenue', factor: 2, requires: { business: 'repair', owned: 10 } },
]

/** UI upgrades — the player literally buys a better interface. */
export const UI_UPGRADES: UpgradeDef[] = [
  { id: 'ui_abbrev', name: 'Hire an Accountant', desc: 'Abbreviate big numbers (1.2K, 3.4M…)', cost: D(2000), kind: 'ui', factor: 1, ui: { type: 'abbreviate' } },
  { id: 'ui_gray', name: 'Interior Decorator', desc: 'Upgrade the UI to a grayscale theme', cost: D(50000), kind: 'ui', factor: 1, ui: { type: 'theme', theme: 'gray' } },
]

export const UPGRADE_DEFS: UpgradeDef[] = [
  ...BUSINESS_DEFS.flatMap((b) => [...revenueUpgrades(b), ...speedUpgrades(b)]),
  ...CLICK_UPGRADES,
  ...GLOBAL_UPGRADES,
  ...UI_UPGRADES,
]

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADE_DEFS.map((u) => [u.id, u]),
)
