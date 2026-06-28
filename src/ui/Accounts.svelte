<script lang="ts">
  import {
    view,
    depositHalf,
    depositMax,
    withdrawMax,
    borrowMax,
    repayMax,
  } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>ACCOUNTS</h2>

  <div class="account">
    <div class="acct-head">
      <span class="acct-name">Savings</span>
      <span class="acct-val">{view.finance.savingsText}</span>
    </div>
    <div class="acct-meta">earns {view.finance.aprText}</div>
    <div class="acct-actions">
      <button onclick={depositHalf} disabled={!view.finance.canDeposit}>deposit ½</button>
      <button onclick={depositMax} disabled={!view.finance.canDeposit}>deposit max</button>
      <button onclick={withdrawMax} disabled={!view.finance.canWithdraw}>withdraw all</button>
    </div>
  </div>

  <div class="account">
    <div class="acct-head">
      <span class="acct-name">Loan / Credit</span>
      <span class="acct-val">{view.finance.debtText}</span>
    </div>
    <div class="acct-meta">
      interest {view.finance.loanAprText} · available {view.finance.creditAvailText}
    </div>
    <div class="acct-actions">
      <button onclick={borrowMax} disabled={!view.finance.canBorrow}>borrow max</button>
      <button onclick={repayMax} disabled={!view.finance.canRepay}>repay max</button>
    </div>
  </div>

  <p class="hint">
    Park spare cash in savings, or borrow against your assets to expand faster — just mind the
    interest.
  </p>
</div>
