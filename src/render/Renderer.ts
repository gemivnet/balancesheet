// Renderer abstraction (seam for later phases).
//
// Today the HUD and (soon) the city are drawn with ASCII-styled Svelte components.
// Phase 5 introduces an isometric "Habbo-style" canvas renderer that implements
// this same interface, so the view can be swapped without touching the engine.
// Keeping the contract here from day one is what makes that a swap, not a rewrite.

import type { GameState } from '../engine/types'

export interface Renderer {
  id: string
  mount(target: HTMLElement): void
  render(state: GameState): void
  destroy(): void
}
