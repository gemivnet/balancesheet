# ASCII Tycoon

An entrepreneur **clicker / idle game** that starts as bare black-and-white ASCII
and — as you earn — **upgrades its own interface** toward a Habbo-style isometric
city.

Click to do the work yourself, reinvest into more businesses, hire managers to
automate them, then watch the money pile up while you're away. Grounded economics
now; a scrollable city map, factories, and a finance market (stocks, bonds, FX,
loans) are on the roadmap.

> **Status: playable** — clicking → idle income, businesses & a deep upgrade list, a
> scrollable city you build up through real estate, a production chain (factories,
> machines, contracts), plus save + offline earnings and the first UI-upgrade tier.

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

1. Hit **WORK** to earn cash from the business you're personally working.
2. **Buy units** (buy 1 / buy max) to scale a business up.
3. **Hire a manager** to automate it — now it earns while you're idle.
4. Spend in the **UPGRADES** shop: ×2 revenue, faster cycles, stronger clicks…
   plus **UI upgrades** that literally improve the interface.
5. Build your **city**: your shops anchor the centre — buy **property** (the Real
   Estate panel, or click a pulsing `$` lot on the map) to collect rent and grow
   from a Hamlet into a Metropolis.
6. Open the **Industry** tab: build **factories** to turn raw materials into goods,
   add **machines** to boost output, and accept **contracts** to deliver goods for
   cash before the deadline.
7. Close the tab and come back later for **offline earnings**.

Clicking is always useful — it instantly completes a work-cycle on top of any
idle income, so there's never any downtime.

## Architecture

The simulation is **pure TypeScript** (`src/engine/`) with no Svelte or DOM
imports — deterministic and unit-tested. Svelte only reads snapshots and calls
engine actions. A renderer seam (`src/render/`) and theme tiers (`src/theme/`)
exist so the ASCII view can be swapped for an isometric canvas later without a
rewrite. See [CLAUDE.md](./CLAUDE.md) for the full map and how to add content.

```
src/
  engine/   pure sim: businesses, city/real-estate, production (factories/contracts), save, offline
  store/    Svelte bridge: tick loop + reactive view snapshot
  ui/       ASCII components, organised into Work / City / Industry tabs (sticky HUD)
  render/   renderer seam (the isometric city lands here later)
  theme/    UI theme tiers unlocked as upgrades
```

## Roadmap

- **Done** — clicker → idle, businesses & upgrades, a scrollable ASCII city with a
  real-estate agency (Hamlet → Metropolis), and a production chain: factories,
  machines, and contracts you choose.
- **Next** — a finance market (savings, bonds, stocks, FX, loans).
- **Then** — the isometric "Habbo" UI as the ultimate UI upgrade.

## License

[AGPL-3.0-only](./LICENSE).
