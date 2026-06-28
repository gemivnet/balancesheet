<script lang="ts">
  import { view, downloadSave, importSave, resetGame, setTheme } from '../store/game.svelte'

  let fileInput: HTMLInputElement

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

  const hasThemes = $derived(view.themes.some((t) => t.unlocked && t.id !== 'mono'))
</script>

<footer class="savebar">
  <span class="brand">ASCII TYCOON · saves to this browser</span>
  {#if hasThemes}
    <span class="themes">
      {#each view.themes as t (t.id)}
        {#if t.unlocked}
          <button class="theme-chip" class:active={t.active} onclick={() => setTheme(t.id)}>
            {t.label}
          </button>
        {/if}
      {/each}
    </span>
  {/if}
  <span class="spacer"></span>
  <button onclick={downloadSave}>export save</button>
  <button onclick={() => fileInput.click()}>import save</button>
  <input bind:this={fileInput} type="file" accept=".json,application/json" onchange={onFile} hidden />
  <button class="danger" onclick={confirmReset}>reset</button>
</footer>
