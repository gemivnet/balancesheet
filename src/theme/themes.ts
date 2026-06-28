// UI theme tiers. The player unlocks these by buying "UI upgrades" — upgrading the
// interface is part of progression. The App applies `theme-<id>` to the root and
// these CSS variables drive the look. Future tiers ('color', then the isometric
// renderer) slot in here.

import type { ThemeId } from '../engine/types'

export interface ThemeMeta {
  id: ThemeId
  label: string
  note: string
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  mono: { id: 'mono', label: 'Monochrome', note: 'Black & white ASCII — where every tycoon starts.' },
  gray: { id: 'gray', label: 'Grayscale', note: 'A touch of gray. The empire is taking shape.' },
}
