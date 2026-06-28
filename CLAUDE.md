# ASCII Tycoon — guide for Claude Code

An entrepreneur clicker/idle game in the browser. It starts as black-and-white
ASCII and is meant to **grow over time** — both the empire *and* the interface
(buying "UI upgrades" is part of the game). **This project is meant to be changed
over time by its owner working with you (Claude Code).** Explain changes in plain
language and make small, safe additions.

No personal data lives here — it's a game — so the repo is fine to make public.

## The one rule that keeps everything clean

**The engine is pure TypeScript; the UI only reads snapshots.**

- `src/engine/**` must never import Svelte or touch the DOM (`window`, `document`,
  `localStorage`, `requestAnimationFrame`). It's the deterministic "brain" and it's
  unit-tested. Browser-only code lives in `src/store/game.svelte.ts` and `src/ui/`.
- The UI never holds game logic or `Decimal`s. It reads `view` (a reactive object
  of pre-formatted strings) from the store and calls actions (`doClick`, `buyOne`,
  `hire`, `buyUpgrade`, …).

Keeping this separation is what lets the ASCII view become an isometric "Habbo"
city later as a **swap, not a rewrite** (see `src/render/Renderer.ts`).

## Map

```
src/
  engine/
    types.ts        all the core types
    num.ts          Decimal helper D() + money formatters
    businesses.ts   << add a business here (data only)
    upgrades.ts     << add an upgrade here (data only)
    state.ts        initial state + SAVE_VERSION
    engine.ts       the simulation: tick(), click(), buyUnit(), hireManager(), buyRental(), buyUpgrade()
    city.ts         city layout (spiral) + real-estate config & tiers
    save.ts         serialize/deserialize + localStorage wrappers
    offline.ts      "while you were away" earnings
    *.test.ts       Vitest unit tests
  store/game.svelte.ts   tick loop + the reactive `view` snapshot + all actions
  ui/             one Svelte component per piece of the screen
  render/         renderer seam for the future isometric city
  theme/          UI theme tiers
```

## How to add content (the common case)

**A new business:** add one entry to `BUSINESS_DEFS` in `engine/businesses.ts`
(`id`, `name`, `glyph`, costs, `baseRevenue`, `cycleTime`, `managerCost`). That's
it — it appears in the UI, gets buy/hire buttons, and a full set of revenue/speed
upgrades is auto-generated for it in `upgrades.ts`. Use a stable, unique `id`
(it's the save key).

**A new upgrade:** add to `CLICK_UPGRADES`, `GLOBAL_UPGRADES`, or `UI_UPGRADES` in
`engine/upgrades.ts`. Pick a stable `id`. `requires` gates when it appears.

**A new UI upgrade / theme tier:** add a `ThemeId` in `types.ts`, a `.theme-<id>`
block in `app.css`, an entry in `theme/themes.ts`, and a `kind: 'ui'` upgrade with
`ui: { type: 'theme', theme: '<id>' }`. The App applies `theme-<id>` to the root.

## Saves — don't break them

- Decimals are stored as strings; the rest is plain JSON (`engine/save.ts`).
- `deserialize()` merges saved data **onto a fresh `initialState()`**, so adding
  new businesses/upgrades is automatically backward-compatible — old saves just
  default the new things in. **Adding content never needs a version bump.**
- Never repurpose the meaning of an existing saved field. If you must change the
  save *shape*, bump `SAVE_VERSION` in `state.ts` and migrate inside
  `deserialize()`.

## Numbers

- All money/resources are `Decimal` (break_infinity.js). Build them with `D(...)`
  from `engine/num.ts`; never use a raw JS `number` for cash.
- Display via `formatMoney` / `formatRate`. The abbreviated `1.2K / 3.4M` style is
  gated behind the `ui.abbreviate` flag (the "Hire an Accountant" upgrade).
- Unit *counts* are plain numbers (they stay small) — that's fine.

## Balancing knobs

Costs and rates live entirely in `businesses.ts` / `upgrades.ts`. The cost curve is
`baseCost × costGrowth^owned`; passive income is `revenue ÷ cycleTime`; offline is
capped in `offline.ts` (`MAX_OFFLINE_SECONDS`). Real-estate prices, rent, and the
city tiers live in `city.ts` (`REAL_ESTATE`, `CITY_TIERS`). Tune there — no engine
changes.

## Working on it

- `npm run dev` to play locally; `npm test` for the engine; `npm run check` to
  type-check; `npm run format` before committing.
- **Always add/adjust a Vitest test** when you change engine math (`engine/*.test.ts`).
- Commits use **gitmoji** prefixes (`✨` feature, `🐛` fix, `💄` UI, `📝` docs,
  `♻️` refactor). Small, focused commits. License is **AGPL-3.0-only**.

## Roadmap (where new systems go)

1. ✅ **City & real-estate** — `engine/city.ts` (spiral layout + tiers) and
   `ui/CityMap.svelte`; buy property for rent, Hamlet → Metropolis.
2. **Production** — resources, factories, machines, and contracts/jobs you choose.
3. **Finance** — `engine/economy/`: checking/savings, bonds, a simulated stock
   market, FX, and loans/leverage; charts in the UI.
4. **Isometric UI** — a canvas `Renderer` in `render/iso/` sold to the player as
   the ultimate "UI upgrade", with sprites and walking characters.
