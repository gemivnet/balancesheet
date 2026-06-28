// Data-driven upgrades. Most are generated from the business list so the shop
// stays full with very little code — the key to "lots of upgrades, little downtime".
// UI upgrades carry no economic effect; they unlock quality-of-life / theme tiers,
// which is how "upgrading the UI" becomes part of progression.

import { D } from './num'
import { BUSINESS_DEFS } from './businesses'
import { FACILITY_DEFS } from './facilities'
import type { BusinessDef, FacilityDef, UpgradeDef } from './types'

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

function machineUpgrades(f: FacilityDef): UpgradeDef[] {
  const thresholds = [5, 20]
  return thresholds.map((t, i) => ({
    id: `${f.id}_mach_${t}`,
    name: `${f.name} · machines ${i + 1}`,
    desc: `Double ${f.name} output`,
    cost: f.baseCost.mul(Math.pow(f.costGrowth, t)).mul(t * 3),
    kind: 'facilityOutput',
    factor: 2,
    target: f.id,
    requiresFacility: { facility: f.id, owned: t },
  }))
}

const CLICK_UPGRADES: UpgradeDef[] = [
  { id: 'click_1', name: 'Sharper Focus', desc: 'Double manual work output', cost: D(40), kind: 'clickPower', factor: 2 },
  { id: 'click_2', name: 'Roll Up Sleeves', desc: 'Double manual work output', cost: D(300), kind: 'clickPower', factor: 2 },
  { id: 'click_3', name: 'Hustle Mindset', desc: 'Triple manual work output', cost: D(5000), kind: 'clickPower', factor: 3 },
  { id: 'click_4', name: 'Caffeine Drip', desc: 'Triple manual work output', cost: D(120000), kind: 'clickPower', factor: 3 },
  { id: 'click_5', name: 'Power Tools', desc: 'Triple manual work output', cost: D(3e6), kind: 'clickPower', factor: 3 },
  { id: 'click_6', name: 'Assembly-Line Hands', desc: 'Quadruple manual work output', cost: D(8e7), kind: 'clickPower', factor: 4 },
  { id: 'click_7', name: 'Robotic Exosuit', desc: 'Quadruple manual work output', cost: D(2e9), kind: 'clickPower', factor: 4 },
  { id: 'click_8', name: 'Overdrive', desc: 'Quintuple manual work output', cost: D(5e10), kind: 'clickPower', factor: 5 },
]

const GLOBAL_UPGRADES: UpgradeDef[] = [
  { id: 'global_2', name: 'Business Cards', desc: 'Double ALL revenue', cost: D(25000), kind: 'globalRevenue', factor: 2, requires: { business: 'coffee', owned: 10 } },
  { id: 'global_3', name: 'Local Ad Spots', desc: 'Double ALL revenue', cost: D(750000), kind: 'globalRevenue', factor: 2, requires: { business: 'repair', owned: 10 } },
]

/** Ways to grow rental income beyond just buying more properties. */
const RENT_UPGRADES: UpgradeDef[] = [
  { id: 'rent_2', name: 'Property Management', desc: 'Double rental income', cost: D(8000), kind: 'propertyRent', factor: 2, requiresRentals: 3 },
  { id: 'rent_3', name: 'Renovations', desc: 'Double rental income', cost: D(80000), kind: 'propertyRent', factor: 2, requiresRentals: 10 },
  { id: 'rent_4', name: 'Prime Locations', desc: 'Triple rental income', cost: D(1.2e6), kind: 'propertyRent', factor: 3, requiresRentals: 25 },
  { id: 'rent_5', name: 'Luxury Developments', desc: 'Triple rental income', cost: D(2.5e7), kind: 'propertyRent', factor: 3, requiresRentals: 50 },
]

/** UI upgrades — the player literally buys a better interface. */
export const UI_UPGRADES: UpgradeDef[] = [
  { id: 'ui_abbrev', name: 'Hire an Accountant', desc: 'Abbreviate big numbers (1.2K, 3.4M…)', cost: D(2000), kind: 'ui', factor: 1, ui: { type: 'abbreviate' } },
  { id: 'ui_dark', name: 'Neon Sign', desc: 'Upgrade the UI: dark terminal theme', cost: D(8000), kind: 'ui', factor: 1, ui: { type: 'theme', theme: 'dark' } },
  { id: 'ui_grid', name: 'City Planner', desc: 'Show street gridlines on the city map', cost: D(30000), kind: 'ui', factor: 1, ui: { type: 'flag', flag: 'cityGrid' } },
  { id: 'ui_gray', name: 'Interior Decorator', desc: 'Upgrade the UI: grayscale theme', cost: D(50000), kind: 'ui', factor: 1, ui: { type: 'theme', theme: 'gray' } },
  { id: 'ui_amber', name: 'Amber Monitor', desc: 'Upgrade the UI: warm amber theme', cost: D(200000), kind: 'ui', factor: 1, ui: { type: 'theme', theme: 'amber' } },
  { id: 'ui_blue', name: 'Blueprint', desc: 'Upgrade the UI: blueprint theme', cost: D(2e6), kind: 'ui', factor: 1, ui: { type: 'theme', theme: 'blue' } },
]

export const UPGRADE_DEFS: UpgradeDef[] = [
  ...BUSINESS_DEFS.flatMap((b) => [...revenueUpgrades(b), ...speedUpgrades(b)]),
  ...FACILITY_DEFS.flatMap(machineUpgrades),
  ...CLICK_UPGRADES,
  ...RENT_UPGRADES,
  ...GLOBAL_UPGRADES,
  ...UI_UPGRADES,
]

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADE_DEFS.map((u) => [u.id, u]),
)
