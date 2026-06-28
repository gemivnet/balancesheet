# ASCII Tycoon

An entrepreneur **clicker / idle game** that starts as bare black-and-white ASCII
and — as you earn — **upgrades its own interface** toward a Habbo-style isometric
city.

Click to do the work yourself, reinvest into more businesses, hire managers to
automate them, then watch the money pile up while you're away. Grounded economics
now; a scrollable city map, factories, and a finance market (stocks, bonds, FX,
loans) are on the roadmap.

> **Status: playable** — a **city-first** game: the isometric/ASCII city fills the
> screen and you click its buildings to run everything — shops, jobs, real estate,
> factories, finance — with deep upgrades, varied job contracts, save + offline
> earnings, and unlockable UI themes.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

| script | what it does |
| --- | --- |
| `npm run dev` | dev server with hot reload |
| `npm run build` | static production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm test` | engine unit tests (Vitest) |
| `npm run check` | type-check (`svelte-check` + `tsc`) |
| `npm run format` | format with Prettier |

It's a fully static site — no backend. Your game saves to the browser
(`localStorage`); use **export save / import save** in the footer to back it up
or move it between machines.

## How to play

The **city is the game** — click its buildings to do everything:

- **Your shops** → hit **WORK** to earn, buy units, and hire managers to automate them.
- **HQ** → buy upgrades: stronger clicks, global income, and **UI upgrades** (themes,
  city gridlines, and the colourful **isometric** city).
- **Town Hall** → take **jobs**. Types vary: quick **rush** orders, big **bulk** orders,
  two-resource **supply** runs, and steady **delivery** orders.
- **Realtor** → buy **property** for rent and raise **housing density** (Hamlet → Metropolis).
- **Factory** → build factories + machines and **sell** resources on the spot market.
- **Bank** (unlocks at $2,000 earned) → savings, loans, bonds, and the live stock/FX market.

Clicking **WORK** is always useful. Hire managers and build to earn while idle, then come
back later for **offline earnings**. The ⚙ menu (top-right) holds save/export and themes.

## Architecture

The simulation is **pure TypeScript** (`src/engine/`) with no Svelte or DOM
imports — deterministic and unit-tested. Svelte only reads snapshots and calls
engine actions. A renderer seam (`src/render/`) and theme tiers (`src/theme/`)
exist so the ASCII view can be swapped for an isometric canvas later without a
rewrite. See [CLAUDE.md](./CLAUDE.md) for the full map and how to add content.

```
src/
  engine/   pure sim: businesses, city/real-estate, production, finance (market/bonds/loans), save, offline
  store/    Svelte bridge: tick loop + reactive view snapshot
  ui/       full-screen city backdrop + draggable, persistent floating windows opened by clicking buildings
  render/   Renderer interface seam (the iso renderer is ui/IsoCity.svelte)
  theme/    UI theme tiers unlocked as upgrades
```

## Roadmap

All the original pillars are in: businesses & upgrades, a production chain, real
estate + a city that grows from **ASCII to a 3D isometric view**, and a finance
market.

Possible next steps: a prestige/reset layer, achievements, animated isometric
characters, and balance passes.

## License

[AGPL-3.0-only](./LICENSE).
