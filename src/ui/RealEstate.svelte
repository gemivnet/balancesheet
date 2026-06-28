<script lang="ts">
  import { view, buyRental } from '../store/game.svelte'
</script>

<div class="panel">
  <h2>REAL ESTATE</h2>
  <div class="re-stats">
    <div><span class="re-label">CITY</span><span class="re-val">{view.city.tierName}</span></div>
    <div><span class="re-label">PROPERTIES</span><span class="re-val">{view.city.rentalCount}</span></div>
    <div><span class="re-label">RENT</span><span class="re-val">{view.city.rentText}</span></div>
  </div>
  <button class="buy-prop" onclick={buyRental} disabled={!view.city.canBuyRental}>
    buy property · {view.city.rentalCostText}
  </button>
  <p class="hint">
    Properties pay rent every second — no manager needed. As your city grows into a metropolis,
    rents rise with it.
  </p>
</div>
