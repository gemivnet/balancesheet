<script lang="ts">
  import { view, buyOne, buyMax, hire, setActive, startBusiness } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>BUSINESSES</h2>
  <ul class="businesses">
    {#each view.businesses as b (b.id)}
      <li class="biz" class:active={b.active}>
        <div class="biz-head">
          <span class="glyph">[{b.glyph}]</span>
          <span class="name">{b.name}</span>
          <span class="owned">x{b.ownedText}</span>
        </div>

        {#if b.unlocked}
          <div class="biz-sub">
            <span class="income">{b.incomeText}</span>
            {#if b.managed}<span class="badge">AUTO</span>{/if}
            {#if b.active}
              <span class="badge sel">WORKING</span>
            {:else}
              <button class="mini" onclick={() => setActive(b.id)}>work here</button>
            {/if}
          </div>

          <div class="biz-progress">
            <div class="bar" style="width:{(b.progress * 100).toFixed(0)}%"></div>
          </div>

          <div class="biz-actions">
            <button onclick={() => buyOne(b.id)} disabled={!b.canBuy1}>buy 1 · {b.cost1}</button>
            <button onclick={() => buyMax(b.id)} disabled={!b.canBuyMax}>
              buy {b.maxCount} · {b.costMax}
            </button>
            {#if !b.managed}
              <button class="hire" onclick={() => hire(b.id)} disabled={!b.canHire}>
                hire manager · {b.managerCost}
              </button>
            {/if}
          </div>
        {:else}
          <div class="biz-locked">
            <span class="blurb">{b.blurb}</span>
            <button onclick={() => startBusiness(b.id)} disabled={!b.canStart}>
              start · {b.startCost}
            </button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>
