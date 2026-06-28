import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  test: {
    // Engine is pure TS (no DOM), so the fast Node environment is enough.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
