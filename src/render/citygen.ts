// Seeded, deterministic, purely-cosmetic city generation: terrain (rivers + grass
// variation) and per-tile building styling grouped into districts (residential /
// commercial / industrial). The same holdings get a different *look* per seed.
// Pure functions — no DOM — so this could be unit-tested.

export function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Cheap deterministic hash for a tile -> 0..1. */
function hash(seed: number, x: number, y: number): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export type District = 'resi' | 'comm' | 'indu'

const GREENS = ['#86bd62', '#8ec06c', '#97c976', '#7eb65c', '#9ace7f']
const WATERS = ['#5aa9d6', '#62afd9', '#4f9fcf']
const PALETTES: Record<District, string[]> = {
  resi: ['#d9776a', '#cf8a5e', '#c96f5a', '#d49a6a', '#c47a66'],
  comm: ['#6d8aa6', '#5f9bb0', '#7e9cc0', '#6aa3a0', '#86a7c4'],
  indu: ['#8d949b', '#9aa0a6', '#7c828a', '#a6abb0', '#868b91'],
}

export interface CityGen {
  isWater(x: number, y: number): boolean
  groundColor(x: number, y: number): string
  district(x: number, y: number): District
  block(x: number, y: number, density: number): { base: string; h: number; district: District }
  treeAt(x: number, y: number): boolean
}

export function makeCity(seed: number): CityGen {
  const r = mulberry32(seed >>> 0)
  const hasRiver = r() > 0.18
  const phase = r() * Math.PI * 2
  const amp = 2 + r() * 4
  const freq = 0.07 + r() * 0.12
  const off = (r() - 0.5) * 10

  function isWater(x: number, y: number): boolean {
    if (!hasRiver) return false
    const ry = Math.sin(x * freq + phase) * amp + off
    return Math.abs(y - ry) < 1.25
  }
  function groundColor(x: number, y: number): string {
    const h = hash(seed, x, y)
    return isWater(x, y) ? WATERS[(h * WATERS.length) | 0] : GREENS[(h * GREENS.length) | 0]
  }
  function district(x: number, y: number): District {
    const v = hash(seed ^ 0x9e3779b9, Math.floor(x / 5), Math.floor(y / 5))
    return v < 0.4 ? 'resi' : v < 0.72 ? 'comm' : 'indu'
  }
  function block(x: number, y: number, density: number) {
    const d = district(x, y)
    const pal = PALETTES[d]
    const h = hash(seed ^ 0x1234, x, y)
    const base = pal[(h * pal.length) | 0]
    const baseH = d === 'indu' ? 8 : d === 'comm' ? 14 : 11
    return { base, h: baseH + density * 2 + ((h * 8) | 0), district: d }
  }

  function treeAt(x: number, y: number): boolean {
    return hash(seed ^ 0x55, x, y) > 0.74
  }

  return { isWater, groundColor, district, block, treeAt }
}
