<script lang="ts">
  import { downloadSave, importSave, resetGame } from '../store/game.svelte'

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
</script>

<footer class="savebar">
  <span class="brand">ASCII TYCOON · saves to this browser</span>
  <span class="spacer"></span>
  <button onclick={downloadSave}>export save</button>
  <button onclick={() => fileInput.click()}>import save</button>
  <input bind:this={fileInput} type="file" accept=".json,application/json" onchange={onFile} hidden />
  <button class="danger" onclick={confirmReset}>reset</button>
</footer>
