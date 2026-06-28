<script lang="ts">
  import { view, acceptContract, deliverContract, declineContract } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>CONTRACTS</h2>
  <div class="contracts-cols">
    <div class="contracts-col">
      <h3>AVAILABLE</h3>
      {#if view.industry.offers.length === 0}
        <p class="empty">New orders arrive regularly…</p>
      {/if}
      {#each view.industry.offers as c (c.id)}
        <div class="contract">
          <div class="c-main">
            <span class="c-demand">{c.glyph} {c.demandText}</span>
            <span class="c-reward">{c.rewardText}</span>
          </div>
          <div class="c-sub">
            <span class="c-time">{c.timeText}</span>
            <span class="c-btns">
              <button onclick={() => acceptContract(c.id)} disabled={!c.canAccept}>accept</button>
              <button class="mini" title="decline" onclick={() => declineContract(c.id)}>×</button>
            </span>
          </div>
        </div>
      {/each}
    </div>

    <div class="contracts-col">
      <h3>ACTIVE</h3>
      {#if view.industry.active.length === 0}
        <p class="empty">No active jobs. Accept one to start.</p>
      {/if}
      {#each view.industry.active as c (c.id)}
        <div class="contract" class:ready={c.canDeliver}>
          <div class="c-main">
            <span class="c-demand">{c.glyph} {c.demandText}</span>
            <span class="c-reward">{c.rewardText}</span>
          </div>
          <div class="c-sub">
            <span class="c-time">{c.remainingText} left</span>
            <button onclick={() => deliverContract(c.id)} disabled={!c.canDeliver}>deliver</button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
