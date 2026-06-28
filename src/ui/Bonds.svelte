<script lang="ts">
  import { view, buyBond } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>BONDS</h2>
  <ul class="bond-products">
    {#each view.finance.products as p (p.id)}
      <li class="bond-product">
        <div class="bp-main">
          <span class="bp-name">{p.name}</span>
          <span class="bp-yield">{p.yieldText}</span>
        </div>
        <div class="bp-sub">
          <span>{p.principalText} · matures in {p.termText}</span>
          <button onclick={() => buyBond(p.id)} disabled={!p.canBuy}>buy</button>
        </div>
      </li>
    {/each}
  </ul>

  {#if view.finance.bonds.length > 0}
    <h3 class="re-sub">HELD</h3>
    <ul class="bond-held">
      {#each view.finance.bonds as b (b.id)}
        <li class="bond-h">
          <span>{b.name}</span>
          <span class="bh-payout">{b.payoutText}</span>
          <span class="bh-time">{b.remainingText}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="hint">Lock cash for a fixed term to collect principal + a guaranteed return at maturity.</p>
</div>
