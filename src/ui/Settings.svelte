<script lang="ts">
  import {
    view,
    downloadSave,
    importSave,
    resetGame,
    setTheme,
    rerollMap,
    setSeed,
  } from '../store/game.svelte'

  let fileInput: HTMLInputElement
  let seedInput = $state(view.citySeed)
  function applySeed() {
    setSeed(Number(seedInput))
  }

  async function onFile(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    if (!importSave(text)) alert('That does not look like a valid ASCII Tycoon save.')
    input.value = ''
  }

  function confirmReset() {
    if (confirm('Erase your game and start over? This cannot be undone.')) resetGame()
  }
</script>

<div class="settings">
  <h3>Save</h3>
  <div class="settings-row">
    <button onclick={downloadSave}>export save</button>
    <button onclick={() => fileInput.click()}>import save</button>
    <input bind:this={fileInput} type="file" accept=".json,application/json" onchange={onFile} hidden />
    <button class="danger" onclick={confirmReset}>reset game</button>
  </div>

  {#if view.themes.some((t) => t.unlocked && t.id !== 'mono')}
    <h3>Theme</h3>
    <div class="settings-row">
      {#each view.themes as t (t.id)}
        {#if t.unlocked}
          <button class:active={t.active} onclick={() => setTheme(t.id)}>{t.label}</button>
        {/if}
      {/each}
    </div>
  {/if}

  <h3>Map seed</h3>
  <div class="settings-row">
    <input class="seed-input" type="number" bind:value={seedInput} aria-label="map seed" />
    <button onclick={applySeed}>apply</button>
    <button onclick={rerollMap}>random</button>
  </div>
  <p class="hint">
    Current seed: <strong>{view.citySeed}</strong>. The same seed always grows the same map look
    (rivers, districts, building shapes) — paste in a seed to copy a city. (Cosmetic only.)
  </p>

  <p class="hint">ASCII Tycoon saves to this browser. Export a save to back it up or move it.</p>
</div>
